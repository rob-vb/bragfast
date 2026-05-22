import type {
  BrandRecord,
  DraftConfig,
  DraftDetail,
  DraftPreview,
  FormatKey,
  IntegrationRecord,
  RenderStatusResponse,
  RoutingDefault,
  ScheduleChannel,
  ScheduleRequest,
  ScheduleResponse,
  RepoContext,
  VideoRenderStatusResponse,
  UserTemplate,
} from "./types";

async function requestJson<T>(url: `/api/${string}`, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  return (await response.json()) as T;
}

export async function fetchRepoContext(): Promise<RepoContext> {
  return requestJson<RepoContext>("/api/repo-context");
}

export async function fetchDrafts(): Promise<DraftPreview[]> {
  const response = await requestJson<{ drafts: DraftPreview[] }>("/api/v1/drafts");
  return response.drafts;
}

export async function fetchDraft(id: string): Promise<DraftDetail> {
  return requestJson<DraftDetail>(`/api/v1/drafts/${encodeURIComponent(id)}`);
}

export async function createDraft(config: DraftConfig): Promise<{ draft_id: string; created_at: string }> {
  return requestJson<{ draft_id: string; created_at: string }>("/api/v1/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function patchDraft(
  id: string,
  config: DraftConfig,
): Promise<{ draft_id: string; created_at: string }> {
  return requestJson<{ draft_id: string; created_at: string }>(
    `/api/v1/drafts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    },
  );
}

export async function fetchBrands(): Promise<BrandRecord[]> {
  return requestJson<BrandRecord[]>("/api/v1/brands");
}

export async function fetchIntegrations(): Promise<IntegrationRecord[]> {
  const response = await requestJson<{ integrations: IntegrationRecord[] }>("/api/v1/sous-chef/integrations");
  return response.integrations;
}

export async function fetchRoutingDefaults(): Promise<RoutingDefault[]> {
  const response = await requestJson<{ formats: RoutingDefault[] }>("/api/v1/routing-defaults");
  return response.formats;
}

export async function saveRoutingDefault(format: FormatKey, channels: ScheduleChannel[]): Promise<void> {
  await requestJson<{ ok: true }>("/api/v1/routing-defaults", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, channels }),
  });
}

export async function triggerRender(draftId: string): Promise<{ id: string; status: "pending" }> {
  return requestJson<{ id: string; status: "pending" }>("/api/local/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId }),
  });
}

export async function pollRenderStatus(id: string): Promise<RenderStatusResponse> {
  return requestJson<RenderStatusResponse>(
    `/api/local/render/${encodeURIComponent(id)}/status` as `/api/${string}`,
  );
}

export async function revealOutputFolder(id: string): Promise<void> {
  await requestJson<{ ok: true }>("/api/local/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function triggerVideoRender(
  draftId: string,
  format: FormatKey,
): Promise<{ id: string; status: "pending" }> {
  return requestJson<{ id: string; status: "pending" }>("/api/local/render/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId, format }),
  });
}

export async function pollVideoRenderStatus(id: string): Promise<VideoRenderStatusResponse> {
  return requestJson<VideoRenderStatusResponse>(
    `/api/local/render/video/${encodeURIComponent(id)}/status` as `/api/${string}`,
  );
}

export async function schedulePost(request: ScheduleRequest): Promise<ScheduleResponse> {
  return requestJson<ScheduleResponse>("/api/local/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function fetchUserTemplates(): Promise<UserTemplate[]> {
  const response = await requestJson<{ templates: UserTemplate[] }>("/api/v1/templates");
  return response.templates;
}
