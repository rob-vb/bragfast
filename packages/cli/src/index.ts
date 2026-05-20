#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { clearCredentials, readCredentials } from "./credentials";
import { login } from "./auth";

const program = new Command();
const invoked = path.basename(process.argv[1] ?? "bragfast");
const commandName = invoked === "brag" ? "brag" : "bragfast";

program
  .name(commandName)
  .description("brag.fast CLI")
  .version("0.1.0")
  .action(async () => {
    const credentials = await readCredentials();
    if (!credentials) {
      await login();
      return;
    }
    process.stdout.write("Logged in. Workspace server arrives in Phase 3.\n");
  });

program
  .command("login")
  .description("Log in with browser device flow")
  .action(async () => {
    await login();
  });

program
  .command("logout")
  .description("Clear local CLI credentials")
  .action(async () => {
    await clearCredentials();
    process.stdout.write("Logged out.\n");
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
