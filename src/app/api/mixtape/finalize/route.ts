import { NextRequest, NextResponse } from "next/server";
import { finalizeSetlist } from "@/lib/finalize";
import type { Evaluated } from "@/lib/evaluate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const picked: Evaluated[] = Array.isArray(body?.picked) ? body.picked : [];
    if (picked.length === 0) {
      return NextResponse.json({ error: "picked が空です（Eフェーズの出力を渡してください）" }, { status: 400 });
    }

    // 30分想定（好きな分数を渡せます：body.targetDurationMin）
    const targetMin = Number(body?.targetDurationMin ?? 30);

    const F = await finalizeSetlist(picked, {
      mode: "duration",               // ← 分数指定で整形
      targetDurationMin: targetMin,   // ← ここで何分でも指定OK（既定30）
      artistPolicy: "auto",           // ← タイトル/概要から特集を自動判定
      programTitle: body?.title ?? "",
      programOverview: body?.overview ?? "",
      interleaveRoles: true,
      shortReason: true,
      // maxPerArtist: 2,             // 通常回での被り上限（必要なら調整）
    });

    return NextResponse.json(F);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
