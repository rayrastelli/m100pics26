// GCS storage helpers — talk to the api-server for signed URLs and deletes.
// The api-server is mounted at /api-server on the same Replit domain.

const API_BASE = "/api-server";

const BUCKET = "boosterpics2026";

/** Build the public GCS URL from an object path stored in the DB. */
export function gcsPublicUrl(objectPath: string): string {
  return `https://storage.googleapis.com/${BUCKET}/${objectPath}`;
}

/** True if storage_path came from GCS (starts with "pictureapp/"). */
export function isGcsPath(storagePath: string): boolean {
  return storagePath.startsWith("pictureapp/");
}

/** Request a signed upload URL from the api-server, then PUT the file directly to GCS. */
export async function uploadToGcs(
  file: File,
  userTag: string
): Promise<{ objectPath: string; publicUrl: string; error: null } | { objectPath: null; publicUrl: null; error: string }> {
  // 1. Get signed URL
  const signRes = await fetch(`${API_BASE}/api/storage/sign-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, userTag }),
  });

  if (!signRes.ok) {
    const body = await signRes.text();
    return { objectPath: null, publicUrl: null, error: `Sign-upload failed: ${body}` };
  }

  const { signedUrl, objectPath, publicUrl } = await signRes.json() as {
    signedUrl: string;
    objectPath: string;
    publicUrl: string;
  };

  // 2. PUT file directly to GCS
  const putRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    return { objectPath: null, publicUrl: null, error: `GCS upload failed (${putRes.status}): ${body}` };
  }

  return { objectPath, publicUrl, error: null };
}

/** Delete a GCS object via the api-server. */
export async function deleteFromGcs(objectPath: string): Promise<{ error: string | null }> {
  const res = await fetch(`${API_BASE}/api/storage/object`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: `GCS delete failed (${res.status}): ${body}` };
  }

  return { error: null };
}
