#!/usr/bin/env node
import path from "node:path";

import {
  buildImagePayload,
  createImageTask,
  extractTaskId,
  resolveConfig,
  saveImageOutputs,
  warnOrRequireSkillUpdate,
  waitForImage,
} from "./lib/seedream-5-pro.mjs";

function parseArgs(argv) {
  const options = {
    outputDir: "outputs",
  };
  const promptParts = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--model" || arg === "-m") {
      options.model = argv[++i];
    } else if (arg === "--prompt" || arg === "-p") {
      options.prompt = argv[++i];
    } else if (arg === "--aspect-ratio" || arg === "--aspect") {
      options.aspectRatio = argv[++i];
    } else if (arg === "--quality") {
      options.quality = argv[++i];
    } else if (arg === "--resolution") {
      throw new Error('The --resolution option was removed in skill 0.2.0. Use --quality basic (1K) or --quality high (2K).');
    } else if (arg === "--output-format" || arg === "--format") {
      options.outputFormat = argv[++i];
    } else if (arg === "--storage") {
      options.storage = argv[++i];
    } else if (arg === "--callback-url") {
      options.callbackUrl = argv[++i];
    } else if (arg === "--callback-when") {
      options.callbackWhen = argv[++i];
    } else if (arg === "--input-url" || arg === "--input-urls" || arg === "--image-url" || arg === "--image-urls") {
      if (!options.inputUrls) options.inputUrls = [];
      options.inputUrls.push(argv[++i]);
    } else if (arg === "--output-dir" || arg === "-o") {
      options.outputDir = argv[++i];
    } else if (arg === "--no-save") {
      options.save = false;
    } else if (arg === "--no-wait") {
      options.wait = false;
    } else if (arg?.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      promptParts.push(arg);
    }
  }

  if (!options.prompt && promptParts.length > 0) {
    options.prompt = promptParts.join(" ");
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  hiapi-seedream-5-pro --prompt "A vintage tea house poster with brush calligraphy" --aspect-ratio 3:4
  hiapi-seedream-5-pro --model i2i --prompt "Turn this into a sunny morning scene" --input-url https://example.com/photo.jpg

Options:
  -m, --model           seedream-5.0-pro/text-to-image (default, alias: t2i) or
                        seedream-5.0-pro/image-to-image (alias: i2i, edit).
  -p, --prompt          Prompt, 4-5000 characters. Positional text is also accepted.
      --aspect-ratio    1:1 (default), 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, or 21:9.
      --quality         basic (default, 1K, $0.05/image) or high (2K, $0.10/image).
      --output-format   png (default) or jpeg.
      --storage         temp (default, link expires in ~7 days) or persistent
                        (long-term output storage, billed by size; requires the
                        Output Storage feature on your account).
      --callback-url    HTTPS endpoint notified when the task reaches success or fail.
      --callback-when   Callback timing. Only final is supported (default: final).
      --input-url       Repeatable, or comma separated. Required 1-10 times for i2i.
                        JPG/PNG/WebP, up to 10 MB each; SVG is not supported.
  -o, --output-dir      Directory for generated image files. Default: outputs
      --no-save         Return remote URLs without writing files
      --no-wait         Create the task and return the task id
  -h, --help            Show this help

Environment:
  HIAPI_API_KEY         Required HiAPI API key
  HIAPI_BASE_URL        Optional, defaults to https://api.hiapi.ai`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await warnOrRequireSkillUpdate();

  const config = resolveConfig();
  const payload = buildImagePayload({
    model: options.model,
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    quality: options.quality,
    outputFormat: options.outputFormat,
    inputUrls: options.inputUrls,
    storage: options.storage,
    callbackUrl: options.callbackUrl,
    callbackWhen: options.callbackWhen,
  });

  const created = await createImageTask(payload, { config });
  const taskId = extractTaskId(created);
  if (!taskId) {
    throw new Error(`No image task id returned: ${JSON.stringify(created)}`);
  }

  if (options.wait === false) {
    console.log(
      JSON.stringify(
        {
          model: payload.model,
          taskId,
          status: "created",
          aspectRatio: payload.input.aspect_ratio,
          quality: payload.input.quality,
          outputs: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  const { response, outputs } = await waitForImage(taskId, { config });
  const savedOutputs = options.save === false
    ? outputs.map((output) => output.kind === "url"
      ? { kind: "url", url: output.value }
      : { kind: "data-uri", value: output.value, mimeType: output.mimeType })
    : await saveImageOutputs(outputs, {
      outputDir: path.resolve(process.cwd(), options.outputDir),
    });

  console.log(
    JSON.stringify(
      {
        model: payload.model,
        taskId,
        aspectRatio: payload.input.aspect_ratio,
        quality: payload.input.quality,
        outputs: savedOutputs,
        rawStatus: response,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
