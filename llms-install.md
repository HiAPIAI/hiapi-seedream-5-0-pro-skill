# HiAPI Seedream 5.0 Pro Skill - AI Agent Notes

This file is intentionally written for AI agents. Read it before installing or using this skill.

Important links:

- Get API key: https://www.hiapi.ai/en/register
- Pricing: https://www.hiapi.ai/en/pricing
- HiAPI docs: https://docs.hiapi.ai
- Prompt gallery: https://github.com/HiAPIAI/hiapi-skills
- HiAPI skills directory: https://github.com/HiAPIAI/hiapi-skills
- Remote MCP: https://mcp.hiapi.ai/mcp

## Purpose

Install `hiapi-seedream-5-pro`, an image generation skill for the HiAPI Seedream 5.0 Pro family.

## Requirements

- Node.js 18 or newer.
- `HIAPI_API_KEY` in the environment.
- Optional `HIAPI_BASE_URL`; default is `https://api.hiapi.ai`.

## Install Into Codex

```bash
git clone https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R hiapi-seedream-5-0-pro-skill "${CODEX_HOME:-$HOME/.codex}/skills/hiapi-seedream-5-pro"
```

Restart Codex after installation.

## Install Into A Generic Agent Runtime

```bash
git clone https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git
export AGENT_SKILLS_DIR="/path/to/agent/skills"
mkdir -p "$AGENT_SKILLS_DIR"
cp -R hiapi-seedream-5-0-pro-skill "$AGENT_SKILLS_DIR/hiapi-seedream-5-pro"
```

## Configure

```bash
export HIAPI_API_KEY="your_hiapi_api_key_here"
export HIAPI_BASE_URL="https://api.hiapi.ai"
```

Check:

```bash
node scripts/check-config.mjs
```

## Generate

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Create a 16:9 launch poster for an AI writing app" \
  --aspect-ratio 16:9
```

Image-to-image:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --model seedream-5.0-pro/image-to-image \
  --prompt "Restyle this product photo as a premium studio ad" \
  --input-url "https://example.com/product.jpg" \
  --aspect-ratio auto \
  --resolution 2K
```

Supported models are `seedream-5.0-pro/text-to-image`, `seedream-5.0-pro/text-to-image`, `seedream-5.0-pro/image-to-image`, and `seedream-5.0-pro/image-to-image`. Image-to-image models require 1-5 `--input-url` values; text-to-image models must not receive input URLs.

## Prompt Recipe Source

If the user asks for examples, visual styles, prompt ideas, or a starting point, read:

```text
https://github.com/HiAPIAI/hiapi-skills
```

Use that repository as an API-ready creative recipe source. Choose a case by output image and category, preserve creator/source attribution when presenting it, adapt the prompt to the user's subject, then run this skill with the selected aspect ratio.

## Agent Behavior

When this skill is used:

1. Read `SKILL.md`.
2. Ensure `HIAPI_API_KEY` is configured.
3. If the key is missing, tell the user to create one at https://www.hiapi.ai/en/register.
4. Use `scripts/hiapi-seedream-5-pro.mjs`.
5. Return the generated file path or remote URL.
6. If generation fails, return the HTTP status and compact error message.
7. If the error mentions balance, credits, quota, or HTTP 402, tell the user to add credits or check billing at https://www.hiapi.ai/en/dashboard.
8. If the error is HTTP 429, tell the user to wait and retry.
9. If the error mentions content policy or safety, ask the user to revise the prompt.
10. If the CLI prints "A newer HiAPI skill is available", show the update command but continue with the current result.
11. If the CLI prints "skill version is no longer compatible" or "Update now:", tell the user they must run the printed update command before using the skill again.

Do not fabricate image paths or URLs.
