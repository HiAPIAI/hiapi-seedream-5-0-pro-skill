import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MODEL = "seedream-5.0-pro/text-to-image";
export const IMAGE_TO_IMAGE_MODEL = "seedream-5.0-pro/image-to-image";
export const SKILL_ID = "hiapi-seedream-5-0-pro";
export const SKILL_VERSION = "0.2.0";
export const DEFAULT_BASE_URL = "https://api.hiapi.ai";
export const DEFAULT_SKILLS_MANIFEST_URL = "https://raw.githubusercontent.com/HiAPIAI/hiapi-skills/main/skills.json";
export const DEFAULT_ASPECT_RATIO = "1:1";
export const DEFAULT_QUALITY = "basic";
export const DEFAULT_OUTPUT_FORMAT = "png";
export const DEFAULT_OUTPUT_DIR = "outputs";
export const POLL_INTERVAL_MS = 3000;
export const POLL_TIMEOUT_MS = 300000;
export const HIAPI_HOME_URL = "https://www.hiapi.ai";
export const HIAPI_API_KEYS_URL = "https://www.hiapi.ai/en/register";
export const HIAPI_DASHBOARD_URL = "https://www.hiapi.ai/en/dashboard";
export const HIAPI_PRICING_URL = "https://www.hiapi.ai/en/pricing";
const BASE_ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"];
export const SUPPORTED_ASPECT_RATIOS = new Set(BASE_ASPECT_RATIOS);
export const SUPPORTED_QUALITIES = new Set(["basic", "high"]);
export const SUPPORTED_OUTPUT_FORMATS = new Set(["png", "jpeg"]);
export const SUPPORTED_STORAGE_TIERS = new Set(["temp", "persistent"]);
export const SUPPORTED_MODELS = new Set([MODEL, IMAGE_TO_IMAGE_MODEL]);
export const IMAGE_TO_IMAGE_MODELS = new Set([IMAGE_TO_IMAGE_MODEL]);
const MODEL_ALIASES = new Map([
  ["t2i", MODEL],
  ["text-to-image", MODEL],
  ["seedream-5.0-pro", MODEL],
  ["i2i", IMAGE_TO_IMAGE_MODEL],
  ["image-to-image", IMAGE_TO_IMAGE_MODEL],
  ["edit", IMAGE_TO_IMAGE_MODEL],
]);
export const MAX_INPUT_URLS = 10;
export const MIN_PROMPT_LENGTH = 4;
export const MAX_PROMPT_LENGTH = 5000;

export function normalizeModel(value = MODEL) {
  const raw = String(value || MODEL).trim();
  const model = MODEL_ALIASES.get(raw.toLowerCase()) || raw;
  if (!SUPPORTED_MODELS.has(model)) {
    throw new Error(`Unsupported model "${raw}". Supported values: ${Array.from(SUPPORTED_MODELS).join(", ")} (aliases: t2i, i2i)`);
  }
  return model;
}

export function normalizeAspectRatio(value, model = MODEL) {
  const normalizedModel = normalizeModel(model);
  const normalized = String(value || DEFAULT_ASPECT_RATIO).trim();
  if (!SUPPORTED_ASPECT_RATIOS.has(normalized)) {
    throw new Error(
      `Unsupported aspect ratio "${normalized}" for ${normalizedModel}. Supported values: ${Array.from(SUPPORTED_ASPECT_RATIOS).join(", ")}`,
    );
  }
  return normalized;
}

export function normalizeQuality(value = DEFAULT_QUALITY) {
  const quality = String(value || DEFAULT_QUALITY).trim().toLowerCase();
  if (!SUPPORTED_QUALITIES.has(quality)) {
    throw new Error(`Unsupported quality "${quality}". Supported values: basic (1K), high (2K).`);
  }
  return quality;
}

export function normalizeOutputFormat(value = DEFAULT_OUTPUT_FORMAT) {
  const format = String(value || DEFAULT_OUTPUT_FORMAT).trim().toLowerCase();
  if (!SUPPORTED_OUTPUT_FORMATS.has(format)) {
    throw new Error(`Unsupported output format "${format}". Supported values: png, jpeg.`);
  }
  return format;
}

