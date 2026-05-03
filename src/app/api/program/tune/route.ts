// src/app/api/program/tune/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount } from "@/lib/openai";
import { runTuneCandidatesC } from "@/lib/triw/selection/generateTuneCandidates";
import { resolveCandidatesD } from "@/lib/resolve";
import { finalizeSetlist } from "@/lib/finalize";
import { buildEvents } from "@/lib/triw/program/buildEvents";
import { evaluateTuneTracks } from "@/lib/triw/program/evaluateTuneTracks";

const keywordLabels: Record<string, string> = {
  rain: "雨",
  summer: "夏",
  night: "夜",
  party: "パーティ",
  drive: "ドライブ",
  alt: "オルタナ",
  world: "ワールド",
  tea: "お茶会",
  happy: "ハッピー",
  gothic: "ゴシック",
  pops: "ポップス",
};

function getSliderLevel(value: number) {
  if (value < 20) return 1;
  if (value < 40) return 2;
  if (value < 60) return 3;
  if (value < 80) return 4;
  return 5;
}

function getEraText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "古い曲：かなり古めの時代感を優先する";
  }
  if (level === 2) {
    return "やや古い曲：少し懐かしさのある曲を優先する";
  }
  if (level === 3) {
    return "ニュートラル：年代は特に指定しない";
  }
  if (level === 4) {
    return "やや新しい曲：比較的新しい時代感を優先する";
  }

  return "新しい曲：現在に近い新しめの曲を優先する";
}

function getTemperatureText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "クール：無機的でクール、感情が抑制され、都会的で距離感のあるサウンド";
  }
  if (level === 2) {
    return "ややクール：ややクール寄りで、落ち着きと洗練を感じるサウンド";
  }
  if (level === 3) {
    return "ニュートラル：温度感については特に指定しない";
  }
  if (level === 4) {
    return "ややホット：やや感情があり、生命感や身体性を感じるサウンド";
  }

  return "ホット：感情にあふれ、生命感と身体性が強く、人間的で野性的なエネルギーを感じる曲";
}

function getPopularityText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "深掘り:Spotify上で現在よく聴かれている大ヒット曲・超定番曲・代表曲を避け、テーマに合うが少し意外性のある曲、同ジャンル内の二番手・三番手の曲、アルバム曲寄りの曲を優先する";
  }
  if (level === 2) {
    return "やや深掘り：現在よく聴かれている大定番曲を少し避け、少し掘った曲を優先する";
  }
  if (level === 3) {
    return "ニュートラル：人気傾向は特に指定しない";
  }
  if (level === 4) {
    return "やや人気：Spotify上で比較的よく聴かれている曲を優先する";
  }

  return "いま人気：Spotify上で現在よく聴かれている曲を優先する";
}

function buildDescription(input: any) {
  const labels = (input.keywords ?? [])
    .map((id: string) => keywordLabels[id] ?? id)
    .join("、");

  return [
    `キーワード: ${labels || "なし"}`,
    `年代: ${input.era ?? 50} / ${getEraText(Number(input.era ?? 50))}`,
    `温度: ${input.temperature ?? 50} / ${getTemperatureText(Number(input.temperature ?? 50))}`,
    `人気傾向: ${input.popularity ?? 50} / ${getPopularityText(Number(input.popularity ?? 50))}`,
    `トーク: ${input.talkEnabled ? "あり" : "なし"}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();

    const {
      keywords = [],
      era = 50,
      temperature = 50,
      popularity = 50,
      talkEnabled = true,
      mode = "count",
      count = 5,
      duration,
    } = input ?? {};

    const runId = `tune_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const title = "TRIW チューニング番組";

    const description = buildDescription({
      keywords,
      era,
      temperature,
      popularity,
      talkEnabled,
    });

    const targetCount = estimateTargetCount(mode, count, duration);

    const persona = {
      id: "tune",
      name: "TRIW Tune",
      description: "カードとスライダー入力に基づいて選曲する軽量モード。",
      profile: "",
    };

    const interpretation = {
      direction_note:
        "DJ人格ではなく、カード・年代・温度・有名度を主な条件として選曲する。",
      rationale: description,
      flow_style_paragraph:
        "入力条件に合う曲を、なるべく重複せず、Spotifyで解決しやすい形で選ぶ。",
      hard_constraints_text:
        "候補は実在する曲名とアーティスト名で出す。架空の曲や曖昧な曲名は避ける。",
      soft_preferences_text: [
        `年代: ${getEraText(Number(era))}`,
        `温度: ${getTemperatureText(Number(temperature))}`,
        `人気傾向: ${getPopularityText(Number(popularity))}`,
      ].join("\n"),
      selection_rules: [
        "候補は実在する曲名とアーティスト名で出す。",
        "キーワードの雰囲気を強く反映する。",
        "年代スライダーがニュートラルの場合、年代は選曲条件にしない。",
        "年代スライダーが左寄りの場合は古い曲、右寄りの場合は新しい曲を優先する。",
        "人気傾向スライダーがニュートラルの場合、Spotify上の人気傾向は選曲条件にしない。",
        "人気傾向が低い場合は、誰もが知っている代表曲リストを作らない。",
        "人気傾向が低い場合は、有名アーティストを使う場合でも代表曲ではなく、Spotify上の人気度が比較的低い曲を選ぶ。",
        "人気傾向が低い場合は、候補全体のSpotify人気度が高くなりすぎないように、最初から控えめな人気の曲を多めに出す。",        "人気傾向が高い場合は、Spotify上で現在よく聴かれている曲を優先する。",
        "温度指定は強く反映する。",
        "温度がニュートラルの場合、温度感は選曲条件にしない。",
        "ホット指定では、感情量・生命感・身体性・野性的なエネルギーのある曲を優先する。",
        "クール指定では、無機的・都会的・抑制された曲を優先する。",
      ].join("\n"),
    };
const t0 = Date.now();

// C: 候補生成
const C = await runTuneCandidatesC({
  persona,
  interpretation,
  targetCount,
});
const t1 = Date.now();
console.log("[tune] C candidates", t1 - t0, "ms");

// D: Spotify解決
const D = await resolveCandidatesD(C?.candidates ?? []);
const t2 = Date.now();
console.log("[tune] D spotify resolve", t2 - t1, "ms");

// E: 軽量評価
const evaluated = evaluateTuneTracks(D?.resolved ?? [], {
  popularity: Number(popularity),
});
const t3 = Date.now();
console.log("[tune] E evaluate", t3 - t2, "ms");

// F: 最終整形
const F = await finalizeSetlist(
  evaluated.picked.map((t: any) => ({
    title: t.title,
    artist: t.artist,
    uri: t.uri,
    reason: t.reason ?? "チューニング条件に一致",
    accepted: t.accepted ?? true,
    confidence: t.confidence ?? 1,
    debug: t.debug,
  })),
  {
    mode,
    ...(mode === "duration"
      ? { targetDurationMin: Number(duration || 30), maxTracksHardCap: 30 }
      : { maxTracks: Number(count || 5) }),
    artistPolicy: "auto",
    programTitle: title,
    programOverview: description,
    interleaveRoles: false,
    shortReason: true,
  }
);
const t4 = Date.now();
console.log("[tune] F finalize", t4 - t3, "ms");

console.log("[tune] total", t4 - t0, "ms");

    const events = buildEvents(F as any);

    return NextResponse.json({
      runId,
      input,
      description,
      C,
      D,
      E: evaluated,
      F,
      events,
    });
  } catch (e: any) {
    console.error("/api/program/tune error:", e);

    return NextResponse.json(
      {
        error: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}