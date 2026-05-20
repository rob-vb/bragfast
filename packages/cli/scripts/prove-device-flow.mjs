#!/usr/bin/env node
import { mkdtempSync, existsSync, writeFileSync } from "fs";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const root = process.cwd();
const cli = path.join(root, "packages/cli/dist/index.js");
const tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-proof-"));

try {
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  if (!help.includes("brag") || !help.includes("login") || !help.includes("logout")) {
    throw new Error("CLI help output missing expected commands");
  }

  const credentials = path.join(tmp, "credentials.json");
  writeFileSync(credentials, JSON.stringify({
    api_key: "bf_proof",
    created_at: new Date().toISOString(),
  }));
  execFileSync("node", [cli, "logout"], {
    env: { ...process.env, BRAG_HOME: tmp },
    encoding: "utf8",
  });
  if (existsSync(credentials)) throw new Error("logout did not clear credentials");

  console.log("CLI proof PASS: help and logout work");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
