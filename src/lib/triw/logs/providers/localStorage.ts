// src/lib/triw/logs/providers/localStorage.ts

import { mkdir, writeFile } from "fs/promises";
import path from "path";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function saveLocalRunLog(params: {
  runId: string;
  payload: any;
}) {
  const { runId, payload } = params;

  const logDir =
    process.env.TRIW_RUNLOG_DIR ??
    path.join(process.cwd(), "triw-runlogs");

  await mkdir(logDir, { recursive: true });

  const fileName = `${safeFileName(runId)}.json`;
  const filePath = path.join(logDir, fileName);

  const data = {
    savedAt: new Date().toISOString(),
    ...payload,
  };

  await writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  return {
    ok: true,
    filePath,
    fileName,
  };
}
console.log("[localStorage module] loaded");