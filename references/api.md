# HiAPI Seedream 5.0 Pro API

## Endpoint

The Seedream 5.0 Pro family uses HiAPI's unified async task API:

```text
POST https://api.hiapi.ai/v1/tasks
GET https://api.hiapi.ai/v1/tasks/{taskId}
```

Set `HIAPI_BASE_URL` to override the host.

## Authentication

Send the user's HiAPI key as a bearer token:

```http
Authorization: Bearer $HIAPI_API_KEY
Content-Type: application/json
```

Do not print API keys in logs or final answers.

If the user does not have a key, send them to:

```text
https://www.hiapi.ai/en/register
```

If generation fails because of balance, credits, quota, or payment status, send them to:

```text
https://www.hiapi.ai/en/dashboard
https://www.hiapi.ai/en/pricing
```

## Request Body

Text-to-image:

```json
{
  "model": "seedream-5.0-pro/text-to-image",
  "input": {
    "prompt": "An elegant vintage Chinese tea house poster, hand-painted brush calligraphy title",
    "aspect_ratio": "3:4",
    "resolution": "1K",
    "output_format": "png"
  }
}
```

Image-to-image:

```json
{
  "model": "seedream-5.0-pro/image-to-image",
  "input": {
    "prompt": "Turn this rainy night street into a sunny morning scene, keep the storefront sign text unchanged",
    "image_urls": ["https://example.com/street.jpg"],
    "aspect_ratio": "match_input_image",
    "resolution": "1K",
    "output_format": "png"
  }
}
```

## Parameters

| Parameter | Required | Notes |
| --- | --- | --- |
| `model` | yes | `seedream-5.0-pro/text-to-image` or `seedream-5.0-pro/image-to-image`. |
| `input.prompt` | yes | Up to 4000 characters. Spell out any in-image text verbatim. |
| `input.image_urls` | image-to-image only | 1-10 public reference image URLs (JPG/PNG/WebP; SVG is not supported). Do not send it for text-to-image. |
| `input.aspect_ratio` | yes | t2i: `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, `2:3`, `21:9`. i2i adds `match_input_image` to follow the first reference image. |
| `input.resolution` | yes | `1K` (~2 MP) or `2K` (~4 MP, up to 2048x2048). Billed per image by tier. |
| `input.output_format` | no | `png` (default) or `jpeg`. |

Text-to-image does not accept `image_urls`. Image-to-image requires it, and the CLI validates the 1-10 limit and SVG rejection before sending the task.
