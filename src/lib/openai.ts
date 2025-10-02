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

  // ★ 自然文（エッセイ）
  dj_deep_thought: string;        // テーマの再解釈（言い換え禁止）
  dj_flow_idea: string;           // 並べ方の方針（固定点/橋渡しの手つき）
  paraphrase_warning?: boolean;   // 言い換えに寄った危険シグナル
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

  // ★ “狙い”メタ（外部表示しない想定）
  intended_role?: "anchor" | "deep" | "wildcard";
  popularity_hint?: "high" | "mid" | "low";
  notes_for_scoring?: string;
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
  return Math.min(20, Math.max(3, est)); // ← 20曲上限を追加
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


// ================== フェーズB直前：Interpretation（エッセイ強化） ==================
export async function runInterpretB(params: {
  persona: any; // PersonaA 相当（自由度確保のため any）
  title: string;
  description: string;
  mode: "count" | "duration";
  count?: number;
  duration?: number;
}): Promise<InterpretationB> {
  const { persona, title, description, mode, count, duration } = params;

  const system =
    `あなたは番組のDJ本人です。ペルソナAの人物として一人称で“考える”が、出力は中立JSONのみ。
以下を満たす：
- テーマとリクエスト文から「テーマ・シグナル」（3〜6語程度）を抽出（季節/場面/相手/感情/キーワード）
- そのテーマを自分なら“どう届けたいか”を素直な言葉で述べる（専門用語よりも平易な表現を優先）
- DJの美学とテーマ忠実度は**両立**させる（どちらかに従属させない）
- Flow/Narrative は「今回はこう並べる」という方針として簡潔に言語化
- 年代や言語などの強い限定は hard_constraints に落とす
- JSON以外は出力しない`;

  const target = mode === "count" ? `${count ?? 7}曲` : `${duration ?? 30}分（±10%）`;

  const user = `# 入力
- 目標: ${target}
- 番組: ${title} / ${description}
- ペルソナA（要約）: ${JSON.stringify(persona)}

# 出力JSONスキーマ
{
  "theme_direction": string,
  "hard_constraints": {
    "required_genres"?: string[],
    "exclude_genres"?: string[],
    "eras"?: { "min"?: number; "max"?: number } | null,
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

  "dj_deep_thought": "DJの声でテーマを再解釈（120〜240字）。タイトル/概要のどの言葉や情景を拾ったかを明記し、誰とどんな場面でどう響かせたいかを素直に書く。",
  "dj_flow_idea": "今回はこう並べる（100〜200字）。見せ場や落ち着きどころ、橋渡し（BPM/年代/質感/キーのどれか）を1つ以上含める。",
  "paraphrase_warning": boolean

  // 推奨（既存処理には影響しない）
  "theme_signals"?: string[],   // 例: ["みんなで歌う","夜の街","余韻","雪","乾いた空気"]
  "anti_examples"?: string[]    // 例: ["真夏のバカンス","祝祭性ゼロの無機質"]
  }

# 厳格ルール
- JSONのみを出力
- "dj_deep_thought"/"dj_flow_idea" は必須・空文字不可
- 言い換えっぽい場合は "paraphrase_warning": true
- 「90s/1990年代」等が明示なら eras を設定。曖昧なら null
- 「日本語だけ/○○限定」等は languages/regions に反映`;

  return (await requestJson({ system, user, schemaName: "InterpretationB" })) as InterpretationB;
}

