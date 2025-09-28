export const runtime = "nodejs";
import { NextResponse } from "next/server";

// route.ts にある実装を軽く流用（共有化してもOK）
async function loadDJList(): Promise<any[]> {
  try {
    const mod: any = await import("@/data/djs");
    const candidates = [mod.DJ_PRESETS, mod.DJ_PROFILES, mod.default, mod.list, mod.djs];
    for (const arr of candidates) if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

function normalizeOne(dj: any) {
  const id = dj.id || dj.slug || dj.key;
  const name = dj.name || dj.displayName || dj.title || dj.shortName || id;
  const description = dj.description || dj.desc || dj.summary || "";
  // 画像は data 側が持っていれば優先、無ければ /public/dj/<id>.png を想定
  const image = dj.image || dj.avatar || (id ? `/dj/${id}.png` : null);
  return { id, name, description, image };
}

export async function GET() {
  const list = await loadDJList();
  const out = list.map(normalizeOne).filter((x) => x.id);
  return NextResponse.json({ djs: out }, { status: 200 });
}
