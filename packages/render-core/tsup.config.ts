import { copyFileSync, mkdirSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/browser.ts", "src/image-entry.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",
  external: [
    "sharp",
    "satori",
    "@remotion/bundler",
    "@remotion/renderer",
    "remotion",
    "react",
    "react-dom",
  ],
  async onSuccess() {
    mkdirSync("dist/fonts", { recursive: true });
    copyFileSync("fonts/PlusJakartaSans-Regular.ttf", "dist/fonts/PlusJakartaSans-Regular.ttf");
    copyFileSync("fonts/PlusJakartaSans-Bold.ttf", "dist/fonts/PlusJakartaSans-Bold.ttf");
  },
});