// ================== フェーズB：DJが“直接”全曲セレクト ==================
export async function runCandidatesC(params: {
  persona: any;
  interpretation: InterpretationB;
  targetCount: number;
}): Promise<CandidatesCResponse> {
  const { persona, interpretation, targetCount } = params;
  const outCount = Math.min( Math.max(2, targetCount * 2), 24 ); // ← 24件に上限

  const system = `あなたはDJ本人として選曲します。候補ではなく“この回のための選曲”をちょうど${outCount}件出します。
各曲はペルソナの個性と解釈Bの『テーマ・シグナル』に結びついていること。reasonは中立＋少しのキャラ味（※一人称は使わない）。`;

  const user = `# 参照（あなた＝DJ本人）
- ペルソナA: ${JSON.stringify(persona)}
- 解釈B: ${JSON.stringify(interpretation)}
- 目標曲数: ${targetCount}

# 重要方針
- すべての曲で "whyThemeFit" に**どのテーマ・シグナルに接続しているか**を具体に書く
- 例：〈皆で歌う〉→サビの合唱フック／コール&レスポンス、〈冬〉→歌詞/タイトル/冷たい残響、〈友人と集う〉→明るいグルーヴ等
- どうしても外部文脈（例：リミックス／ライブ）で採る場合は "whyPersonaFit" に“再文脈化の理由”を明記。理由が乏しければ採用しない。
- 「名曲（錨）／掘り／ワイルドカード」を混ぜるが、**配分はエッセイの宣言に従う**（王道多め/発見多めなど）。
- 架空や誤綴は不可。不確かなら reason に但し書きを残し、後段で置換可能にする。
- "dj_flow_idea"（アンカー位置/橋渡し）に矛盾しない説明を "reason" か "whyThemeFit" に入れる（BPM/年代/質感/キーのどれか1つ以上）。

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

    "intended_role": "anchor"|"deep"|"wildcard",
    "popularity_hint": "high"|"mid"|"low",

    "notes_for_scoring"?: string
  }]
}

# 出力規律
- ちょうど ${outCount} 件。
- すべて "intended_role" と "popularity_hint" を付ける（説明用ラベル。評価スコアには使わない）。`;

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

      intended_role: (["anchor", "deep", "wildcard"] as const).includes(it.intended_role) ? it.intended_role : "deep",
      popularity_hint: (["high", "mid", "low"] as const).includes(it.popularity_hint) ? it.popularity_hint : "mid",
      notes_for_scoring: it.notes_for_scoring ? String(it.notes_for_scoring) : ""
    }));

  return { candidates: sanitized.slice(0, outCount) };
}

