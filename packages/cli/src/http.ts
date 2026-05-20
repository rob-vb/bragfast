export const DEFAULT_API_URL = "https://bragfast.com";

export function getApiUrl(): string {
  return (process.env.BRAG_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

export class DeviceFlowError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenSuccess {
  access_token: string;
  token_type: "Bearer";
  userId?: string;
  email?: string;
}

export async function requestDeviceCode(fetchImpl = fetch, apiUrl = getApiUrl()): Promise<DeviceCodeResponse> {
  const response = await fetchImpl(`${apiUrl}/api/v1/device/code`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to request device code (${response.status})`);
  return (await response.json()) as DeviceCodeResponse;
}

export async function pollDeviceToken(
  deviceCode: string,
  fetchImpl = fetch,
  apiUrl = getApiUrl(),
): Promise<TokenSuccess | DeviceFlowError> {
  const response = await fetchImpl(`${apiUrl}/api/v1/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  const body = (await response.json()) as { error?: string } & Partial<TokenSuccess>;
  if (!response.ok) return new DeviceFlowError(body.error || "token_error");
  if (typeof body.access_token !== "string") throw new Error("Token response missing access_token");
  return {
    access_token: body.access_token,
    token_type: "Bearer",
    userId: body.userId,
    email: body.email,
  };
}
