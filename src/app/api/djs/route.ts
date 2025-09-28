// src/app/api/djs/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";

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

  const profile =
    (typeof dj.profile === "string" && dj.profile.trim()) ||
    (typeof dj.tagline === "string" && dj.tagline.trim()) ||
    "";

  const description = dj.description || dj.desc || dj.summary || "";
  const shortName = dj.shortName || dj.short || name;
  const image = dj.image || dj.avatar || (id ? `/dj/${id}.png` : null);

  // ★ 後方互換: profile を tagline にも入れて返す（UIがtagline参照でも表示される）
  const tagline = profile || undefined;

  return { id, name, shortName, profile, tagline, description, image };
}

export async function GET() {
  const list = await loadDJList();
  const out = list.map(normalizeOne).filter((x) => x.id);
  return NextResponse.json({ djs: out }, { status: 200 });
}
