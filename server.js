const path = require("node:path");
const express = require("express");
const { config: loadEnv } = require("dotenv");

loadEnv({ path: path.resolve(__dirname, ".env") });
loadEnv();

const apiAppModule = require("./artifacts/api-server/dist/app.cjs");
const apiApp = apiAppModule.default ?? apiAppModule;

const app = express();
const webRoot = path.resolve(__dirname, "dist");

app.use(apiApp);
app.use(express.static(webRoot));
app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(webRoot, "index.html"));
});

const port = Number(process.env.PORT || 8080);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
