// src/lib/debug.ts
import fs from "node:fs";
import path from "node:path";

const RUNLOG_ROOT = process.env.RUNLOG_DIR || "triw-runlogs"; // 既存と合わせてOK
const ENABLE = (process.env.ENABLE_RUNLOG || "true").toLowerCase() !== "false";

function safeName(name: string) {
  return String(name).replace(/[^\w.\-]+/g, "_").slice(0, 80);
}

export function saveRaw(runId: string, name: string, payload: unknown) {
  if (!ENABLE) return;
  try {
    const dir = path.join(RUNLOG_ROOT, runId);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, safeName(name));
    // 型エラー回避のため name as any を許容（呼び出し側の指示どおり）
    fs.writeFileSync(file, typeof payload === "string" ? payload : JSON.stringify(payload, null, 2), "utf-8");
  } catch { /* 失敗しても処理は止めない */ }
}

export function saveJson(runId: string, name: string, obj: unknown) {
  saveRaw(runId, name, obj);
}
