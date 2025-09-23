// src/lib/openai.ts
// --- Minimal JSON caller for OpenAI Chat Completions ---
// 環境変数: OPENAI_API_KEY / OPENAI_MODEL（例: gpt-4o-mini）

async function callOpenAIJSON(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a helpful assistant that always responds in pure JSON." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status} ${t}`.slice(0, 300));
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export type Arc = "intro" | "build" | "peak" | "cooldown" | "other";

export type PersonaA = {
  background: string;
  preferred_genres: string[];
  avoid_genres: string[];
  flow_habits: string[];
  persona_notes: string[];
};

export type InterpretationB = {
  theme_direction: string;
  hard_constraints: {
    required_genres?: string[];
    exclude_genres?: string[];
    eras?: { min?: number; max?: number } | null;
    regions?: string[];
    languages?: string[];
    other_musts?: string[];
  };
  soft_preferences: {
    mood?: string[];
    tempo_trend?: "rise" | "fall" | "wave" | "steady";
    preferred_eras?: string[];
    notes?: string[];
  };
  flow_style: Arc[];

  // ★ 追加：自然文強化
  dj_deep_thought: string;        // 番組テーマの再解釈（言い換え禁止）
  dj_flow_idea: string;           // 曲順・橋渡し・アンカー等の具体案
  paraphrase_warning?: boolean;   // 言い換え寄りなら true
};

export type CandidateC = {
  title: string;
  artist: string;
  album?: string | null;
  arc: Arc;
  reason: string;
  whyPersonaFit: string;
  whyThemeFit: string;
  year_guess?: number | null;

  // ★ 追加：C段階で“狙い”を明示（後段の popularity 実数と突合）
  intended_role?: "anchor" | "deep" | "wildcard"; // 名曲(錨)/掘り/意外枠の狙い
  popularity_hint?: "high" | "mid" | "low";       // 想定ヒット度のラベル
  notes_for_scoring?: string;                     // 後段のスコアリング用メモ（任意）
};
export type CandidatesCResponse = { candidates: CandidateC[] };

const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function requestJson(prompt: { system: string; user: string; schemaName: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch(`${OPENAI_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: `${prompt.user}\n\n# 出力フォーマット\n必ずJSONのみを出力。コードフェンスは不要。`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || "";
  return safeParseJson(text);
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {}
  }
  throw new Error("Failed to parse JSON from model response");
}

export function estimateTargetCount(mode: "count" | "duration", count?: number, duration?: number) {
  if (mode === "count") return Math.max(1, count ?? 7);
  const avg = 4; // min/track
  const est = Math.round(Math.max(10, (duration ?? 30)) / avg);
  return Math.max(3, est);
}

export async function runPersonaA({
  dj,
  title,
  description,
}: {
  dj: { id: string; name?: string; description?: string; profile?: string };
  title: string;
  description: string;
}) {
  const res = await callOpenAIJSON(`
あなたはラジオ番組の選曲DJのペルソナを定義するアシスタントです。
与えられたDJ情報（プリセット/カスタムのどちらでも）と番組情報を踏まえ、次のJSONで出力してください。
数値スコアは禁止。自然言語の短い段落と最小限の配列のみ。

【入力】
- DJ: ${dj.name ?? dj.id}
- DJの特徴: ${dj.description ?? ""}
- 番組タイトル: ${title}
- 番組概要: ${description}

【重要な方針】
- 「完全に避ける」ものと「基本は避けるが文脈次第で採用もあり」を分けてください。
- 例：「映画音楽が得意」なら、ロック/ポップも **映画音楽として機能するなら採用余地あり**。
- クリシェを避け、DJの個性がにじむ自然文にする。

【出力フォーマット（必ずJSONのみ）】
{
  "name": "…",
  "background": "経歴や志向（自然文100〜160字）",
  "likes": ["好むジャンルや質感", "…"],
  "hard_avoids": ["絶対に使わないジャンルや条件（放送不可/倫理NGなど）"],
  "soft_avoids": ["基本は避けるが文脈で許容し得るもの"],
  "flow_habits": "曲順や起伏の付け方（自然文60〜120字）",
  "voice_tone": "語り口・キャラ（自然文40〜80字）",
  "notes": "このDJがジャンルを文脈で使い分ける具体例（自然文80〜140字）"
}
※余計な説明や前置きは不要。必ず上記のJSONだけを返してください。
  `);

  // 後方互換
  if (res && typeof res === "object") {
    if (!Array.isArray(res.hard_avoids)) res.hard_avoids = [];
    if (!Array.isArray(res.soft_avoids)) res.soft_avoids = [];
    if (!Array.isArray((res as any).avoids)) (res as any).avoids = [...res.hard_avoids];
  }

  return res;
}

export async function runInterpretB(params: {
  persona: PersonaA;
  title: string;
  description: string;
  mode: "count" | "duration";
  count?: number;
  duration?: number;
}): Promise<InterpretationB> {
  const { persona, title, description, mode, count, duration } = params;

  // ★ system：自然文の深さを必須に
  const system =
    `あなたは番組のDJ本人です。ペルソナAの人物として一人称で“考える”が、出力は中立JSONのみ。
単なる番組概要の言い換えを禁止。以下を満たしてください：
- ペルソナAの「癖・習慣」を具体的に運用する
- 番組テーマを“自分ならこう捉える”という再解釈を自然文で提示する
- セットの起伏（曲順・橋渡し・アンカー配置）を具体例で示す
- 余談や前置き、コードフェンスは禁止。必ずJSONのみを返す`;

  const target = mode === "count" ? `${count ?? 7}曲` : `${duration ?? 30}分（±10%）`;

  // ★ user：自然文フィールドを必須
  const user = `# 入力
- 目標: ${target}
- 番組: ${title} / ${description}
- （あなた＝DJ本人の要約）ペルソナA: ${JSON.stringify(persona)}

# 出力JSONスキーマ
{
  "theme_direction": string,
  "hard_constraints": {
    "required_genres"?: string[],
    "exclude_genres"?: string[],
    "eras"?: { "min"?: number, "max"?: number } | null,
    "regions"?: string[],
    "languages"?: string[],
    "other_musts"?: string[]
  },
  "soft_preferences": {
    "mood"?: string[],
    "tempo_trend"?: "rise" | "fall" | "wave" | "steady",
    "preferred_eras"?: string[],
    "notes"?: string[]
  },
  "flow_style": ["intro"|"build"|"peak"|"cooldown"|"other"],

  // ★ 追加：自然文（必須）
  "dj_deep_thought": "番組テーマを自分の視点で再解釈する自然文（120〜240字）。概要の言い換えは禁止。具体的な音の狙い・対比・橋渡しの意図を含める。",
  "dj_flow_idea": "曲順の起伏・転換・アンカー配置・掘りの入れ方など“手つき”を自然文で（100〜200字）。以下の4要素を必ず含める：1)アンカー配置（例：2曲目に名曲の錨） 2)掘りブロック（例：3–4曲目で新鋭） 3)橋渡しの方法（BPM/年代/質感/キーのいずれか） 4)終盤の着地（例：アンビエントで余韻）。曲順の目安（○曲目）を最低1つ示す。",

  // ★ 監視用
  "paraphrase_warning": boolean
}

# 厳格ルール
- JSON以外の文字を一切出さない
- "dj_deep_thought" と "dj_flow_idea" は必須・空文字不可
- ただの言い換えになっていると判断したら "paraphrase_warning": true とする`;

  return (await requestJson({ system, user, schemaName: "InterpretationB" })) as InterpretationB;
}

export async function runCandidatesC(params: {
  persona: PersonaA;
  interpretation: InterpretationB;
  targetCount: number;
}): Promise<CandidatesCResponse> {
  const { persona, interpretation, targetCount } = params;
  const outCount = Math.max(2, targetCount * 2);

  const system = `あなたはDJ本人として選曲します。候補をちょうど${outCount}件。
reasonは中立＋少しだけキャラ味（※一人称は使わない）。`;

  const user = `# 参照（あなた＝DJ本人）
- ペルソナA: ${JSON.stringify(persona)}
- 解釈B: ${JSON.stringify(interpretation)}
- 目標曲数: ${targetCount}

# 重要方針
- 「名曲（錨）／掘り（新鋭・深掘り）／ワイルドカード」を意図的に混ぜる。
- 名曲（錨）は全体の 30〜50% 目安。掘りを中盤ブロックに配置。ワイルドカードは多くても 1〜2 枠。
- 「名曲／新鋭」の厳密判定は後段（Spotify popularity 実数）で行うため、ここでは“狙い”をラベルで明示する。
- 架空の曲やミススペルは避ける。不確かなら reason に但し書きを残し、後段で置換可能にする。
- Bの "dj_flow_idea"（アンカー位置・掘りブロック・橋渡し方法）に矛盾しない配置・説明にする。
- 各候補の "reason" または "whyThemeFit" に、橋渡しの方法（例：BPM 100→112、1982→2020の年代ブリッジ、質感の近似、キーの接続）を最低1つは明記。

# JSONスキーマ
{
  "candidates": [{
    "title": string,
    "artist": string,
    "album"?: string|null,
    "arc": "intro"|"build"|"peak"|"cooldown"|"other",
    "reason": string,
    "whyPersonaFit": string,
    "whyThemeFit": string,
    "year_guess"?: number|null,

    // ★ 追加：必須（後段の popularity 実数と突合するための“狙い”）
    "intended_role": "anchor"|"deep"|"wildcard",
    "popularity_hint": "high"|"mid"|"low",

    // ★ 任意：後段のスコアリング補助
    "notes_for_scoring"?: string
  }]
}

# 出力規律
- 候補はちょうど ${outCount} 件。
- "intended_role" と "popularity_hint" は全ての候補で必須。`;

  const json = await requestJson({ system, user, schemaName: "CandidatesC" });
  const items = Array.isArray((json as any)?.candidates) ? (json as any).candidates : [];

  const sanitized = items
    .filter((it: any) => it && it.title && it.artist)
    .map((it: any) => ({
      title: String(it.title),
      artist: String(it.artist),
      album: it.album ?? null,
      arc: (["intro", "build", "peak", "cooldown", "other"] as Arc[]).includes(it.arc) ? it.arc : "other",
      reason: String(it.reason ?? ""),
      whyPersonaFit: String(it.whyPersonaFit ?? ""),
      whyThemeFit: String(it.whyThemeFit ?? ""),
      year_guess: typeof it.year_guess === "number" ? it.year_guess : null,

      // ★ 追加項目（フォールバック安全）
      intended_role: (["anchor", "deep", "wildcard"] as const).includes(it.intended_role) ? it.intended_role : "deep",
      popularity_hint: (["high", "mid", "low"] as const).includes(it.popularity_hint) ? it.popularity_hint : "mid",
      notes_for_scoring: it.notes_for_scoring ? String(it.notes_for_scoring) : ""
    }));

  return { candidates: sanitized.slice(0, outCount) };
}
