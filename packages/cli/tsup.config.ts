import { chmodSync, cpSync, mkdirSync } from "fs";
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
    // Bundle the built Workspace SPA into the CLI dist so it ships with the
    // published package. Source is packages/workspace/dist (built first by the
    // cli:build script); path is relative to packages/cli where tsup runs.
    mkdirSync("dist/workspace-dist", { recursive: true });
    cpSync("../workspace/dist", "dist/workspace-dist", { recursive: true });
  },
});
