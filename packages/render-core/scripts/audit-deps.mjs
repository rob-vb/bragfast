#!/usr/bin/env node
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");
const forbidden = ["convex", "@aws-sdk", "next"];
let failed = false;

for (const name of forbidden) {
  try {
    const output = execFileSync(
      "grep",
      ["-r", "--include=*.ts", "--include=*.tsx", "-E", `from ['"]${name}|import\\(['"]${name}`, srcDir],
      { encoding: "utf8" },
    );
    if (output.trim()) {
      failed = true;
      console.error(`FAIL: forbidden import "${name}" found:\n${output.trim()}`);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (failed) process.exit(1);
console.log("PASS: no forbidden imports (convex, @aws-sdk, next)");
