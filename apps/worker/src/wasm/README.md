# Worker WASM

`generated/` is produced by:

```bash
bun --filter api-worker build:wasm
```

The generated files are currently tracked because the Worker runtime imports them from source during local development and deployment. Do not edit files in `generated/` by hand; update `wasm/src/lib.rs` and rebuild instead.
