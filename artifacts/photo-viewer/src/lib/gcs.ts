// GCS storage helpers — talk to the api-server for signed URLs and deletes.
// The api-server is proxied at /api/* on the same domain (no prefix needed).

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/\/+$/, "") ?? "";

const BUCKET = "boosterpics2026";

/** Build the public GCS URL from an object path stored in the DB. */
export function gcsPublicUrl(objectPath: string): string {
  return `https://storage.googleapis.com/${BUCKET}/${objectPath}`;
}

/** True if storage_path came from GCS (starts with "pictureapp/"). */
export function isGcsPath(storagePath: string): boolean {
  return storagePath.startsWith("pictureapp/");
}

// ---------------------------------------------------------------------------
// Resize helpers
// ---------------------------------------------------------------------------

/**
 * Resize `file` so its longest edge is at most `maxWidth` pixels.
 * Output is always JPEG at 85% quality.
 * If the image is already smaller than `maxWidth`, it is returned at original size.
 */
export async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = objectUrl;
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SignResult {
  signedUrl: string;
  objectPath: string;
  publicUrl: string;
  error: null;
}

interface SignError {
  signedUrl: null;
  objectPath: null;
  publicUrl: null;
  error: string;
}

function isSignError(result: SignResult | SignError): result is SignError {
  return result.error !== null;
}

async function signUpload(
  filename: string,
  contentType: string,
  userTag: string,
  variant: "full" | "thumb" | "med",
  baseId: string
): Promise<SignResult | SignError> {
  const res = await fetch(`${API_BASE}/api/storage/sign-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, userTag, variant, baseId }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { signedUrl: null, objectPath: null, publicUrl: null, error: `Sign-upload failed: ${body}` };
  }

  const data = await res.json() as { signedUrl: string; objectPath: string; publicUrl: string };
  return { ...data, error: null };
}

async function putToGcs(signedUrl: string, body: File | Blob, contentType: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GCS PUT failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Public upload API — uploads three variants (full / thumb / med)
// ---------------------------------------------------------------------------

export interface UploadVariantsResult {
  fullPath: string;
  thumbPath: string;
  medPath: string;
  fullUrl: string;
  thumbUrl: string;
  medUrl: string;
  error: null;
}

export interface UploadVariantsError {
  fullPath: null;
  thumbPath: null;
  medPath: null;
  fullUrl: null;
  thumbUrl: null;
  medUrl: null;
  error: string;
}

/**
 * Upload a photo to GCS in three sizes:
 *   - full  (original, no resize)
 *   - thumb (≤400 px wide, JPEG)
 *   - med   (≤1200 px wide, JPEG)
 *
 * All three share the same base filename so they're easy to associate.
 * Returns the GCS object paths and public URLs for all three.
 */
export async function uploadPhotoVariants(
  file: File,
  userTag: string
): Promise<UploadVariantsResult | UploadVariantsError> {
  const err = (msg: string): UploadVariantsError => ({
    fullPath: null, thumbPath: null, medPath: null,
    fullUrl: null, thumbUrl: null, medUrl: null,
    error: msg,
  });

  try {
    // Shared ID so all three variants carry the same filename root
    const baseId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1. Resize to thumb + med in parallel (full stays as-is)
    const [thumbBlob, medBlob] = await Promise.all([
      resizeImage(file, 400),
      resizeImage(file, 1200),
    ]);

    // 2. Get three signed URLs in parallel
    const [fullSign, thumbSign, medSign] = await Promise.all([
      signUpload(file.name, file.type, userTag, "full", baseId),
      signUpload(file.name, "image/jpeg", userTag, "thumb", baseId),
      signUpload(file.name, "image/jpeg", userTag, "med", baseId),
    ]);

    if (isSignError(fullSign)) return err(fullSign.error);
    if (isSignError(thumbSign)) return err(thumbSign.error);
    if (isSignError(medSign)) return err(medSign.error);

    // 3. Upload all three to GCS in parallel
    await Promise.all([
      putToGcs(fullSign.signedUrl, file, file.type),
      putToGcs(thumbSign.signedUrl, thumbBlob, "image/jpeg"),
      putToGcs(medSign.signedUrl, medBlob, "image/jpeg"),
    ]);

    return {
      fullPath: fullSign.objectPath,
      thumbPath: thumbSign.objectPath,
      medPath: medSign.objectPath,
      fullUrl: fullSign.publicUrl,
      thumbUrl: thumbSign.publicUrl,
      medUrl: medSign.publicUrl,
      error: null,
    };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : "Upload failed");
  }
}

// ---------------------------------------------------------------------------
// Legacy single-file upload — kept for backward compatibility
// ---------------------------------------------------------------------------

/** @deprecated Use uploadPhotoVariants instead */
export async function uploadToGcs(
  file: File,
  userTag: string
): Promise<{ objectPath: string; publicUrl: string; error: null } | { objectPath: null; publicUrl: null; error: string }> {
  const baseId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sign = await signUpload(file.name, file.type, userTag, "full", baseId);
  if (isSignError(sign)) return { objectPath: null, publicUrl: null, error: sign.error };

  try {
    await putToGcs(sign.signedUrl, file, file.type);
  } catch (e: unknown) {
    return { objectPath: null, publicUrl: null, error: e instanceof Error ? e.message : "Upload failed" };
  }

  return { objectPath: sign.objectPath, publicUrl: sign.publicUrl, error: null };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

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
