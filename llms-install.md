# HiAPI Seedream 5.0 Pro Skill - AI Agent Notes

Read this file before installing or using the skill.

Important links:

- API key: https://www.hiapi.ai/en/register
- Pricing: https://www.hiapi.ai/en/pricing
- HiAPI docs: https://docs.hiapi.ai
- HiAPI skills directory: https://github.com/HiAPIAI/hiapi-skills

## Purpose

Install `hiapi-seedream-5-0-pro`, a text-to-image and image-to-image skill for Seedream 5.0 Pro through HiAPI.

Version `0.2.0` uses `quality: basic|high`. The former `resolution` field and `match_input_image` aspect ratio are incompatible with the current API.

## Requirements

- Node.js 18 or newer.
- `HIAPI_API_KEY` in the environment.
- Optional `HIAPI_BASE_URL`; default `https://api.hiapi.ai`.

## Recommended Install Or Update

```bash
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
```

The installer detects Codex and Claude Code, backs up an existing canonical or legacy installation under `~/.cache/hiapi-skill-backup/`, installs to `hiapi-seedream-5-0-pro`, preserves an existing `.env`, and asks the user to restart the agent.

## Manual Codex Install

```bash
git clone https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R hiapi-seedream-5-0-pro-skill "${CODEX_HOME:-$HOME/.codex}/skills/hiapi-seedream-5-0-pro"
```

When manually upgrading, move the legacy `hiapi-seedream-5-pro` directory out of the skills folder first. The recommended installer handles this migration automatically.

## Configure

```bash
export HIAPI_API_KEY="your_hiapi_api_key_here"
export HIAPI_BASE_URL="https://api.hiapi.ai"
node scripts/check-config.mjs
```

## Generate

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Create a 16:9 launch poster for an AI writing app" \
  --aspect-ratio 16:9 \
  --quality basic
```

Image-to-image:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --model seedream-5.0-pro/image-to-image \
  --prompt "Restyle this product photo as a premium studio ad" \
  --input-url "https://example.com/product.jpg" \
  --aspect-ratio 16:9 \
  --quality high
```

Production callback:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Premium product launch poster" \
  --callback-url "https://your-domain.com/hiapi/callback" \
  --no-wait
```

Supported models are `seedream-5.0-pro/text-to-image` and `seedream-5.0-pro/image-to-image`. Image-to-image requires 1-10 reference URLs; text-to-image must not receive them.

## Agent Behavior

1. Read `SKILL.md`.
2. Ensure `HIAPI_API_KEY` is configured.
3. Run `scripts/hiapi-seedream-5-pro.mjs` with `--quality basic` or `--quality high`.
4. Return real generated file paths or remote URLs only.
5. For production services, prefer a final callback, verify its timestamp/HMAC signature against the raw body, reject stale timestamps, and make processing idempotent by `taskId`.
6. On task failure, return the HTTP or task error and do not blindly retry an unchanged invalid request.
7. For balance, credits, quota, or HTTP 402 errors, direct the user to https://www.hiapi.ai/en/dashboard.
8. For HTTP 429, ask the user to wait or reduce concurrency.
9. For content policy errors, ask the user to revise the prompt.
10. If the CLI prints an optional update, show the update command and continue.
11. If it prints `Update now:`, require the user to run the command and restart the agent before generating again.

Do not fabricate image paths, URLs, task states, or callback deliveries.
