#!/usr/bin/env node
import { createRequire } from "module";
import { writeFileSync } from "fs";

const require = createRequire(import.meta.url);

const core = require("../dist/index.js");
if (typeof core.renderImage !== "function") {
  console.log("SC#1 PENDING -- renderImage not yet exported");
  process.exit(0);
}

const config = {
  version: 2,
  colors: { background: "#ffffff", text: "#111111", primary: "#ff0000" },
  formats: Object.fromEntries(
    [
      ["landscape", [1200, 675]],
      ["square", [1080, 1080]],
      ["portrait", [1080, 1350]],
    ].map(([name, [width, height]]) => [
      name,
      {
        objects: [
          {
            id: "title",
            type: "text",
            name: "Title",
            x: Math.round(width * 0.08),
            y: Math.round(height * 0.36),
            width: Math.round(width * 0.84),
            height: Math.round(height * 0.24),
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
    ]),
  ),
};

const brand = {
  name: "Test",
  logoBase64: "",
  website: "",
  colors: { background: "#ffffff", text: "#111111", primary: "#ff0000" },
  font_family: "Plus Jakarta Sans",
};

const req = {
  brand,
  formats: ["landscape", "square", "portrait"].map((name) => ({
    name,
    slides: [{ templateConfig: config, objectData: { title: { text: "Hello SC#1" } } }],
  })),
};

const result = await core.renderImage(req);
for (const [fmt, data] of Object.entries(result.formats)) {
  const buffer = data.slides[0];
  if (!Buffer.isBuffer(buffer) || buffer.length <= 1000) {
    throw new Error(`SC#1 failed for ${fmt}: invalid JPEG buffer`);
  }
  writeFileSync(`/tmp/test-render-core-${fmt}.jpg`, buffer);
  console.log(`SC#1 PASS: ${fmt} -> ${buffer.length} bytes (${data.dimensions})`);
}
