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
    } else if (arg === "--resolution") {
      options.resolution = argv[++i];
    } else if (arg === "--output-format" || arg === "--format") {
      options.outputFormat = argv[++i];
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
  -p, --prompt          Prompt, up to 4000 characters. Positional text is also accepted.
      --aspect-ratio    t2i: 1:1 (default), 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 21:9.
                        i2i adds match_input_image (default) to follow the first reference image.
      --resolution      1K (~2 MP) or 2K (~4 MP, up to 2048x2048). Default: 2K
      --output-format   png (default) or jpeg.
      --input-url       Repeatable, or comma separated. Required 1-10 times for i2i.
                        JPG/PNG/WebP reference images; SVG is not supported.
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
    resolution: options.resolution,
    outputFormat: options.outputFormat,
    inputUrls: options.inputUrls,
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
          resolution: payload.input.resolution,
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
        resolution: payload.input.resolution,
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
