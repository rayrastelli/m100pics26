import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

const allowedCorsHosts = new Set([
  "white-finch-295716.hostingersite.com",
  "localhost",
  "127.0.0.1",
]);

const allowedCorsBaseDomains = ["beltonbandboosters.com", "beltonbandboosters.org"];

function isAllowedCorsHost(hostname: string): boolean {
  if (allowedCorsHosts.has(hostname)) {
    return true;
  }

  return allowedCorsBaseDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients/tools that do not send Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      try {
        const { hostname } = new URL(origin);
        if (isAllowedCorsHost(hostname)) {
          callback(null, true);
          return;
        }
      } catch {
        // Fall through to blocked response.
      }

      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
