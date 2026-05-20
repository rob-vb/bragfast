import { mkdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

export interface Credentials {
  api_key: string;
  email?: string;
  userId?: string;
  created_at: string;
}

export function getBragHome(): string {
  return process.env.BRAG_HOME || path.join(os.homedir(), ".brag");
}

export function getCredentialsPath(): string {
  return path.join(getBragHome(), "credentials.json");
}

export async function readCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(getCredentialsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (typeof parsed.api_key !== "string" || !parsed.api_key.startsWith("bf_")) return null;
    if (typeof parsed.created_at !== "string") return null;
    return parsed as Credentials;
  } catch {
    return null;
  }
}

export async function writeCredentials(credentials: Credentials): Promise<void> {
  const dir = getBragHome();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(getCredentialsPath(), `${JSON.stringify(credentials, null, 2)}\n`, {
    mode: 0o600,
  });
}

export async function clearCredentials(): Promise<void> {
  await rm(getCredentialsPath(), { force: true });
}
