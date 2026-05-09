// src/app/api/program/tune/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount } from "@/lib/openai";
import { runTuneCandidatesC } from "@/lib/triw/selection/generateTuneCandidates";
import { resolveCandidatesD } from "@/lib/resolve";
import { finalizeSetlist } from "@/lib/finalize";
import { buildEvents } from "@/lib/triw/program/buildEvents";
import { evaluateTuneTracks } from "@/lib/triw/program/evaluateTuneTracks";
import { buildDescription, getEraText, getPopularityText, getTemperatureText } from "@/lib/triw/program/buildTuneDescription";
import { getKeywordPromptTexts } from "@/lib/triw/input/cards/keywordCards";

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

    const keywordPromptText = getKeywordPromptTexts(keywords).join("\n");

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
      rationale: [description, keywordPromptText].filter(Boolean).join("\n\n"),
      keyword_prompt_text: keywordPromptText,
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
  keywordPromptText
    ? `選択されたキーワードの解釈:\n${keywordPromptText}`
    : "",
  "候補は実在する曲名とアーティスト名で出す。",
  "Spotifyで検索しやすい正式な曲名とアーティスト名を使う。",
  "季節・場面・時間帯系などのキーワードに対して、単語そのものが曲名に入っている必要はない。曲名一致だけを理由に選ばず、カードごとの解釈文に基づいて、雰囲気・場面・季節感・身体感覚・音像とのつながりを重視する。歌詞やテーマ、曲調などを考慮して選曲する",
  "複数のキーワードがある場合は、それぞれを独立に満たすのではなく、複数条件が同時に成立している曲を優先する。",
  "年代スライダーがニュートラルの場合、年代は選曲条件にしない。",
  "年代スライダーが左寄りの場合は古い曲、右寄りの場合は新しい曲を優先する。",
  "人気傾向スライダーがニュートラルの場合、Spotify上の人気傾向は選曲条件にしない。",
  "人気傾向が低い場合は、誰もが知っている代表曲リストを作らない。",
  "人気傾向が低い場合は、無名曲ではなく、テーマに合う少し深い曲・代表曲以外の有名アーティスト曲・同ジャンル内の二番手三番手の曲を優先する。",
  "人気傾向が低い場合でも、Spotifyで検索しにくい極端にマイナーな曲や曖昧な曲名は避ける。",
  "人気傾向が高い場合は、一般的にそのアーティストの代表曲・最大ヒット曲として知られている曲や、ヒット曲を優先する。",
  "温度がニュートラルの場合、温度感は選曲条件にしない。",
  "ホット指定では、感情量・生命感・身体性・野性的なエネルギーのある曲を優先する。",
  "クール指定では、無機的・都会的・抑制された曲を優先する。",
  "複数条件がある場合は、キーワードを土台にし、年代・温度・人気傾向は味付けとして反映する。",
].filter(Boolean).join("\n"),
    };
console.log("[interpretation]", interpretation);

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