export function normalizeStorage(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const storage = String(value).trim().toLowerCase();
  if (!SUPPORTED_STORAGE_TIERS.has(storage)) {
    throw new Error(`Unsupported storage tier "${storage}". Supported values: temp (default, ~7 days), persistent (long-term, billed by size).`);
  }
  return storage;
}

export function normalizeInputUrls(value) {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : [value];
  const urls = raw
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const url of urls) {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`Reference image URLs must use HTTP or HTTPS: ${url}`);
    }
    if (/\.svg(\?|#|$)/i.test(url)) {
      throw new Error(`SVG reference images are not supported: ${url}`);
    }
  }
  return urls;
}

export function normalizeCallback(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Callback must be an object with url and optional when fields.");
  }

  const url = String(value.url || "").trim();
  if (!url) {
    throw new Error("callback.url is required when callback is provided.");
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("callback.url must be a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("callback.url must use HTTPS.");
  }

  const when = String(value.when || "final").trim().toLowerCase();
  if (when !== "final") {
    throw new Error('Unsupported callback.when. The only supported value is "final".');
  }

  return { url: parsed.toString(), when };
}

export function buildImagePayload({
  model = MODEL,
  prompt,
  aspectRatio,
  quality = DEFAULT_QUALITY,
  outputFormat = DEFAULT_OUTPUT_FORMAT,
  inputUrls,
  storage,
  callback,
  callbackUrl,
  callbackWhen,
} = {}) {
  const normalizedModel = normalizeModel(model);
  const normalizedPrompt = String(prompt || "").trim();
  if (normalizedPrompt.length < MIN_PROMPT_LENGTH) {
    throw new Error(`Prompt is too short (${normalizedPrompt.length} chars). Minimum is ${MIN_PROMPT_LENGTH} characters.`);
  }
  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt is too long (${normalizedPrompt.length} chars). Maximum is ${MAX_PROMPT_LENGTH} characters.`);
  }

  const isI2i = IMAGE_TO_IMAGE_MODELS.has(normalizedModel);
  const normalizedInputUrls = normalizeInputUrls(inputUrls);
  if (isI2i && (normalizedInputUrls.length < 1 || normalizedInputUrls.length > MAX_INPUT_URLS)) {
    throw new Error(`${normalizedModel} requires 1-${MAX_INPUT_URLS} reference image URLs via --input-url.`);
  }
  if (!isI2i && normalizedInputUrls.length > 0) {
    throw new Error(`${normalizedModel} does not accept reference images. Use --model i2i for image editing.`);
  }

  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio, normalizedModel);
  const normalizedQuality = normalizeQuality(quality);
  const normalizedOutputFormat = normalizeOutputFormat(outputFormat);

  const input = {
    prompt: normalizedPrompt,
    ...(isI2i ? { image_urls: normalizedInputUrls } : {}),
    aspect_ratio: normalizedAspectRatio,
    quality: normalizedQuality,
    output_format: normalizedOutputFormat,
  };

  const normalizedStorage = normalizeStorage(storage);
  if (callback !== undefined && (callbackUrl !== undefined || callbackWhen !== undefined)) {
    throw new Error("Pass callback or callbackUrl/callbackWhen, not both.");
  }
  const callbackInput = callback !== undefined
    ? callback
    : callbackUrl !== undefined || callbackWhen !== undefined
      ? { url: callbackUrl, when: callbackWhen }
      : undefined;
  const normalizedCallback = normalizeCallback(callbackInput);
  return {
    model: normalizedModel,
    input,
    ...(normalizedStorage ? { storage: normalizedStorage } : {}),
    ...(normalizedCallback ? { callback: normalizedCallback } : {}),
  };
}

export const buildChatPayload = buildImagePayload;

export function resolveConfig(env = process.env) {
  const apiKey = String(env.HIAPI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      `HIAPI_API_KEY is required. Get one at ${HIAPI_API_KEYS_URL}, then run: export HIAPI_API_KEY="your_hiapi_api_key_here"`,
    );
  }

  const baseUrl = String(env.HIAPI_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");

  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("HIAPI_BASE_URL must start with http:// or https://.");
  }

  return { apiKey, baseUrl };
}

export function extractImageOutputs(response) {
  const taskOutput = response?.data?.output || response?.output;
  if (Array.isArray(taskOutput)) {
    return taskOutput.flatMap((entry) => imageOutputFromEntry(entry)).filter(Boolean);
  }

  const directTaskOutput = imageOutputFromEntry(taskOutput || response?.data);
  if (directTaskOutput) return [directTaskOutput];

  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return [];
  }

  const outputs = [];
  const markdownImagePattern = /!\[[^\]]*]\(([^)\s]+)\)/g;

  for (const match of content.matchAll(markdownImagePattern)) {
    const target = match[1];
    if (target.startsWith("data:image/")) {
      const mimeMatch = target.match(/^data:([^;]+);base64,/);
      outputs.push({
        kind: "data-uri",
        mimeType: mimeMatch?.[1] || "image/png",
        value: target,
      });
    } else if (/^https?:\/\//.test(target)) {
      outputs.push({ kind: "url", value: target });
    }
  }

  return outputs;
}

export function extractTaskId(response) {
  return response?.data?.taskId || response?.data?.id || response?.data?.task_id || response?.taskId || response?.id || response?.task_id || "";
}

export function getTaskStatus(response) {
  const status = response?.status || response?.data?.status || "";
  return String(status).toLowerCase();
}

export function extractTaskFailureSummary(response) {
  const candidates = [
    response?.data?.error,
    response?.data?.fail_reason,
    response?.data?.failReason,
    response?.data?.error_message,
    response?.data?.errorMessage,
    response?.data?.task_status_msg,
    response?.data?.taskStatusMsg,
    response?.data?.output?.error,
    response?.data?.output?.fail_reason,
    response?.data?.output?.error_message,
    response?.data?.output?.task_status_msg,
    response?.error,
    response?.fail_reason,
    response?.error_message,
    response?.task_status_msg,
    response?.message,
  ];

  for (const candidate of candidates) {
    const summary = summarizeErrorBody(candidate);
    if (isUsefulFailureSummary(summary)) return summary;
  }

  const taskId = extractTaskId(response);
  return taskId
    ? `task failed without a public failure reason. Task ID: ${taskId}`
    : "task failed without a public failure reason.";
}

export async function createImageTask(payload, { config = resolveConfig(), fetchImpl = fetch } = {}) {
  return requestJson(`${config.baseUrl}/v1/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, fetchImpl);
}

