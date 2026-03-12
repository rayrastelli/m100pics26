import { Router } from "express";
import { createHmac, createSign } from "node:crypto";

const router = Router();

const BUCKET_NAME = process.env["GCS_BUCKET_NAME"] ?? "boosterpics2026";
const BASE_FOLDER = "pictureapp";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id: string;
}

function getServiceAccount(): ServiceAccountKey {
  const keyJson = process.env["GCS_SERVICE_ACCOUNT_KEY"];
  if (!keyJson) throw new Error("GCS_SERVICE_ACCOUNT_KEY is not set");
  return JSON.parse(keyJson) as ServiceAccountKey;
}

// Build a GCS v4 signed URL for a PUT upload
async function buildSignedUploadUrl(
  objectPath: string,
  contentType: string,
  expiresInSeconds = 900 // 15 min
): Promise<string> {
  const sa = getServiceAccount();

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 8); // YYYYMMDD
  const requestTimestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z"; // YYYYMMDDTHHmmssZ

  const credentialScope = `${dateStamp}/auto/storage/goog4_request`;
  const credential = `${sa.client_email}/${credentialScope}`;

  const encodedPath = `/${objectPath.split("/").map(encodeURIComponent).join("/")}`;

  const headers = `content-type:${contentType}\nhost:storage.googleapis.com\n`;
  const signedHeaders = "content-type;host";

  const canonicalRequest = [
    "PUT",
    encodedPath,
    `X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=${encodeURIComponent(credential)}&X-Goog-Date=${requestTimestamp}&X-Goog-Expires=${expiresInSeconds}&X-Goog-SignedHeaders=${signedHeaders}`,
    headers,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const { createHash } = await import("node:crypto");
  const hashedCanonical = createHash("sha256").update(canonicalRequest).digest("hex");

  const stringToSign = [
    "GOOG4-RSA-SHA256",
    requestTimestamp,
    credentialScope,
    hashedCanonical,
  ].join("\n");

  const sign = createSign("RSA-SHA256");
  sign.update(stringToSign);
  sign.end();
  const signature = sign.sign(sa.private_key, "hex");

  const queryParams = new URLSearchParams({
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": credential,
    "X-Goog-Date": requestTimestamp,
    "X-Goog-Expires": String(expiresInSeconds),
    "X-Goog-SignedHeaders": signedHeaders,
    "X-Goog-Signature": signature,
  });

  return `https://storage.googleapis.com/${BUCKET_NAME}${encodedPath}?${queryParams.toString()}`;
}

// POST /api/storage/sign-upload
// Body: { filename, contentType, userTag }
// Returns: { signedUrl, objectPath, publicUrl }
// Client should PUT file bytes to signedUrl with Content-Type header set.
router.post("/storage/sign-upload", async (req, res) => {
  try {
    const { filename, contentType, userTag } = req.body as {
      filename?: string;
      contentType?: string;
      userTag?: string;
    };

    if (!filename || !contentType || !userTag) {
      res.status(400).json({ error: "filename, contentType and userTag are required" });
      return;
    }

    const ext = (filename.split(".").pop() ?? "jpg").toLowerCase();
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const objectPath = `${BASE_FOLDER}/${userTag}/${safeName}`;

    const signedUrl = await buildSignedUploadUrl(objectPath, contentType);
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;

    res.json({ signedUrl, objectPath, publicUrl });
  } catch (err: unknown) {
    console.error("[sign-upload]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Signing failed" });
  }
});

// DELETE /api/storage/object
// Body: { objectPath }
router.delete("/storage/object", async (req, res) => {
  try {
    const { objectPath } = req.body as { objectPath?: string };

    if (!objectPath) {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }

    if (!objectPath.startsWith(`${BASE_FOLDER}/`)) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }

    const sa = getServiceAccount();

    // Use Google's JSON API to delete the object with a service account Bearer token
    const tokenRes = await getAccessToken(sa);

    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const delRes = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodedPath}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenRes}` },
      }
    );

    if (!delRes.ok && delRes.status !== 404) {
      const body = await delRes.text();
      throw new Error(`GCS delete failed: ${delRes.status} ${body}`);
    }

    res.json({ success: true });
  } catch (err: unknown) {
    console.error("[delete-object]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Delete failed" });
  }
});

// Get a short-lived OAuth2 access token using the service account JWT
async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.read_write",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsigned = `${header}.${body}`;

  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(sa.private_key, "base64url");

  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(`Token error: ${tokenData.error ?? "unknown"}`);
  }
  return tokenData.access_token;
}

export default router;
