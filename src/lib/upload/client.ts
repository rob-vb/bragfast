export async function uploadFile(file: File): Promise<string> {
  const presignRes = await fetch("/api/v1/upload/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
    }),
  });
  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get upload URL");
  }
  const { upload_id, upload_url, public_url } = await presignRes.json();

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }

  const completeRes = await fetch(`/api/v1/upload/${upload_id}/complete`, {
    method: "POST",
  });
  if (!completeRes.ok) {
    const data = await completeRes.json().catch(() => ({}));
    throw new Error(data.error || "Failed to complete upload");
  }

  return public_url;
}
