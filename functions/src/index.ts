import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { initializeApp, getApps } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { app } from "./app";

if (!getApps().length) {
  initializeApp();
}

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const api = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: true,
    invoker: "public",
  },
  app
);
