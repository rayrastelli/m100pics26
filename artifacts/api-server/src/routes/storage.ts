import { Router } from "express";
import { Storage } from "@google-cloud/storage";

const router = Router();

const BUCKET_NAME = process.env["GCS_BUCKET_NAME"] ?? "boosterpics2026";
const BASE_FOLDER = "pictureapp";

function getStorage(): Storage {
  const keyJson = process.env["GCS_SERVICE_ACCOUNT_KEY"];
  if (!keyJson) throw new Error("GCS_SERVICE_ACCOUNT_KEY is not set");
  return new Storage({ credentials: JSON.parse(keyJson) });
}

// POST /api/storage/sign-upload
// Body: { filename, contentType, userTag }
// Returns: { signedUrl, objectPath, publicUrl }
// The client should PUT the file bytes directly to signedUrl.
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

    const [signedUrl] = await getStorage()
      .bucket(BUCKET_NAME)
      .file(objectPath)
      .generateSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 min
        contentType,
      });

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

    // Safety: only allow deleting within our base folder
    if (!objectPath.startsWith(`${BASE_FOLDER}/`)) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }

    await getStorage()
      .bucket(BUCKET_NAME)
      .file(objectPath)
      .delete({ ignoreNotFound: true });

    res.json({ success: true });
  } catch (err: unknown) {
    console.error("[delete-object]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Delete failed" });
  }
});

export default router;