export async function getImageTask(taskId, { config = resolveConfig(), fetchImpl = fetch } = {}) {
  return requestJson(`${config.baseUrl}/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  }, fetchImpl);
}

export async function waitForImage(taskId, { config = resolveConfig(), fetchImpl = fetch, pollIntervalMs = POLL_INTERVAL_MS, timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + Number(timeoutMs);

  while (Date.now() < deadline) {
    await sleep(Number(pollIntervalMs));
    const response = await getImageTask(taskId, { config, fetchImpl });
    const status = getTaskStatus(response);

    if (status === "success" || status === "succeeded" || status === "completed") {
      const outputs = extractImageOutputs(response);
      if (outputs.length === 0) {
        const responseTaskId = extractTaskId(response) || taskId;
        throw new Error(
          `Image task succeeded but no image output was returned. Task ID: ${responseTaskId}. Response: ${summarizeTaskResponse(response)}`,
        );
      }
      return { response, outputs };
    }

    if (status === "fail" || status === "failed") {
      throw new Error(`Image generation failed: ${extractTaskFailureSummary(response)}`);
    }
  }

  throw new Error(`Image generation timed out after ${Math.round(Number(timeoutMs) / 60000)} minutes. The task may still be running — check it later with taskId ${taskId} via GET /v1/tasks/${taskId}.`);
}

export async function generateImage(options, config = resolveConfig()) {
  const payload = buildImagePayload(options);
  const created = await createImageTask(payload, { config });
  const taskId = extractTaskId(created);
  if (!taskId) {
    throw new Error(`No image task id returned: ${JSON.stringify(created)}`);
  }

  if (options.wait === false) {
    return {
      model: payload.model,
      taskId,
      status: "created",
      aspectRatio: payload.input.aspect_ratio,
      quality: payload.input.quality,
      outputs: [],
    };
  }

  const { response, outputs } = await waitForImage(taskId, {
    config,
    pollIntervalMs: options.pollIntervalMs,
    timeoutMs: options.timeoutMs,
  });
  const savedOutputs = options.save === false
    ? outputs.map((output) => output.kind === "url"
      ? { kind: "url", url: output.value }
      : { kind: "data-uri", value: output.value, mimeType: output.mimeType })
    : await saveImageOutputs(outputs, {
      outputDir: options.outputDir || DEFAULT_OUTPUT_DIR,
    });

  return {
    model: payload.model,
    taskId,
    aspectRatio: payload.input.aspect_ratio,
    quality: payload.input.quality,
    outputs: savedOutputs,
    rawStatus: response,
  };
}

export async function callHiApi({ config, payload, fetchImpl = fetch }) {
  return createImageTask(payload, { config, fetchImpl });
}

export async function requestJson(url, init, fetchImpl = fetch) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(response.status, json));
  }

  return json;
}

export async function checkSkillUpdate({
  currentVersion = SKILL_VERSION,
  skillId = SKILL_ID,
  manifestUrl = process.env.HIAPI_SKILLS_MANIFEST_URL || DEFAULT_SKILLS_MANIFEST_URL,
  fetchImpl = fetch,
  timeoutMs = 1200,
  env = process.env,
} = {}) {
  if (env.HIAPI_SKIP_UPDATE_CHECK === "1" || env.HIAPI_SKIP_UPDATE_CHECK === "true") {
    return { status: "skipped" };
  }

  let response;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    response = await fetchImpl(manifestUrl, {
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });
  } catch {
    return { status: "skipped" };
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response?.ok) return { status: "skipped" };

  let manifest;
  try {
    manifest = await response.json();
  } catch {
    return { status: "skipped" };
  }

  const skill = Array.isArray(manifest.skills)
    ? manifest.skills.find((entry) => entry?.id === skillId)
    : null;
  const policy = skill?.updatePolicy;
  if (!policy) return { status: "current" };

  const minimumVersion = policy.minimumVersion || skill.version || currentVersion;
  const latestVersion = policy.latestVersion || skill.version || minimumVersion;
  const updateCommand = policy.updateCommand || `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y`;

  if (compareVersions(currentVersion, minimumVersion) < 0) {
    return {
      status: "required",
      message: [
        policy.requiredNotice || "This HiAPI skill version is no longer compatible with the current HiAPI API.",
        `Installed version: ${currentVersion}; required version: ${minimumVersion}.`,
        `Update now: ${updateCommand}`,
      ].join("\n"),
      latestVersion,
      minimumVersion,
      updateCommand,
    };
  }

  if (compareVersions(currentVersion, latestVersion) < 0) {
    return {
      status: "available",
      message: [
        policy.notice || "A newer HiAPI skill is available.",
        `Installed version: ${currentVersion}; latest version: ${latestVersion}.`,
        `Update: ${updateCommand}`,
      ].join("\n"),
      latestVersion,
      minimumVersion,
      updateCommand,
    };
  }

  return { status: "current", latestVersion, minimumVersion, updateCommand };
}

export async function warnOrRequireSkillUpdate(options = {}) {
  const result = await checkSkillUpdate(options);
  if (result.status === "required") {
    throw new Error(result.message);
  }
  if (result.status === "available" && result.message) {
    console.error(result.message);
  }
  return result;
}

export function compareVersions(left, right) {
  const parse = (value) => String(value || "0.0.0")
    .split(/[+-]/, 1)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

export function summarizeErrorBody(body) {
  if (!body) return "Unknown error";
  if (typeof body === "string") return body.slice(0, 500);
  if (body?.code && body?.message && body.message !== "success") {
    return `${body.code}: ${body.message}`.slice(0, 500);
  }
  if (body?.error?.message) return String(body.error.message).slice(0, 500);
  if (body?.message) return String(body.message).slice(0, 500);
  if (body?.raw) return String(body.raw).slice(0, 500);
  return JSON.stringify(body).slice(0, 500);
}

export function summarizeTaskResponse(response, maxLength = 1000) {
  try {
    return JSON.stringify(response).slice(0, maxLength);
  } catch {
    return "[unserializable task response]";
  }
}

function isUsefulFailureSummary(summary) {
  const normalized = String(summary || "").trim().toLowerCase();
  return normalized !== "" && normalized !== "unknown error" && normalized !== "success" && normalized !== "ok";
}

export function buildHttpErrorMessage(status, body) {
  const summary = summarizeErrorBody(body);
  const lowerSummary = summary.toLowerCase();
  const guidance = guidanceForHttpError(status, lowerSummary);
  return `HiAPI request failed with HTTP ${status}: ${summary}\n${guidance}`;
}

function guidanceForHttpError(status, lowerSummary) {
  if (status === 401 || status === 403) {
    return `Check your HiAPI API key or create a new one: ${HIAPI_API_KEYS_URL}`;
  }

  if (
    status === 402 ||
    lowerSummary.includes("insufficient") ||
    lowerSummary.includes("balance") ||
    lowerSummary.includes("credit") ||
    lowerSummary.includes("quota")
  ) {
    return `Your HiAPI balance or credits may be insufficient. Add credits or check billing in the HiAPI dashboard: ${HIAPI_DASHBOARD_URL}. Pricing: ${HIAPI_PRICING_URL}`;
  }

  if (status === 429) {
    return "The request was rate limited. Please wait and retry, or reduce concurrent image generation requests.";
  }

  if (
    lowerSummary.includes("content_policy") ||
    lowerSummary.includes("policy") ||
    lowerSummary.includes("safety")
  ) {
    return "The prompt may have triggered a safety policy. Revise the prompt and try again.";
  }

  return `If this keeps happening, verify your HiAPI key, account status, and model access in the HiAPI dashboard: ${HIAPI_DASHBOARD_URL}`;
}

function imageOutputFromEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const value =
    entry.url ||
    entry.image_url ||
    entry.data ||
    entry.b64_json ||
    entry.base64 ||
    entry.content ||
    "";

  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("data:image/")) {
    const mimeMatch = value.match(/^data:([^;]+);base64,/);
    return {
      kind: "data-uri",
      mimeType: mimeMatch?.[1] || entry.mime_type || "image/png",
      value,
    };
  }
  if (/^https?:\/\//.test(value)) {
    return { kind: "url", value };
  }
  if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 64) {
    const mimeType = entry.mime_type || entry.mimeType || "image/png";
    return {
      kind: "data-uri",
      mimeType,
      value: `data:${mimeType};base64,${value}`,
    };
  }
  return null;
}

export async function saveImageOutputs(outputs, { outputDir, now = new Date() }) {
  await mkdir(outputDir, { recursive: true });
  const saved = [];
  let index = 1;

  for (const output of outputs) {
    if (output.kind === "url") {
      // Task outputs are temporary URLs (expire in days) — download them locally
      // so the promised outputs/ directory always holds the result. Fall back to
      // the raw URL when the download fails.
      try {
        let response = await fetch(output.value).catch(() => null);
        if (!response || !response.ok) {
          // Fresh outputs can lag CDN propagation for a moment — retry once.
          await new Promise((resolve) => setTimeout(resolve, 2000));
          response = await fetch(output.value);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
        const extension = extensionForMimeType(mimeType) || path.extname(new URL(output.value).pathname) || ".png";
        const fileName = `seedream-5-pro-${formatTimestamp(now)}-${index}${extension}`;
        const filePath = path.resolve(outputDir, fileName);
        await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
        saved.push({ kind: "file", path: filePath, mimeType, sourceUrl: output.value });
        index += 1;
      } catch (err) {
        if (process.env.SEEDREAM_DEBUG) console.error("[download-fallback]", err && err.message);
        saved.push({ kind: "url", url: output.value });
      }
      continue;
    }

    const extension = extensionForMimeType(output.mimeType);
    const fileName = `seedream-5-pro-${formatTimestamp(now)}-${index}${extension}`;
    const filePath = path.resolve(outputDir, fileName);
    const base64 = output.value.replace(/^data:[^;]+;base64,/, "");
    await writeFile(filePath, Buffer.from(base64, "base64"));
    saved.push({ kind: "file", path: filePath, mimeType: output.mimeType });
    index += 1;
  }

  return saved;
}

export function extensionForMimeType(mimeType) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

function formatTimestamp(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "-");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
