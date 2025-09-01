import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.TRIW_RUNLOG_DIR || path.join(process.cwd(), ".triw-runlogs");

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

export type RunMeta = {
  runId: string;
  startedAt: string; // ISO
  title: string;
  description: string;
  djId: string;
  mode: "count" | "duration";
  count?: number;
  duration?: number;
};

export async function initRun(meta: RunMeta): Promise<void> {
  const dir = path.join(BASE, meta.runId);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
}

export async function saveRaw(runId: string, phase: "A" | "B" | "C", payload: unknown): Promise<void> {
  const dir = path.join(BASE, runId);
  await ensureDir(dir);
  const file = path.join(dir, `${phase}.json`);
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

export async function readRun(runId: string): Promise<{ meta: any; A: any; B: any; C: any }> {
  const dir = path.join(BASE, runId);

  const safeRead = async (name: string) => {
    try {
      const s = await fs.readFile(path.join(dir, name), "utf8");
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const [meta, A, B, C] = await Promise.all([
    safeRead("meta.json"),
    safeRead("A.json"),
    safeRead("B.json"),
    safeRead("C.json"),
  ]);

  return { meta, A, B, C };
}
