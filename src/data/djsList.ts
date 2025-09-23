// src/data/djsList.ts
// どんなエクスポート形でも、最終的に DJ_LIST を安定して取り出せる互換レイヤー

import * as DJs from "@/data/djs";

export const DJ_LIST: any[] =
  Array.isArray((DJs as any).DJ_PRESETS) ? (DJs as any).DJ_PRESETS :
  Array.isArray((DJs as any).DJ_PROFILES) ? (DJs as any).DJ_PROFILES :
  Array.isArray((DJs as any).default)     ? (DJs as any).default :
  Array.isArray((DJs as any).list)        ? (DJs as any).list :
  Array.isArray((DJs as any).djs)         ? (DJs as any).djs :
  [];

// 便利関数（route.ts からそのまま使えるように）
export function pickDj(djId: string): { id: string; name?: string; description?: string; profile?: string } {
  const dj: any = Array.isArray(DJ_LIST) ? DJ_LIST.find((d: any) => d.id === djId) : null;
  if (dj) {
    const name = dj.name || dj.displayName || dj.title || dj.shortName || dj.id;
    const desc = dj.description || dj.desc || dj.summary || "";
    const profile = dj.profile || dj.prompt || dj.notes || "";
    return { id: dj.id, name, description: desc, profile };
  }
  return { id: djId };
}