/** ========= 受け取りメモ ========= */
export async function runMemoNoteG({
  persona,
  title,
  description,
  vibeText,
  tracks,
}: {
  persona: { id?: string; name?: string; description?: string; profile?: string };
  title: string;
  description?: string;
  vibeText?: string;
  tracks: { title?: string; artist?: string }[];
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = OPENAI_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  // DJ名の決定（空文字もガード）
  const djName =
    ((persona?.name || persona?.id || "DJ") as string).toString().trim() || "DJ";

  const sample = tracks
    .slice(0, 8)
    .map((t, i) => `${i + 1}. ${t.title ?? "-"} / ${t.artist ?? "-"}`)
    .join("\n");

  const system = [
    "あなたは日本語のコピーライター兼DJです。",
    "MIXTAPEに同封する『受け取りメモ』を、温度感のある短い文章で作ります。",
    "句読点は素直に。比喩は少量。相手に渡す丁寧さを保つ。",
    // 本文では by を書かせず、最後の1行のみで締める（サニタイズでも保証）
    "本文には `by` を書かない。最後の1行のみ `by (DJ名)` として締める。",
  ].join("\n");

  const user = [
    `タイトル: ${title}`,
    description ? `リクエスト: ${description}` : null,
    persona?.description ? `DJの雰囲気: ${persona.description}` : null,
    vibeText ? `ミックス方針メモ: ${vibeText}` : null,
    "代表的な曲（抜粋）:\n" + sample,
    `DJ名: ${djName}`,
    "",
    "要件:",
    "- 3〜6行程度。",
    "- 1〜2行目でテーマの温度と使い所（時間帯/気分）をふわっと伝える。",
    "- 中盤で流れや音の質感を簡潔に。",
    "- 本文には `by` を書かない。最後の1行だけ `by (DJ名)` として締める。",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`${OPENAI_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  // フォールバック共通関数
  const fallback = () =>
    [
      `「${title}」をテーマにすてきな曲を選びました。`,
      description ? String(description) : "",
      "あなたに気に入ってもらえるといいな。",
      `by ${djName}`,
    ]
      .filter(Boolean)
      .join("\n");

  if (!res.ok) {
    // APIエラー時はフォールバック
    return fallback();
  }

  const data = await res.json().catch(() => ({} as any));
  const raw: string = (data?.choices?.[0]?.message?.content ?? "").toString();

  // --- ここからサニタイズ＆byline強制 ---
  const stripCodeFences = (s: string) => {
    let out = s.trim();
    if (/^```/.test(out) && /```$/.test(out)) {
      out = out.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
    }
    return out.trim();
  };

  const normalizeByline = (s: string, name: string) => {
    // 末尾空行を削除
    let out = s.replace(/\s+$/g, "");
    const lines = out.split(/\r?\n/);
    // 末尾の空行除去
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

    const bylineLastRe = /^\s*(?:—|–|-)?\s*by\s+.+\s*$/i;
    if (lines.length && bylineLastRe.test(lines[lines.length - 1])) {
      lines.pop(); // 既存の by 行を削除
    } else if (lines.length) {
      // 行末に " by XXX" がくっついている場合も除去
      lines[lines.length - 1] = (lines[lines.length - 1] ?? "").replace(
        /\s*(?:—|–|-)?\s*by\s+.+\s*$/i,
        ""
      );
    }

    // 最後に正規形で必ず付与
    lines.push(`by ${name}`);
    return lines.join("\n").trim();
  };

  let cleaned = stripCodeFences(raw);

  if (!cleaned) {
    // 念のためのフォールバック
    return fallback();
  }

  cleaned = normalizeByline(cleaned, djName);
  // --- ここまでサニタイズ＆byline強制 ---

  return cleaned;
}


// ================== フェーズD：AI 自己点検（新規） ==================
export type SelfAuditIssue = {
  index: number;
  title: string;
  artist: string;
  reason: string;
  action: "drop" | "keep" | "replace";
  replacement_hint?: string;
};

export type SelfAuditResult = {
  summary: string;
  issues: SelfAuditIssue[];
  revised?: { title: string; artist: string }[];
};

export async function runSelfAuditD(params: {
  persona: any;
  interpretation: InterpretationB;
  tracks: { title: string; artist: string; year_guess?: number | null }[];
}): Promise<SelfAuditResult> {
  const { persona, interpretation, tracks } = params;

  const system = `あなたはこの番組のDJ本人です。自分が作った選曲表を“自分の美学”で監査します。数値ではなく審美眼で判断し、必要なら差し替え方針を述べます。JSONのみ。`;

  const user = `# 参照
- ペルソナA: ${JSON.stringify(persona)}
- 解釈B: ${JSON.stringify(interpretation)}
- 現在の選曲: ${JSON.stringify(tracks)}

# やること
- 「このDJなら選ばない（ジャンル違い）」「解釈Bに反する」「禁則に触れる」曲を具体に指摘
- 1件ごとに action（drop/keep/replace）を決める。replaceなら置換のヒントを必ず書く
- 年代チェックはここでは行わない（別段階）。音楽的文脈・質感・言語違反を中心
- replacement_hint は「どのテーマ要素（signals）に接続し、どの質感/年代/言語で置くか」を短く具体に書く

# JSONスキーマ
{
  "summary": string,
  "issues": [{
    "index": number,
    "title": string,
    "artist": string,
    "reason": string,
    "action": "drop"|"keep"|"replace",
    "replacement_hint"?: string
  }],
  "revised"?: [{"title": string, "artist": string}]
}`;

  return (await requestJson({ system, user, schemaName: "SelfAuditResult" })) as SelfAuditResult;
}
