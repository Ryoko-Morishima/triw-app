export type TuneCandidate = {
  title: string;
  artist: string;
};

export type TuneCandidatesResponse = {
  candidates: TuneCandidate[];
};

const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

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

async function requestJson(prompt: { system: string; user: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(`${OPENAI_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || "";
  return safeParseJson(text);
}

export async function runTuneCandidatesC(params: {
  persona: any;
  interpretation: any;
  targetCount: number;
}): Promise<TuneCandidatesResponse> {
  const { interpretation, targetCount } = params;

  // Spotify解決・評価で落ちる前提なので、必要数より多め。
  // ただし多すぎるとOpenAIもSpotify解決も遅くなるので最大16件に抑える。
  const outCount = Math.min(Math.max(targetCount * 2, 8), 16);

  const system = [
    "あなたはTRIWの軽量な一次選曲エンジンです。",
    "入力条件に合う実在曲の候補を出してください。",
    "Spotifyで検索しやすい正式な曲名とアーティスト名を使ってください。",
    "説明文は書かず、JSONのみを返してください。",
  ].join("\n");

  const user = `
# 入力条件

${interpretation?.rationale ?? ""}

# 条件の扱い方

- スライダーは選曲傾向として扱う
- 極端な値のスライダーほど強めに反映する
- ニュートラルに近いスライダーは弱く扱う
- キーワードは雰囲気・意味の方向性として扱う
- どれか1つの条件だけで全体を支配しない
- 条件が衝突する場合は、典型曲だけに逃げず、自然に両立する候補を探す

# スライダー条件

${interpretation?.soft_preferences_text ?? ""}

# 選曲ルール

${interpretation?.selection_rules ?? ""}

# 追加ルール

- 人気傾向が低い場合は、曲単位で現在よく聴かれている代表曲・大ヒット曲を避ける
- 人気傾向が低い場合でも、アーティストが有名かどうかだけでは除外しない
- 年代指定がある場合は、できるだけその時代感に合う曲を選ぶ
- 温度指定がある場合は、できるだけその温度感に合う曲を選ぶ
- 同一アーティストに偏らない
- 架空の曲名や曖昧な曲名は避ける

# 出力

ちょうど ${outCount} 件出してください。

JSONのみ：

{
  "candidates": [
    { "title": "曲名", "artist": "アーティスト名" }
  ]
}
`.trim();

  const json = await requestJson({ system, user });
  const items = Array.isArray(json?.candidates) ? json.candidates : [];

  const sanitized = items
    .filter((it: any) => it && it.title && it.artist)
    .map((it: any) => ({
      title: String(it.title).trim(),
      artist: String(it.artist).trim(),
    }))
    .filter((it: TuneCandidate) => it.title && it.artist);

  return { candidates: sanitized.slice(0, outCount) };
}