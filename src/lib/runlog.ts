// /src/lib/runlog.ts
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.TRIW_RUNLOG_DIR || path.join(process.cwd(), ".triw-runlogs");

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

// ====== 型（ざっくり。UIが使う最低限） ======
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

type UiDRow = {
  title: string;
  artist: string;
  uri?: string | null;
  release_year?: number | null;
  album_image_url?: string | null;
  preview_url?: string | null;
  found?: boolean;
};

type UiEAccepted = {
  title: string;
  artist: string;
  uri?: string | null;
  duration_ms?: number | null;
  reason?: string | null;
  order?: number;
};

type UiERejected = {
  title: string;
  artist: string;
  reason: string;
};

// ✅ 正準 UiLog 定義（1回だけ定義）。サブキー（"D2.audit" 等）も許容。
export type UiLog = {
  meta?: any;
  A?: any;
  B?: any;
  C?: any;
  D?: { matched?: UiDRow[]; notFound?: { title: string; artist: string }[] } | null;
  E?: {
    accepted?: UiEAccepted[];
    rejected?: UiERejected[];
    playlistUrl?: string | null;
  } | null;
  F?: any;
} & {
  [key: string]: any; // "D2.audit" などのサブキーを許容
};

// ====== 初期化（meta.json 作成） ======
export async function initRun(meta: RunMeta): Promise<void> {
  const dir = path.join(BASE, meta.runId);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
}

// ====== フェーズ保存（A〜F対応 / サブキーOK） ======
export async function saveRaw(
  runId: string,
  phase: string, // 例: "D", "E", "F" | サブキー "D2.audit" なども可
  payload: unknown
): Promise<void> {
  const dir = path.join(BASE, runId);
  await ensureDir(dir);
  const file = path.join(dir, `${phase}.json`);
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

// ====== 共通安全読み ======
async function safeRead(dir: string, name: string) {
  try {
    const s = await fs.readFile(path.join(dir, name), "utf8");
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ====== D/E を UI 期待形に正規化 ======
function normalizeD(rawD: any): UiLog["D"] {
  if (!rawD) return null;

  // 想定される形１：{ resolved: [...] , notFound: [...] }
  const resolved: any[] = Array.isArray(rawD?.resolved) ? rawD.resolved : [];
  const notFound: any[] = Array.isArray(rawD?.notFound) ? rawD.notFound : [];

  const matched: UiDRow[] = resolved.map((r: any) => {
    const sp = r?.spotify ?? {};
    const uri = sp.uri ?? sp.trackUri ?? null;
    const year =
      (typeof sp.release_year === "number" ? sp.release_year : null) ??
      (typeof r.year === "number" ? r.year : null) ??
      (typeof r.year_guess === "number" ? r.year_guess : null);

    return {
      title: String(r?.title ?? ""),
      artist: String(r?.artist ?? ""),
      uri,
      release_year: year,
      album_image_url: sp.album_image_url ?? null,
      preview_url: sp.preview_url ?? null,
      found: Boolean(uri),
    };
  });

  const notFoundUi =
    notFound.length > 0
      ? notFound.map((n: any) => ({
          title: String(n?.title ?? ""),
          artist: String(n?.artist ?? ""),
        }))
      : undefined;

  return { matched, notFound: notFoundUi };
}

function normalizeE(rawE: any): UiLog["E"] {
  if (!rawE) return null;

  // 想定される形１：{ playlistUrl, picked: [...], rejected?: [...] }
  const picked: any[] = Array.isArray(rawE?.picked) ? rawE.picked : [];
  const rejected: any[] = Array.isArray(rawE?.rejected) ? rawE.rejected : [];

  const accepted: UiEAccepted[] = picked.map((p: any, i: number) => ({
    title: String(p?.title ?? ""),
    artist: String(p?.artist ?? ""),
    uri: p?.uri ?? null,
    duration_ms: typeof p?.duration_ms === "number" ? p.duration_ms : null,
    reason: p?.reason ? String(p.reason) : null,
    order: typeof p?.order === "number" ? p.order : i + 1,
  }));

  const rej: UiERejected[] =
    rejected.length > 0
      ? rejected.map((r: any) => ({
          title: String(r?.title ?? ""),
          artist: String(r?.artist ?? ""),
          reason: String(r?.reason ?? ""),
        }))
      : [];

  return {
    accepted,
    rejected: rej.length ? rej : undefined,
    playlistUrl: rawE?.playlistUrl ?? null,
  };
}

// ====== UI向け：IDでRunLogを取得（正規化済） ======
export async function getRunLogById(runId: string): Promise<UiLog> {
  const dir = path.join(BASE, runId);

  const [meta, A, B, C, Draw, Eraw, F] = await Promise.all([
    safeRead(dir, "meta.json"),
    safeRead(dir, "A.json"),
    safeRead(dir, "B.json"),
    safeRead(dir, "C.json"),
    safeRead(dir, "D.json"),
    safeRead(dir, "E.json"),
    safeRead(dir, "F.json"),
  ]);

  const D = normalizeD(Draw);
  const E = normalizeE(Eraw);

  // サブキー（例: "D2.audit.json"）は必要ならここで拾い足せる
  // const D2audit = await safeRead(dir, "D2.audit.json");

  return { meta, A, B, C, D, E, F };
}

/**
 * 一覧取得：全 runId をキーにしたマップを返す
 * `/app/mixtape/log/route.ts` の呼び出し（getLogs()→allLogs[runId]）と整合させるため。
 */
export async function getLogs(): Promise<Record<string, UiLog>> {
  await ensureDir(BASE);
  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(BASE, { withFileTypes: true as any });
    entries = dirents
      .filter((d: any) => d?.isDirectory?.())
      .map((d: any) => d.name);
  } catch {
    // BASE がない等
    return {};
  }

  const out: Record<string, UiLog> = {};
  for (const runId of entries) {
    try {
      out[runId] = await getRunLogById(runId);
    } catch {
      // 壊れたログはスキップ
    }
  }
  return out;
}
