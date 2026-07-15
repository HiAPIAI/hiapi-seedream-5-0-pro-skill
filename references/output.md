# Output Handling

Seedream 5.0 Pro tasks are asynchronous.

## Production Callback Flow

1. Send `POST /v1/tasks` with top-level `callback.url` and `callback.when: "final"`.
2. Store the returned `taskId` before returning control to the caller.
3. If a Webhook signing key is configured in HiAPI account settings, verify `X-HiAPI-Timestamp` and `X-HiAPI-Signature` against the raw body using `hex(HMAC-SHA256(secret, timestamp + "." + rawBody))`; compare in constant time and reject timestamps outside a 5-minute window. Unsigned callbacks omit both headers.
4. Accept both success and fail terminal notifications.
5. Make callback handling idempotent by `taskId` because deliveries may be retried.
6. If a callback is missing or needs confirmation, recover with `GET /v1/tasks/{taskId}`.

## Polling Flow

For local debugging or low-frequency use:

1. `POST /v1/tasks` returns `data.taskId`.
2. Poll `GET /v1/tasks/{taskId}`.
3. Stop when the task reaches `success` or `fail`.

Common success response:

```json
{
  "data": {
    "taskId": "task_123",
    "status": "success",
    "output": [
      {
        "type": "image",
        "url": "https://cdn.example.com/image.png"
      }
    ]
  }
}
```

The CLI downloads URL outputs into `outputs/` by default and can also save data URIs. With `--no-save`, it returns remote URLs instead.

CLI result example:

```json
{
  "model": "seedream-5.0-pro/text-to-image",
  "taskId": "task_123",
  "aspectRatio": "16:9",
  "quality": "basic",
  "outputs": [
    {
      "kind": "file",
      "path": "/absolute/path/to/outputs/seedream-5-pro-20260715-154500-1.png"
    }
  ]
}
```

Treat a successful task with no extractable image as a failure and show the returned task summary. For `status=fail`, report the API's failure reason and do not retry the same invalid request unchanged.
