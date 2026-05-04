import { buildSelectionPrompt } from "./buildSelectionPrompt";

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

// Spotify解決・評価で一定数落ちる前提なので、必要数より多めに候補を出す。
// 人気フィルタなどで落ちても十分な件数が残るようにする。
// ただし多すぎるとOpenAIやSpotify解決が遅くなるため、最大24件に抑える。
const outCount = Math.min(Math.max(targetCount * 3, 12), 24);

  const prompt = buildSelectionPrompt({ interpretation, outCount });
  console.log("[tune] prompt.system\n", prompt.system);
  console.log("[tune] prompt.user\n", prompt.user);

  const json = await requestJson(prompt);

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