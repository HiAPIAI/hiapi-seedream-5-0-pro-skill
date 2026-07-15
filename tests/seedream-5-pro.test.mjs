import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildImagePayload,
  buildHttpErrorMessage,
  checkSkillUpdate,
  compareVersions,
  createImageTask,
  extractTaskFailureSummary,
  extractTaskId,
  extractImageOutputs,
  normalizeModel,
  normalizeAspectRatio,
  normalizeQuality,
  resolveConfig,
  SKILL_VERSION,
  waitForImage,
  warnOrRequireSkillUpdate,
} from "../scripts/lib/seedream-5-pro.mjs";
import {
  activateInstall,
  installTargets,
  rollbackInstall,
  SKILL_FOLDER,
  stageInstall,
} from "../scripts/install.mjs";

function createFixtureRepo(root) {
  const repo = join(root, "repo");
  mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  writeFileSync(join(repo, "SKILL.md"), "---\nname: fixture\ndescription: fixture skill\n---\n");
  execFileSync("git", ["add", "SKILL.md"], { cwd: repo, stdio: "ignore" });
  execFileSync(
    "git",
    ["-c", "user.name=Installer Test", "-c", "user.email=installer@example.com", "commit", "-m", "fixture"],
    { cwd: repo, stdio: "ignore" },
  );
  return repo;
}

function quietExecFile(command, args, options) {
  return execFileSync(command, args, { ...options, stdio: "ignore" });
}

test("builds the HiAPI task payload for text-to-image", () => {
  const payload = buildImagePayload({
    prompt: "Create a product poster",
    aspectRatio: "16:9",
    quality: "high",
  });

  assert.deepEqual(payload, {
    model: "seedream-5.0-pro/text-to-image",
    input: {
      prompt: "Create a product poster",
      aspect_ratio: "16:9",
      quality: "high",
      output_format: "png",
    },
  });
});

test("builds image-to-image payloads with image_urls and the 1:1 default", () => {
  const payload = buildImagePayload({
    model: "i2i",
    prompt: "Turn this rainy street into a sunny morning, keep the sign text unchanged",
    inputUrls: ["https://example.com/a.jpg", "https://example.com/b.png"],
    outputFormat: "jpeg",
  });

  assert.deepEqual(payload, {
    model: "seedream-5.0-pro/image-to-image",
    input: {
      prompt: "Turn this rainy street into a sunny morning, keep the sign text unchanged",
      image_urls: ["https://example.com/a.jpg", "https://example.com/b.png"],
      aspect_ratio: "1:1",
      quality: "basic",
      output_format: "jpeg",
    },
  });
});

