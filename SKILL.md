---
name: hiapi-seedream-5-0-pro
description: Generate and edit images with ByteDance Seedream 5.0 Pro through the HiAPI unified async task API. Use when a user asks for Seedream 5.0 Pro or Seedream 5 Pro text-to-image generation, sharp in-image text, commercial or photorealistic images, consistency-preserving edits, or multi-reference image composition.
---

# HiAPI Seedream 5.0 Pro

Use this skill for both HiAPI models:

- `seedream-5.0-pro/text-to-image` (alias `t2i`, default): text-to-image with strong poster, signage, calligraphy, product, and portrait rendering.
- `seedream-5.0-pro/image-to-image` (alias `i2i`): edits and multi-reference compositions using 1-10 reference images.

The current request contract uses `quality`, not the removed `resolution` field. Both models use the same eight aspect ratios; do not send `match_input_image` or `auto`.

## Requirements

- Node.js 18 or newer.
- Set `HIAPI_API_KEY` in the environment.
- Optionally set `HIAPI_BASE_URL`; the default is `https://api.hiapi.ai`.

Important links:

- Get API key: https://www.hiapi.ai/en/register
- Pricing: https://www.hiapi.ai/en/pricing
- Docs: https://docs.hiapi.ai

Never invent an image result. If an API call fails, report the status code, compact error message, and the next action from Error Guidance.

## Generate An Image

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "An elegant vintage Chinese tea house poster with the exact title 山水茶社" \
  --aspect-ratio 3:4 \
  --quality basic
```

Parameters:

- `--prompt`: 4-5000 characters. Keep prompts around 600 English words or fewer when possible. Spell out in-image text verbatim.
- `--aspect-ratio`: `1:1` (default), `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, or `21:9`.
- `--quality`: `basic` (default, 1K, $0.05/image) or `high` (2K, $0.10/image).
- `--output-format`: `png` (default) or `jpeg`.
- `--storage`: optional HiAPI task storage tier, `temp` or `persistent`. Persistent requests can fall back to temporary storage; inspect the task detail for the actual tier. The CLI also downloads completed outputs to `outputs/` by default.

## Edit Or Compose Images

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --model i2i \
  --prompt "Turn this rainy night street into a sunny morning while keeping the layout and sign text unchanged" \
  --input-url https://example.com/street.jpg \
  --aspect-ratio 16:9 \
  --quality high
```

- Repeat `--input-url` or pass comma-separated values for 1-10 reference URLs.
- References must be HTTP(S) JPG, PNG, or WebP images, up to 10 MB each. SVG is not supported.
- For multi-reference work, state each image's role, such as "person from image 1, scene from image 2".
- State every element that must remain unchanged, especially identity, layout, product details, and in-image text.

## Production Callbacks

Prefer a callback for production services and use polling for local debugging or callback recovery:

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Premium product launch poster" \
  --callback-url https://your-domain.com/hiapi/callback \
  --callback-when final \
  --no-wait
```

- `callback.url` must be HTTPS.
- `callback.when` currently supports only `final`.
- Both success and fail can trigger the final callback. Handle callbacks idempotently by `taskId`.
- Callback signatures are optional. Configure a 16-256 character Webhook signing key on the HiAPI account settings page to receive `X-HiAPI-Timestamp` and `X-HiAPI-Signature`; unsigned callbacks omit both headers.
- For signed callbacks, verify the raw request body with `hex(HMAC-SHA256(secret, timestamp + "." + rawBody))`, compare in constant time, and reject timestamps outside a 5-minute window.
- Use `GET /v1/tasks/:id` as a local debugging path or compensation query after a missed callback.

## Check Configuration

```bash
node scripts/check-config.mjs
node scripts/check-config.mjs --live
```

## Output

The CLI prints JSON with `taskId`, `quality`, the resolved aspect ratio, and `outputs`. Completed files are saved under `outputs/` unless `--output-dir` or `--no-save` is used. See `references/output.md`.

## Error Guidance

| Symptom | Action |
| --- | --- |
| `HIAPI_API_KEY is required` | Ask the user to set `HIAPI_API_KEY`. Never guess a key. |
| 401 / invalid API key | Ask the user to check or regenerate the key. |
| `permission_denied` | Ask the user to verify model access, group, plan, and limits. |
| Missing `image_urls` | Add 1-10 `--input-url` values for i2i. |
| Reference images sent to t2i | Switch to `--model i2i` or remove the references. |
| `INSUFFICIENT_QUOTA` | Ask the user to top up. Do not retry blindly. |
| Task status `fail` | Report the returned failure reason and correct the request before retrying. |
| Timeout after 5 minutes | Report the `taskId`; the task may still be queried with `GET /v1/tasks/:id`. |
| Skill update available | Show the printed update command, then continue with the current request. |
| Skill update required | Run the printed update command and restart the agent before generating again. |

## API Reference

Read `references/api.md` for the raw `/v1/tasks` request contract and `references/output.md` for callback, polling, and output handling.
