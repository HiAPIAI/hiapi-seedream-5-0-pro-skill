# HiAPI Seedream 5.0 Pro API

## Endpoint

```text
POST https://api.hiapi.ai/v1/tasks
GET https://api.hiapi.ai/v1/tasks/{taskId}
```

Set `HIAPI_BASE_URL` to override the host.

## Authentication

```http
Authorization: Bearer $HIAPI_API_KEY
Content-Type: application/json
```

Never print API keys in logs or final answers.

## Text-To-Image Request

```json
{
  "model": "seedream-5.0-pro/text-to-image",
  "input": {
    "prompt": "An elegant vintage Chinese tea house poster with the exact brush-calligraphy title 山水茶社",
    "aspect_ratio": "3:4",
    "quality": "basic",
    "output_format": "png"
  }
}
```

## Image-To-Image Request

```json
{
  "model": "seedream-5.0-pro/image-to-image",
  "input": {
    "prompt": "Turn this rainy night street into a sunny morning while keeping the layout and sign text unchanged",
    "image_urls": [
      "https://example.com/street.jpg"
    ],
    "aspect_ratio": "16:9",
    "quality": "high",
    "output_format": "png"
  },
  "callback": {
    "url": "https://your-domain.com/hiapi/callback",
    "when": "final"
  }
}
```

## Parameters

| Parameter | Required | Notes |
| --- | --- | --- |
| `model` | yes | `seedream-5.0-pro/text-to-image` or `seedream-5.0-pro/image-to-image`. |
| `input.prompt` | yes | 4-5000 characters. Around 600 English words or fewer is recommended. Write required in-image text verbatim. |
| `input.image_urls` | i2i only | 1-10 HTTP(S) JPG, PNG, or WebP URLs. Each image may be up to 10 MB. SVG is not supported. |
| `input.aspect_ratio` | yes | `1:1` (default), `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, or `21:9`. |
| `input.quality` | yes | `basic` (default, 1K, $0.05/image) or `high` (2K, $0.10/image). |
| `input.output_format` | no | `png` (default) or `jpeg`. |
| `callback.url` | when callback is present | HTTPS endpoint that receives the terminal task notification. |
| `callback.when` | no | Only `final` is supported; it is also the default. |
| `storage` | no | HiAPI task-level output storage: `temp` or `persistent`. Persistent requests can fall back to temporary storage; inspect task detail for the actual tier. This is not a model input field. |

Text-to-image must not receive `image_urls`. Image-to-image requires 1-10 references. Neither model accepts the removed `resolution`, `match_input_image`, or `auto` values.

## Production Behavior

- `POST /v1/tasks` returns a `taskId` immediately.
- Prefer `callback.url` in production. Success and fail can both trigger the final callback, so process it idempotently by `taskId`.
- Callback signing is optional. Configure a 16-256 character Webhook signing key on the HiAPI account settings page to receive `X-HiAPI-Timestamp` and `X-HiAPI-Signature`; unsigned callbacks omit both headers.
- For signed callbacks, verify the raw body with `X-HiAPI-Signature = hex(HMAC-SHA256(secret, X-HiAPI-Timestamp + "." + rawBody))`, compare in constant time, and reject timestamps outside a 5-minute window.
- Use `GET /v1/tasks/{taskId}` for local debugging, low-frequency tasks, or callback-failure compensation.
- On `status=success`, read image URLs from `output[].url`.
- On `status=fail`, surface the returned error and correct the request instead of blindly retrying it.

## Account Links

- API key: https://www.hiapi.ai/en/register
- Dashboard: https://www.hiapi.ai/en/dashboard
- Pricing: https://www.hiapi.ai/en/pricing
