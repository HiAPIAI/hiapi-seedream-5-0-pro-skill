# Seedream 5.0 Pro Image Generation Skill

Add Seedream 5.0 Pro image generation to your AI Agent.

**Seedream 5.0 Pro • Install • API Key • [HiAPI](https://www.hiapi.ai)**

[Get API Key](https://www.hiapi.ai/en/register) · [Pricing](https://www.hiapi.ai/en/pricing) · [HiAPI Docs](https://docs.hiapi.ai) · [All HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills)

Languages: [English](README.md) | [简体中文](README.zh-CN.md)

> **HiAPI Matrix:** 🎨 [Image Prompts](https://github.com/HiAPIAI/hiapi-skills) · 🎬 [Video Prompts](https://github.com/HiAPIAI/awesome-seedance-2-0-prompts) · 🛠️ **Agent Skills (you are here)** · 🤖 [Remote MCP](https://docs.hiapi.ai/for-ai/) · 📖 [API Docs](https://docs.hiapi.ai)

---

> AI Agent? Skip the README and read [llms-install.md](llms-install.md). It contains installation steps and error-handling rules written for agents.

---

## What Is This?

An AI skill for OpenClaw / Claude Code / OpenCode / Codex-style agents. After installation, your AI Agent can use Seedream 5.0 Pro for image generation through HiAPI.

HiAPI is an AI API platform built for developers: one API for all AI models. Images, video, music, and text with one key.

| Skill | Description | Model |
| --- | --- | --- |
| HiAPI Seedream 5.0 Pro | Text-to-image and image-to-image generation | Seedream 5.0 Pro family |

---

## Before You Generate

Seedream 5.0 Pro excels at in-image text, commercial visuals, and photorealistic detail. Spell out every word you want rendered verbatim in the prompt. Use `quality=basic` for 1K iteration and `quality=high` for 2K final delivery.

Version `0.2.0` follows the current API contract: `quality` replaces `resolution`, both models use the same eight aspect ratios, and production callbacks are supported. Older clients generate incompatible requests and need this update.

If the generated image is meant as the starting frame of a video, plan the motion afterward with [hiapi-video-prompt-generator-skill](https://github.com/HiAPIAI/hiapi-video-prompt-generator-skill), then render with [hiapi-seedance-2-0-video-skill](https://github.com/HiAPIAI/hiapi-seedance-2-0-video-skill) (image-to-video).

For broader agent integration, use [hiapi-skills](https://github.com/HiAPIAI/hiapi-skills) as the directory or connect Remote MCP at `https://mcp.hiapi.ai/mcp`.

---

## Install

### One Command (Recommended)

```bash
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
```

The installer auto-detects Codex (`~/.codex/skills`) and Claude Code (`~/.claude/skills`). If both exist, the `-y` flag installs to both. To target a specific agent or directory:

```bash
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --codex          # ~/.codex/skills only
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --claude         # ~/.claude/skills only
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --target=/path   # custom directory
AGENT_SKILLS_DIR=/path npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
```

The script backs up an existing canonical or legacy installation under `~/.cache/hiapi-skill-backup/`, replaces it with the current version, preserves an existing `.env`, and reports whether `HIAPI_API_KEY` is set. The standalone CLI reads `HIAPI_API_KEY` from its process environment; preserving `.env` prevents data loss for agent runtimes or wrappers that load it.

### OpenClaw

```bash
openclaw skills add https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill
```

### Manual Install (Any Agent)

```bash
export AGENT_SKILLS_DIR="/path/to/your/agent/skills"
mkdir -p "$AGENT_SKILLS_DIR"
git clone https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git "$AGENT_SKILLS_DIR/hiapi-seedream-5-0-pro"
```

Replace `AGENT_SKILLS_DIR` with your agent's skill directory.
When manually upgrading, move any existing `hiapi-seedream-5-0-pro` and legacy `hiapi-seedream-5-pro` directories out of the skills folder first. Cloning directly into the final path fails safely if a destination still exists; the recommended installer handles migration, backup, and rollback automatically.

### Agent Auto-Install Prompt

```text
Install the HiAPI Seedream 5.0 Pro image generation skill:

1. Run: npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
   (auto-detects Codex / Claude Code skill directories)
2. Set the HIAPI_API_KEY environment variable from https://www.hiapi.ai/en/dashboard/api-keys
3. Read SKILL.md for usage
```

---

## Get API Key

1. Open [Get API Key](https://www.hiapi.ai/en/register)
2. Sign in or create a HiAPI account
3. Create a new API Key
4. Set the environment variable in the terminal that runs your agent:

```bash
export HIAPI_API_KEY="your_hiapi_api_key_here"
export HIAPI_BASE_URL="https://api.hiapi.ai"
```

Check configuration:

```bash
node scripts/check-config.mjs
```

Live check:

```bash
node scripts/check-config.mjs --live
```

---

## Seedream 5.0 Pro Image Generation

Ask your AI Agent to generate images with natural language, or provide reference image URLs for the image-to-image variants.

### Features

- Text-to-image: describe the image you want and generate it
- Image-to-image: use `seedream-5.0-pro/image-to-image` (alias `i2i`) with 1-10 `--input-url` values
- Models: `seedream-5.0-pro/text-to-image` (alias `t2i`, default), `seedream-5.0-pro/image-to-image` (alias `i2i`)
- Aspect ratios (both models): `1:1` (default), `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`
- Quality: `basic` (1K, $0.05/image, default) or `high` (2K, $0.10/image)
- Output formats: `png` (default), `jpeg`
- References (i2i): 1-10 HTTP(S) JPG/PNG/WebP URLs, up to 10 MB each; SVG is not supported
- Prompt: 4-5000 characters; around 600 English words or fewer is recommended
- Production callbacks: HTTPS `callback.url`, with `callback.when=final`
- Local output: images are saved to `outputs/`
- URL output: if HiAPI returns an image URL, the Agent returns the URL directly
- Clear errors: missing Key, invalid Key, insufficient balance, rate limits, and safety policy blocks all include a next step

### Examples

Talk directly to your AI Agent:

> Use `$hiapi-seedream-5-0-pro` to generate a 16:9 image of a sunset over the sea.

> Use HiAPI Seedream 5.0 Pro to create a minimal logo, aspect ratio 1:1.

> Generate a 9:16 social media poster with the headline text "Build Faster".

### CLI Script

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Create a cinematic mountain lake photo at sunset" \
  --aspect-ratio 16:9 \
  --quality basic
```

Image-to-image:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --model seedream-5.0-pro/image-to-image \
  --prompt "Turn this product photo into a clean premium studio ad" \
  --input-url "https://example.com/product.jpg" \
  --aspect-ratio 16:9 \
  --quality high
```

Custom output directory:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Minimal poster for an AI image API, premium tech brand style" \
  --aspect-ratio 1:1 \
  --output-dir ./outputs
```

Production callback:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Premium product launch poster" \
  --callback-url "https://your-domain.com/hiapi/callback" \
  --callback-when final \
  --no-wait
```

Both success and fail can trigger the final callback. Make your handler idempotent by `taskId`. For signed callbacks, configure a 16-256 character Webhook signing key on the HiAPI account settings page; unsigned callbacks do not include signature headers. Verify `X-HiAPI-Timestamp` and `X-HiAPI-Signature` against the raw body, compare in constant time, and reject timestamps outside a 5-minute window. Use `GET /v1/tasks/:id` for local debugging or callback-failure recovery.

---

## File Structure

```text
.
├── README.md
├── README.zh-CN.md
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── api.md
│   └── output.md
├── scripts/
│   ├── check-config.mjs
│   ├── hiapi-seedream-5-pro.mjs
│   └── lib/
│       └── seedream-5-pro.mjs
├── tests/
│   └── seedream-5-pro.test.mjs
└── llms-install.md
```

---

## FAQ

| Problem | Solution |
| --- | --- |
| `HIAPI_API_KEY is required` | Create a Key at [Get API Key](https://www.hiapi.ai/en/register), then set `HIAPI_API_KEY`. |
| `401 Unauthorized` | Check whether the API Key is correct, or generate a new Key. |
| `402 Payment Required` / insufficient balance | Open the [HiAPI Dashboard](https://www.hiapi.ai/en/dashboard) and check your account status. |
| `429 Too Many Requests` | Wait and retry, or reduce concurrent generation requests. |
| Content blocked | The prompt triggered a safety policy. Revise the description. |
| No image output | Check the task response; this skill expects an image URL or data URI in `data.output[]` after the task succeeds. |
| `--resolution` no longer works | Use `--quality basic` for 1K or `--quality high` for 2K. |
| Skill update available | The CLI checks the HiAPI skills index at startup. If the update is optional, it prints the upgrade command and continues. |
| Skill update required | The CLI stops and prints the required upgrade command. Run `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y`, then restart your agent. |

Set `HIAPI_SKIP_UPDATE_CHECK=1` only for offline or locked-down environments where the skills index cannot be reached.

---

## Compatibility

| Agent | Install Method |
| --- | --- |
| Codex | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --codex` |
| Claude Code | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --claude` |
| OpenClaw | `openclaw skills add https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill` |
| OpenCode | `AGENT_SKILLS_DIR=~/.opencode/skills npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y` |
| Cursor / other | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --target=/your/skills/dir` |

---

## License

MIT

---

[HiAPI](https://www.hiapi.ai) — One API, all AI models
