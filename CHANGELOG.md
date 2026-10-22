# Changelog

## 0.2.1 — 2026-10-23

- Restored the required `resolution` input (`1K`|`2K`) in every request payload. The 0.2.0 contract change to `quality` did not match the live API, which rejects `quality` with `additionalProperties: false` and returns HTTP 400 on every call.
- `--resolution` is the supported CLI flag again. `--quality basic|high` remains as a deprecated alias that maps to `1K`/`2K` and prints a warning; passing both flags is an error.
- The default resolution is `2K`, matching the API documentation. `1K` is not the default; pass `--resolution 1K` for the cheaper tier.
- Added `--dry-run` to print the request payload without an API key or a paid task.
- Corrected pricing in the docs: image-to-image 1K is $0.06 per image (not $0.05). Text-to-image 1K is $0.05 and 2K is $0.10 for both modes.
- Updated `SKILL.md`, `references/api.md`, `references/output.md`, both READMEs, `llms-install.md`, and the agent manifest to use `resolution`.