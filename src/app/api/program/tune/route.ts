// src/app/api/program/tune/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount, runCandidatesC } from "@/lib/openai";
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
    return "有名じゃない曲：定番曲や大ヒット曲を避け、少し掘った曲を優先する";
  }
  if (level === 2) {
    return "やや有名じゃない曲：有名すぎる曲を避ける";
  }
  if (level === 3) {
    return "ニュートラル：有名度は特に指定しない";
  }
  if (level === 4) {
    return "ややヒット曲：ある程度知られている曲を優先する";
  }

  return "ヒット曲：有名曲・定番曲・広く知られている曲を優先する";
}

function buildDescription(input: any) {
  const labels = (input.keywords ?? [])
    .map((id: string) => keywordLabels[id] ?? id)
    .join("、");

  return [
    `キーワード: ${labels || "なし"}`,
    `年代: ${input.era ?? 50} / ${getEraText(Number(input.era ?? 50))}`,
    `温度: ${input.temperature ?? 50} / ${getTemperatureText(Number(input.temperature ?? 50))}`,
    `有名度: ${input.popularity ?? 50} / ${getPopularityText(Number(input.popularity ?? 50))}`,
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
        `有名度: ${getPopularityText(Number(popularity))}`,
      ].join("\n"),
      selection_rules: [
        "候補は実在する曲名とアーティスト名で出す。",
        "キーワードの雰囲気を強く反映する。",
        "年代スライダーがニュートラルの場合、年代は選曲条件にしない。",
        "年代スライダーが左寄りの場合は古い曲、右寄りの場合は新しい曲を優先する。",
        "有名度スライダーがニュートラルの場合、有名度は選曲条件にしない。",
        "有名度が低い場合は定番曲・大ヒット曲を避ける。",
        "有名度が高い場合はヒット曲・定番曲・広く知られた曲を優先する。",
        "温度指定は強く反映する。",
        "温度がニュートラルの場合、温度感は選曲条件にしない。",
        "ホット指定では、感情量・生命感・身体性・野性的なエネルギーのある曲を優先する。",
        "クール指定では、無機的・都会的・抑制された曲を優先する。",
      ].join("\n"),
    };

    // C: 候補生成
    const C = await runCandidatesC({
      persona,
      interpretation,
      targetCount,
    });

    // D: Spotify解決
    const D = await resolveCandidatesD(C?.candidates ?? []);

    // E: 軽量評価
    const evaluated = evaluateTuneTracks(D?.resolved ?? [], {
      popularity,
      // 年代は今後 era スライダー評価にする。
      // ここでは decade を渡さず、年代の厳格ゲートは使わない。
    });

    // F: 最終整形
    const F = await finalizeSetlist(
      evaluated.picked.map((t: any) => ({
        title: t.title,
        artist: t.artist,
        uri: t.uri,
        reason: t.reason ?? "チューニング条件に一致",
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