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

export async function runPersonaA(params: {
  dj: { id: string; name?: string; description?: string; profile?: string };
  title: string;
  description: string;
}): Promise<PersonaA> {
  const { dj, title, description } = params;
  const system =
    "あなたはラジオ番組の選曲ディレクター。与えられたDJの素性をもとに、背景・好むジャンル・避けるジャンル・流れの癖・キャラメモを日本語で簡潔に要約し、JSONで出力します。";

  const user = `# DJ基本情報
- id: ${dj.id}
- name: ${dj.name || dj.id}
- description: ${dj.description || ""}
- profile_notes: ${dj.profile || ""}

# 番組テーマ（参照のみ）
- title: ${title}
- description: ${description}

# JSONスキーマ
{
  "background": string,
  "preferred_genres": string[],
  "avoid_genres": string[],
  "flow_habits": string[],
  "persona_notes": string[]
}`;

  return (await requestJson({ system, user, schemaName: "PersonaA" })) as PersonaA;
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
