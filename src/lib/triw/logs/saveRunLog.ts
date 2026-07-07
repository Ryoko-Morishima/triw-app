// src/lib/triw/logs/saveRunLog.ts

import { saveLog } from "./logStorage";

type SaveRunLogInput = {
  runId: string;
  payload: any;
};

export async function saveRunLog({
  runId,
  payload,
}: SaveRunLogInput) {
  try {
    return await saveLog({
      runId,
      payload,
    });
  } catch (error: any) {
    console.error("[runlog] save failed:", error);

    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}