#!/usr/bin/env node
import { createRequire } from "module";
import path from "path";
import { writeFileSync } from "fs";

const require = createRequire(import.meta.url);
const core = require("../dist/index.js");

if (typeof core.renderVideo !== "function") {
  console.log("SC#2 PENDING -- renderVideo not yet exported");
  process.exit(0);
}

const result = await core.renderVideo({
  compositionId: "landscape",
  remotionEntryPoint: path.join(process.cwd(), "src/remotion/index.ts"),
  inputProps: {
    config: {
      version: 2,
      colors: { background: "#ffffff", text: "#111111", primary: "#ff0000" },
      formats: {
        landscape: {
          objects: [
            {
              id: "title",
              type: "text",
              name: "Title",
              x: 96,
              y: 250,
              width: 1008,
              height: 180,
              opacity: 1,
              zIndex: 1,
              colorRole: "text",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.05,
              textAlign: "center",
              verticalAlign: "center",
              textFit: true,
            },
          ],
        },
        square: {
          objects: [
            {
              id: "title",
              type: "text",
              name: "Title",
              x: 86,
              y: 420,
              width: 908,
              height: 220,
              opacity: 1,
              zIndex: 1,
              colorRole: "text",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.05,
              textAlign: "center",
              verticalAlign: "center",
              textFit: true,
            },
          ],
        },
        portrait: {
          objects: [
            {
              id: "title",
              type: "text",
              name: "Title",
              x: 86,
              y: 540,
              width: 908,
              height: 260,
              opacity: 1,
              zIndex: 1,
              colorRole: "text",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.05,
              textAlign: "center",
              verticalAlign: "center",
              textFit: true,
            },
          ],
        },
      },
    },
    format: "landscape",
    slides: [{ title: { text: "Hello SC#2" } }],
    brand: {
      name: "Test",
      logoBase64: "",
      website: "",
      colors: { background: "#ffffff", text: "#111111", primary: "#ff0000" },
      font_family: "Plus Jakarta Sans",
    },
    slideDuration: 4,
    slideDurations: [4],
  },
});

if (!Buffer.isBuffer(result.buffer) || result.buffer.length <= 10000) {
  throw new Error(`SC#2 failed: invalid MP4 buffer (${result.buffer?.length ?? 0} bytes)`);
}
writeFileSync("/tmp/test-render-core-video.mp4", result.buffer);
console.log(`SC#2 PASS: landscape video -> ${result.buffer.length} bytes`);
