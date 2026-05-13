import { mkdir, writeFile } from "fs/promises";
import path from "path";

type SaveRunLogInput = {
  runId: string;
  payload: any;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function saveRunLog({ runId, payload }: SaveRunLogInput) {
  try {
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

    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    return {
      ok: true,
      filePath,
      fileName,
    };
  } catch (error: any) {
    console.error("[runlog] save failed:", error);

    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}