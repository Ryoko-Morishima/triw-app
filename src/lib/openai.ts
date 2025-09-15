// --- Minimal JSON caller for OpenAI Chat Completions ---
// 環境変数: OPENAI_API_KEY / OPENAI_MODEL（例: gpt-4o-mini）
async function callOpenAIJSON(prompt) {
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
  // あなたの環境にある “JSONで返すOpenAI呼び出し関数” 名はそのままでOK
  // 例: callOpenAIJSON / callOpenAIJson / askJSON など
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

  // 後方互換: 旧コードが 'avoids' を読むかもしれないので残す
  if (res && typeof res === "object") {
    if (!Array.isArray(res.hard_avoids)) res.hard_avoids = [];
    if (!Array.isArray(res.soft_avoids)) res.soft_avoids = [];
    if (!Array.isArray(res.avoids)) res.avoids = [...res.hard_avoids];
  }

  return res;
}
// ←ここまで！入れ替え終わり

export async function runInterpretB(params: {
  persona: PersonaA;
  title: string;
  description: string;
  mode: "count" | "duration";
  count?: number;
  duration?: number;
}): Promise<InterpretationB> {
  const { persona, title, description, mode, count, duration } = params;
  const system =
    "あなたは番組のDJ本人です。ペルソナAの人物として一人称で思考しつつ、出力は中立JSONのみ。Hard/Softの線引きを明確に。";
  const target = mode === "count" ? `${count ?? 7}曲` : `${duration ?? 30}分（±10%は将来の調整対象）`;

  const user = `# 入力
- 目標: ${target}
- 番組: ${title} / ${description}
- （あなた＝DJ本人の要約）ペルソナA: ${JSON.stringify(persona)}

# JSONスキーマ
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
  "flow_style": ["intro"|"build"|"peak"|"cooldown"|"other"]
}`;

  return (await requestJson({ system, user, schemaName: "InterpretationB" })) as InterpretationB;
}

export async function runCandidatesC(params: {
  persona: PersonaA;
  interpretation: InterpretationB;
  targetCount: number;
}): Promise<CandidatesCResponse> {
  const { persona, interpretation, targetCount } = params;
  const outCount = Math.max(2, targetCount * 2);
  const system = `あなたはDJ本人として選曲します。候補をちょうど${outCount}件。reasonは中立＋少しだけキャラ味（※一人称は使わない）。`;

  const user = `# 参照（あなた＝DJ本人）
- ペルソナA: ${JSON.stringify(persona)}
- 解釈B: ${JSON.stringify(interpretation)}
- 目標曲数: ${targetCount}

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
    "year_guess"?: number|null
  }]
}`;

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
    }));

  return { candidates: sanitized.slice(0, outCount) };
}
