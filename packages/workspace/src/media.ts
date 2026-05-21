export interface LocalMediaUpload {
  id: string;
  url: string;
}

export async function uploadLocalMedia(file: File): Promise<LocalMediaUpload> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/local/media", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`/api/local/media failed (${response.status})`);
  }

  return (await response.json()) as LocalMediaUpload;
}
