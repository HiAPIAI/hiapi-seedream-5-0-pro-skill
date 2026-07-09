---
name: hiapi-seedream-5-0-pro
description: Generate and edit images with ByteDance Seedream 5.0 Pro via the HiAPI unified async task API. Use when a user asks to create an image (flagship quality, sharp in-image text) or edit/compose images with reference images using Seedream 5.0 Pro, Seedream 5 Pro, or this specific skill.
metadata:
  short-description: Generate and edit Seedream 5.0 Pro images through HiAPI
---

# HiAPI Seedream 5.0 Pro

Use this skill when the user wants image generation or reference-based image editing through ByteDance Seedream 5.0 Pro on HiAPI. One skill covers both models:

- `seedream-5.0-pro/text-to-image` (alias `t2i`, default) — flagship text-to-image with sharp in-image text rendering (English signage and Chinese brush calligraphy verified), photoreal portraits.
- `seedream-5.0-pro/image-to-image` (alias `i2i`) — consistency-preserving edits and multi-reference composites with 1-10 reference images; keeps layout and in-image text when instructed.

## Requirements

- Node.js 18 or newer.
- `HIAPI_API_KEY` must be set in the environment.
- `HIAPI_BASE_URL` is optional and defaults to `https://api.hiapi.ai`.

Important links:

- Get API key: https://www.hiapi.ai/en/register
- Pricing: https://www.hiapi.ai/en/pricing
- Docs: https://docs.hiapi.ai

Never invent an image result. If the API call fails, report the status code, compact error message, and the next action from the Error Guidance section.

## Generate An Image (text-to-image)

Run:

```bash
node scripts/hiapi-seedream-5-pro.mjs --prompt "An elegant vintage Chinese tea house poster, brush calligraphy title" --aspect-ratio 3:4 --resolution 1K
```

Parameters:

- `--aspect-ratio`: `1:1` (default), `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, `2:3`, `21:9`.
- `--resolution`: `1K` (~2 MP, cheaper, fast iteration) or `2K` (~4 MP, default, final delivery). Billing is tiered by resolution.
- `--output-format`: `png` (default) or `jpeg`.
- Prompt up to 4000 characters. Spell out any in-image text verbatim; the model keeps glyphs accurate.

## Edit Images (image-to-image)

Run:

```bash
node scripts/hiapi-seedream-5-pro.mjs --model i2i \
  --prompt "Turn this rainy night street into a sunny morning, keep the storefront sign text unchanged" \
  --input-url https://example.com/street.jpg --resolution 1K
```

- `--input-url` is repeatable (or comma separated): 1-10 reference image URLs. JPG/PNG/WebP; SVG is not supported.
- `--aspect-ratio` gains `match_input_image` (default for i2i) to follow the first reference image.
- For multi-reference composites, state each image's role in the prompt (e.g. "person from image 1, scene from image 2").
- To preserve layout or text, say so explicitly in the prompt ("keep ... unchanged").

## Check Configuration

```bash
node scripts/check-config.mjs          # offline check
node scripts/check-config.mjs --live   # makes one authenticated request
```

## Output

The CLI prints JSON with `taskId`, the resolved input, and `outputs` (saved file paths by default, or remote URLs with `--no-save`). Generated files land in `outputs/` unless `--output-dir` is set. See `references/output.md`.

## Error Guidance

| Symptom | Action |
| --- | --- |
| `HIAPI_API_KEY is required` | Ask the user to set `HIAPI_API_KEY`. Do not guess a key. |
| 401 / `invalid api key` | Key is wrong or revoked — ask the user to check the dashboard. |
| `permission_denied` | The key cannot use this model (group or model allowlist) — ask the user to verify plan/limits. |
| 400 `missing required field "image_urls"` | You called i2i without `--input-url`. Add 1-10 reference URLs. |
| 400 `additional properties` | You passed reference images to t2i. Switch to `--model i2i`. |
| `INSUFFICIENT_QUOTA` | Balance is empty — ask the user to top up. Never retry blindly. |
| Timeout after 3 minutes | Report the `taskId` so the user can query `GET /v1/tasks/:id` later. |

## API Reference

See `references/api.md` for the raw `/v1/tasks` request and response contract.
