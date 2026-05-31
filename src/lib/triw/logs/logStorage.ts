// src/lib/triw/logs/logStorage.ts

import { saveLocalRunLog } from "./providers/localStorage";

console.log("[logStorage] loaded");

export async function saveLog(params: {
  runId: string;
  payload: any;
}) {
  const provider =
    process.env.RUNLOG_PROVIDER ?? "local";

  switch (provider) {
    case "local":
    default:
      return saveLocalRunLog(params);
  }
  

}