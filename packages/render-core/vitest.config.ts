import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@bragfast/render-core": path.resolve(__dirname, "src/index.ts"),
    },
  },
});
