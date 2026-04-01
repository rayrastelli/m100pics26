import app from "./app";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load env from repo root for local development, then fallback to default resolution.
loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv();

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
