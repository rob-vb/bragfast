import { chmodSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node20",
  async onSuccess() {
    chmodSync("dist/index.js", 0o755);
  },
});
