// scripts/run-evaluate.ts
// usage:
//   npx tsx scripts/run-evaluate.ts --b ./path/to/B.json --d ./path/to/D.json --out ./path/to/E.json --gate on
//
// 何があっても candidates / resolved を「配列」に正規化してから evaluateTracks を呼ぶ安全版。
// B.json/D.json のよくある形（candidates, items, list, data.resolved など）を全対応。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// tsconfig の paths(@/xxx) を scripts でも解決
import "ts-node/register";
import "tsconfig-paths/register";

import { evaluateTracks } from "@/lib/evaluate";
import type { RunMeta } from "@/lib/runlog";
import type { CandidateC } from "@/lib/openai";

type AnyObj = Record<string, any>;

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

function isArray(x: any): x is any[] {
  return Array.isArray(x);
}

function isNonEmptyArray(x: any): x is any[] {
  return Array.isArray(x) && x.length > 0;
}

function deepPickArray(obj: AnyObj, keys: string[]): any[] | undefined {
  for (const k of keys) {
    if (isArray(obj?.[k])) return obj[k];
  }
  return undefined;
}

function deepGet(obj: AnyObj, pathStr: string): any {
  return pathStr.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function normalizeCandidates(b: any): CandidateC[] {
  // 1) そのまま配列
  if (isArray(b)) return b as CandidateC[];

  // 2) よくあるキーで直接
  const direct = deepPickArray(b, ["candidates", "items", "list", "tracks"]);
  if (direct) return direct as CandidateC[];

  // 3) data 配下
  const data1 = deepGet(b, "data.candidates");
  if (isArray(data1)) return data1 as CandidateC[];
  const data2 = deepGet(b, "data.items");
  if (isArray(data2)) return data2 as CandidateC[];

  // 4) B.json で { picked:[], rejected:[] } 形式だった場合は合体
  if (isArray(b?.picked) || isArray(b?.rejected)) {
    const merged = [...(b.picked ?? []), ...(b.rejected ?? [])];
    if (isArray(merged)) return merged as CandidateC[];
  }

  // 5) 候補が1件だけオブジェクトで入っている場合
  if (b && typeof b === "object" && b.title && b.artist) {
    return [b as CandidateC];
  }

  // 6) どうしても見つからないときは診断を吐いて落とす
  throw new Error(
    `B.jsonから candidates を配列として抽出できませんでした。\n` +
      `トップレベルのキー: ${Object.keys(b || {}).join(", ")}\n` +
      `期待: [ { title, artist, ... }, ... ] または { candidates: [...] } 等`
  );
}

function normalizeResolved(d: any): any[] {
  // 1) そのまま配列
  if (isArray(d)) return d;

  // 2) よくあるキー
  const direct = deepPickArray(d, ["resolved", "items", "list", "tracks"]);
  if (direct) return direct;

  // 3) data 配下
  const data1 = deepGet(d, "data.resolved");
  if (isArray(data1)) return data1;
  const data2 = deepGet(d, "data.items");
  if (isArray(data2)) return data2;

  // 4) D.json で { picked:[], rejected:[] } 形式なら両方マージ（通常は resolved のはずだけど保険）
  if (isArray(d?.picked) || isArray(d?.rejected)) {
    const merged = [...(d.picked ?? []), ...(d.rejected ?? [])];
    if (isArray(merged)) return merged;
  }

  throw new Error(
    `D.jsonから resolved を配列として抽出できませんでした。\n` +
      `トップレベルのキー: ${Object.keys(d || {}).join(", ")}\n` +
      `期待: [ { title, artist, spotify:{...} }, ... ] または { resolved: [...] } 等`
  );
}

(async () => {
  try {
    const bPath = arg("--b");
    const dPath = arg("--d");
    const outPath = arg("--out", "./E.json");
    const gateFlag = arg("--gate", "off"); // "on" | "off"

    if (!bPath || !dPath) {
      console.error(
        "Usage: npx tsx scripts/run-evaluate.ts --b B.json --d D.json [--out E.json] [--gate on|off]"
      );
      process.exit(1);
    }

    const bRaw = fs.readFileSync(path.resolve(bPath), "utf-8");
    const dRaw = fs.readFileSync(path.resolve(dPath), "utf-8");

    let b: any;
    let d: any;
    try {
      b = JSON.parse(bRaw);
    } catch (e) {
      throw new Error(`B.json を JSON.parse できませんでした: ${(e as Error).message}`);
    }
    try {
      d = JSON.parse(dRaw);
    } catch (e) {
      throw new Error(`D.json を JSON.parse できませんでした: ${(e as Error).message}`);
    }

    const candidates = normalizeCandidates(b);
    const resolved = normalizeResolved(d);

    // 簡易診断表示
    console.log(
      `[run-evaluate] candidates=${candidates.length}, resolved=${resolved.length}, year_gate=${gateFlag}`
    );

    const meta: RunMeta = {
      startedAt: new Date().toISOString(),
      phase: "E",
      note: "scripts/run-evaluate.ts",
    } as any;

    const { picked, rejected } = evaluateTracks(meta, candidates, resolved, {
      year_gate: gateFlag === "on",
    });

    const E = { picked, rejected };
    fs.writeFileSync(path.resolve(outPath), JSON.stringify(E, null, 2), "utf-8");

    console.log(`Wrote ${outPath}`);
    console.log(`picked=${picked.length}, rejected=${rejected.length}`);
  } catch (err: any) {
    console.error("\n[run-evaluate] ERROR:");
    console.error(err?.stack || err?.message || String(err));
    process.exit(1);
  }
})();
