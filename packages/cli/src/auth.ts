import open from "open";
import ora from "ora";
import { writeCredentials } from "./credentials";
import { DeviceFlowError, getApiUrl, pollDeviceToken, requestDeviceCode } from "./http";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface LoginOptions {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  openBrowser?: (url: string) => Promise<unknown>;
  stdout?: Pick<NodeJS.WriteStream, "write" | "isTTY">;
  pollDelayMs?: number;
}

export async function login(options: LoginOptions = {}): Promise<void> {
  const apiUrl = options.apiUrl ?? getApiUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  const stdout = options.stdout ?? process.stdout;
  const openBrowser = options.openBrowser ?? ((url: string) => open(url));
  const issued = await requestDeviceCode(fetchImpl, apiUrl);

  stdout.write(`Code: ${issued.user_code}\n`);
  stdout.write(`Open: ${issued.verification_uri}\n`);

  await openBrowser(issued.verification_uri).catch(() => undefined);

  const spinner = stdout.isTTY
    ? ora("Waiting for approval in your browser...").start()
    : null;
  if (!spinner) stdout.write("Waiting for approval in your browser...\n");

  const deadline = Date.now() + issued.expires_in * 1000;
  const pollDelayMs = options.pollDelayMs ?? issued.interval * 1000;

  while (Date.now() < deadline) {
    const result = await pollDeviceToken(issued.device_code, fetchImpl, apiUrl);
    if (!(result instanceof DeviceFlowError)) {
      await writeCredentials({
        api_key: result.access_token,
        email: result.email,
        userId: result.userId,
        created_at: new Date().toISOString(),
      });
      spinner?.succeed(`Logged in${result.email ? ` as ${result.email}` : ""}.`);
      if (!spinner) stdout.write(`Logged in${result.email ? ` as ${result.email}` : ""}.\n`);
      return;
    }

    if (result.code === "authorization_pending") {
      await sleep(pollDelayMs);
      continue;
    }
    if (result.code === "access_denied") {
      spinner?.fail("Access denied.");
      if (!spinner) stdout.write("Access denied.\n");
      throw result;
    }
    if (result.code === "expired_token") {
      spinner?.fail("Login code expired. Run `brag login` again.");
      if (!spinner) stdout.write("Login code expired. Run `brag login` again.\n");
      throw result;
    }

    throw result;
  }

  spinner?.fail("Login code expired. Run `brag login` again.");
  if (!spinner) stdout.write("Login code expired. Run `brag login` again.\n");
  throw new DeviceFlowError("expired_token");
}