test("validates models, aliases, and reference image rules", () => {
  assert.equal(normalizeModel("t2i"), "seedream-5.0-pro/text-to-image");
  assert.equal(normalizeModel("i2i"), "seedream-5.0-pro/image-to-image");
  assert.equal(normalizeModel("seedream-5.0-pro/image-to-image"), "seedream-5.0-pro/image-to-image");
  assert.throws(() => normalizeModel("seedream-5.0-pro/video"), /Unsupported model/);

  // i2i requires 1-10 refs
  assert.throws(
    () => buildImagePayload({ model: "i2i", prompt: "edit" }),
    /requires 1-10 reference image URLs/,
  );
  assert.throws(
    () => buildImagePayload({
      model: "i2i",
      prompt: "edit",
      inputUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`),
    }),
    /requires 1-10 reference image URLs/,
  );
  // t2i rejects refs
  assert.throws(
    () => buildImagePayload({ prompt: "draw", inputUrls: ["https://example.com/a.jpg"] }),
    /does not accept reference images/,
  );
  // SVG rejected
  assert.throws(
    () => buildImagePayload({ model: "i2i", prompt: "edit", inputUrls: ["https://example.com/logo.svg"] }),
    /SVG reference images are not supported/,
  );
  // prompt length boundaries
  assert.throws(
    () => buildImagePayload({ prompt: "abc" }),
    /Prompt is too short/,
  );
  assert.doesNotThrow(() => buildImagePayload({ prompt: "abcd" }));
  assert.doesNotThrow(() => buildImagePayload({ prompt: "x".repeat(5000) }));
  assert.throws(
    () => buildImagePayload({ prompt: "x".repeat(5001) }),
    /Prompt is too long/,
  );
  assert.throws(
    () => buildImagePayload({ model: "i2i", prompt: "edit", inputUrls: ["not-a-url"] }),
    /must use HTTP or HTTPS/,
  );
});

test("validates and sends basic/high quality tiers", () => {
  assert.equal(normalizeQuality(), "basic");
  assert.equal(normalizeQuality("HIGH"), "high");
  assert.equal(buildImagePayload({ prompt: "draw" }).input.quality, "basic");
  assert.equal(buildImagePayload({ prompt: "draw", quality: "high" }).input.quality, "high");
  assert.throws(() => normalizeQuality("2K"), /Unsupported quality/);
});

test("passes storage tier through to the task payload", () => {
  const payload = buildImagePayload({ prompt: "draw", storage: "persistent" });
  assert.equal(payload.storage, "persistent");
  const noStorage = buildImagePayload({ prompt: "draw" });
  assert.equal("storage" in noStorage, false);
  assert.throws(() => buildImagePayload({ prompt: "draw", storage: "forever" }), /Unsupported storage tier/);
});

test("accepts the documented aspect ratio sets per model", () => {
  for (const ratio of ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]) {
    assert.equal(normalizeAspectRatio(ratio, "t2i"), ratio);
    assert.equal(normalizeAspectRatio(ratio, "i2i"), ratio);
  }
  assert.equal(normalizeAspectRatio(undefined, "t2i"), "1:1");
  assert.equal(normalizeAspectRatio(undefined, "i2i"), "1:1");
  assert.throws(() => normalizeAspectRatio("match_input_image", "t2i"), /Unsupported aspect ratio/);
  assert.throws(() => normalizeAspectRatio("match_input_image", "i2i"), /Unsupported aspect ratio/);
  assert.throws(() => normalizeAspectRatio("auto", "t2i"), /Unsupported aspect ratio/);
});

test("builds and validates final callbacks", () => {
  const payload = buildImagePayload({
    prompt: "draw",
    callbackUrl: "https://example.com/hiapi/callback",
  });
  assert.deepEqual(payload.callback, {
    url: "https://example.com/hiapi/callback",
    when: "final",
  });

  assert.equal("callback" in buildImagePayload({ prompt: "draw" }), false);
  assert.throws(
    () => buildImagePayload({ prompt: "draw", callback: {} }),
    /callback.url is required/,
  );
  assert.throws(
    () => buildImagePayload({ prompt: "draw", callbackUrl: "http://example.com/callback" }),
    /must use HTTPS/,
  );
  assert.throws(
    () => buildImagePayload({ prompt: "draw", callbackUrl: "https://example.com/callback", callbackWhen: "success" }),
    /only supported value is "final"/,
  );
});

test("extracts task ids and image outputs from task responses", () => {
  assert.equal(extractTaskId({ data: { taskId: "tk-hiapi-123" } }), "tk-hiapi-123");
  assert.equal(extractTaskId({ taskId: "task_callback_123" }), "task_callback_123");
  assert.equal(extractTaskId({ task_id: "task_456" }), "task_456");

  assert.deepEqual(
    extractImageOutputs({
      data: {
        output: [
          { type: "image", url: "https://cdn.example.com/out.png" },
          { type: "image", data: "data:image/png;base64,AAA" },
        ],
      },
    }),
    [
      { kind: "url", value: "https://cdn.example.com/out.png" },
      { kind: "data-uri", mimeType: "image/png", value: "data:image/png;base64,AAA" },
    ],
  );
});

test("reports callback-shaped terminal failures and malformed successes", async () => {
  const config = { apiKey: "test-key", baseUrl: "https://api.hiapi.ai" };
  await assert.rejects(
    waitForImage("task_no_output", {
      config,
      pollIntervalMs: 0,
      timeoutMs: 100,
      fetchImpl: async () => new Response(JSON.stringify({
        taskId: "task_no_output",
        status: "success",
        output: [],
      }), { status: 200 }),
    }),
    /Task ID: task_no_output.*Response:.*"status":"success"/,
  );

  await assert.rejects(
    waitForImage("task_failed", {
      config,
      pollIntervalMs: 0,
      timeoutMs: 100,
      fetchImpl: async () => new Response(JSON.stringify({
        taskId: "task_failed",
        status: "fail",
        error: { code: "INVALID_REQUEST", message: "bad quality" },
      }), { status: 200 }),
    }),
    /INVALID_REQUEST: bad quality/,
  );
});

test("extracts task failure reason from failed task detail instead of outer success message", () => {
  assert.equal(
    extractTaskFailureSummary({
      code: 200,
      message: "success",
      data: {
        status: "fail",
        taskId: "tk-hiapi-failed",
        error: {
          code: "TASK_FAILED",
          message: "task failed",
        },
      },
    }),
    "TASK_FAILED: task failed",
  );
});

test("creates image tasks through the unified tasks endpoint", async () => {
  let requestedUrl = "";
  let requestedInit = {};
  const fetchImpl = async (url, init) => {
    requestedUrl = url;
    requestedInit = init;
    return new Response(JSON.stringify({ data: { taskId: "tk-hiapi-123" } }), {
      status: 200,
    });
  };

  const payload = buildImagePayload({ prompt: "Create a poster", aspectRatio: "1:1" });
  const response = await createImageTask(payload, {
    config: { apiKey: "test-key", baseUrl: "https://api.hiapi.ai" },
    fetchImpl,
  });

  assert.equal(requestedUrl, "https://api.hiapi.ai/v1/tasks");
  assert.equal(requestedInit.method, "POST");
  assert.equal(requestedInit.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(requestedInit.body), payload);
  assert.equal(extractTaskId(response), "tk-hiapi-123");
});

test("keeps markdown image extraction for legacy responses", () => {
  const response = {
    choices: [
      {
        message: {
          content:
            "Result: ![image](data:image/png;base64,AAA) and ![alt](https://cdn.example.com/out.png)",
        },
      },
    ],
  };

  assert.deepEqual(extractImageOutputs(response), [
    { kind: "data-uri", mimeType: "image/png", value: "data:image/png;base64,AAA" },
    { kind: "url", value: "https://cdn.example.com/out.png" },
  ]);
});

test("resolveConfig requires HIAPI_API_KEY and normalizes base URL", () => {
  assert.throws(
    () => resolveConfig({}),
    /Get one at https:\/\/www\.hiapi\.ai\/en\/register/,
  );

  assert.deepEqual(
    resolveConfig({
      HIAPI_API_KEY: "test-key",
      HIAPI_BASE_URL: "https://api.hiapi.ai/",
    }),
    {
      apiKey: "test-key",
      baseUrl: "https://api.hiapi.ai",
    },
  );
});

test("buildHttpErrorMessage guides users to configure a HiAPI API key", () => {
  const message = buildHttpErrorMessage(401, {
    error: { message: "Invalid API key" },
  });

  assert.match(message, /HTTP 401/);
  assert.match(message, /API key/);
  assert.match(message, /https:\/\/www\.hiapi\.ai\/en\/register/);
});

test("buildHttpErrorMessage guides users to add credits when balance is insufficient", () => {
  const message = buildHttpErrorMessage(402, {
    error: { message: "insufficient balance" },
  });

  assert.match(message, /HTTP 402/);
  assert.match(message, /balance|credits/i);
  assert.match(message, /https:\/\/www\.hiapi\.ai\/en\/dashboard/);
});

test("buildHttpErrorMessage handles rate limits and content policy errors", () => {
  assert.match(
    buildHttpErrorMessage(429, { error: { message: "Too many requests" } }),
    /wait and retry/i,
  );

  assert.match(
    buildHttpErrorMessage(400, {
      error: { message: "content_policy_violation" },
    }),
    /revise the prompt/i,
  );
});

test("compares semver-like skill versions", () => {
  assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
  assert.equal(compareVersions("0.2.0", "0.1.9"), 1);
  assert.equal(compareVersions("0.1.0", "0.2.0"), -1);
});

test("keeps package and runtime skill versions aligned", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(SKILL_VERSION, "0.2.0");
  assert.equal(packageJson.version, SKILL_VERSION);
});

test("checks skill update policy without affecting current versions", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    skills: [{
      id: "hiapi-seedream-5-0-pro",
      version: "0.2.0",
      updatePolicy: {
        latestVersion: "0.2.0",
        minimumVersion: "0.2.0",
        updateCommand: "npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y",
        notice: "New version available.",
        requiredNotice: "Update required.",
      },
    }],
  }), { status: 200 });

  assert.equal((await checkSkillUpdate({ fetchImpl })).status, "current");
});

test("reports soft and required skill updates from the manifest", async () => {
  const manifest = {
    skills: [{
      id: "hiapi-seedream-5-0-pro",
      version: "0.3.0",
      updatePolicy: {
        latestVersion: "0.3.0",
        minimumVersion: "0.2.0",
        updateCommand: "npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y",
        notice: "New version available.",
        requiredNotice: "Update required.",
      },
    }],
  };
  const fetchImpl = async () => new Response(JSON.stringify(manifest), { status: 200 });

  const required = await checkSkillUpdate({ currentVersion: "0.1.0", fetchImpl });
  assert.equal(required.status, "required");
  assert.match(required.message, /Update required/);
  assert.match(required.message, /Update now: npx -y github:HiAPIAI\/hiapi-seedream-5-0-pro-skill -y/);

  const available = await checkSkillUpdate({ currentVersion: "0.2.0", fetchImpl });
  assert.equal(available.status, "available");
  assert.match(available.message, /New version available/);

  const notices = [];
  const originalConsoleError = console.error;
  console.error = (...args) => notices.push(args.join(" "));
  try {
    const warned = await warnOrRequireSkillUpdate({ currentVersion: "0.2.0", fetchImpl });
    assert.equal(warned.status, "available");
  } finally {
    console.error = originalConsoleError;
  }
  assert.match(notices.join("\n"), /New version available/);

  await assert.rejects(
    warnOrRequireSkillUpdate({ currentVersion: "0.1.0", fetchImpl }),
    /Update now: npx -y github:HiAPIAI\/hiapi-seedream-5-0-pro-skill -y/,
  );
});

test("CLI blocks a required update before submitting an API task", () => {
  const manifest = encodeURIComponent(JSON.stringify({
    skills: [{
      id: "hiapi-seedream-5-0-pro",
      version: "0.3.0",
      updatePolicy: {
        latestVersion: "0.3.0",
        minimumVersion: "0.3.0",
        updateCommand: "npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y",
        requiredNotice: "Update required for this test.",
      },
    }],
  }));
  const cli = fileURLToPath(new URL("../scripts/hiapi-seedream-5-pro.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [cli, "--prompt", "draw", "--no-wait"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HIAPI_API_KEY: "test-key",
      HIAPI_SKILLS_MANIFEST_URL: `data:application/json,${manifest}`,
    },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Update required for this test/);
  assert.match(result.stderr, /Update now:/);
  assert.doesNotMatch(result.stderr, /HiAPI request failed/);
});

test("installer stages before replacing a legacy install and can roll back", (t) => {
  const root = mkdtempSync(join(tmpdir(), "seedream-installer-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = createFixtureRepo(root);
  const skillsDir = join(root, "skills");
  const homeDir = join(root, "home");
  const legacyDir = join(skillsDir, "hiapi-seedream-5-pro");
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, "SKILL.md"), "legacy");
  writeFileSync(join(legacyDir, ".env"), "HIAPI_API_KEY=preserve-me\n");

  const state = stageInstall(
    { label: "Codex", dir: skillsDir },
    { repoUrl: repo, execFileImpl: quietExecFile, suffix: "test" },
  );
  assert.equal(readFileSync(join(legacyDir, "SKILL.md"), "utf8"), "legacy");

  activateInstall(state, { homeDir, now: () => 123 });
  const canonicalDir = join(skillsDir, SKILL_FOLDER);
  assert.equal(existsSync(legacyDir), false);
  assert.match(readFileSync(join(canonicalDir, "SKILL.md"), "utf8"), /name: fixture/);
  assert.equal(readFileSync(join(canonicalDir, ".env"), "utf8"), "HIAPI_API_KEY=preserve-me\n");
  assert.deepEqual(readdirSync(join(homeDir, ".cache", "hiapi-skill-backup")), [
    "hiapi-seedream-5-pro.codex.bak.123",
  ]);

  rollbackInstall(state);
  assert.equal(existsSync(canonicalDir), false);
  assert.equal(readFileSync(join(legacyDir, "SKILL.md"), "utf8"), "legacy");
});

test("installer leaves every active target untouched when staging fails", (t) => {
  const root = mkdtempSync(join(tmpdir(), "seedream-installer-multi-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = createFixtureRepo(root);
  const targets = ["codex", "claude"].map((label) => {
    const dir = join(root, label, "skills");
    const legacyDir = join(dir, "hiapi-seedream-5-pro");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "SKILL.md"), `${label}-legacy`);
    return { label, dir, legacyDir };
  });

  let cloneCount = 0;
  const failSecondClone = (command, args, options) => {
    cloneCount += 1;
    if (cloneCount === 2) throw new Error("simulated clone failure");
    return quietExecFile(command, args, options);
  };

  assert.throws(
    () => installTargets(targets, { repoUrl: repo, execFileImpl: failSecondClone, homeDir: join(root, "home") }),
    /simulated clone failure/,
  );
  for (const target of targets) {
    assert.equal(readFileSync(join(target.legacyDir, "SKILL.md"), "utf8"), `${target.label}-legacy`);
    assert.equal(existsSync(join(target.dir, SKILL_FOLDER)), false);
    assert.equal(readdirSync(target.dir).some((name) => name.includes(".staging-")), false);
  }
});

test("installer rolls back earlier targets when a later activation fails", (t) => {
  const root = mkdtempSync(join(tmpdir(), "seedream-installer-activate-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = createFixtureRepo(root);
  const homeDir = join(root, "home");
  const targets = ["codex", "claude"].map((name) => {
    const dir = join(root, name, "skills");
    const legacyDir = join(dir, "hiapi-seedream-5-pro");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "SKILL.md"), `${name}-legacy`);
    return { label: "duplicate", dir, legacyDir, name };
  });

  assert.throws(() => installTargets(targets, {
    repoUrl: repo,
    execFileImpl: quietExecFile,
    homeDir,
    now: () => 123,
  }));

  for (const target of targets) {
    assert.equal(readFileSync(join(target.legacyDir, "SKILL.md"), "utf8"), `${target.name}-legacy`);
    assert.equal(existsSync(join(target.dir, SKILL_FOLDER)), false);
    assert.equal(readdirSync(target.dir).some((name) => name.includes(".staging-")), false);
  }
});
