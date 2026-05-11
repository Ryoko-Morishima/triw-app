// src/lib/triw/input/cards/keywordCards.ts

export type KeywordCardCategory =
  | "season"
  | "time"
  | "weather"
  | "place"
  | "action"
  | "emotion"
  | "culture"
  | "texture";

export type KeywordCardDefinition = {
  id: string;
  label: string;
  category: KeywordCardCategory;
  promptText: string;
  memo?: string;
};

export const keywordCards: Record<string, KeywordCardDefinition> = {
  alternative: {
    id: "alternative",
    label: "オルタナ",
    category: "culture",
    promptText:
      "オルタナは、主流から少し外れた感覚、ひねりのあるメロディ、歪み、内省、インディー／ポストパンク／シューゲイズ的な質感として扱う。",
  },

  mainstream: {
    id: "mainstream",
    label: "王道性",
    category: "culture",
    promptText:
      "王道性は、多くの人に開かれたメロディ、洗練された構成、強いフック、広く共有される感情、大衆性として扱う。単なる現在の人気ではなく、『みんなが自然に受け入れやすい感覚』を重視する。",
  },

  world: {
    id: "world",
    label: "非英米中心",
    category: "culture",
    promptText:
      "非英米中心は、英米ポップス中心の感覚から少し離れた文化圏、言語感覚、リズム、土着性、地域ごとの空気感として扱う。特定ジャンル名だけでなく、多言語性や地域固有のグルーヴ、楽器感、空気感も重視する。選曲が英語圏・英米圏のアーティストだけに偏らないことを意識する。",
  },

  lofi: {
    id: "lofi",
    label: "ローファイ",
    category: "texture",
    promptText:
      "ローファイは、ざらつき、手触り、録音の粗さ、親密さ、過度に磨かれていない質感として扱う。",
  },

  floating: {
    id: "floating",
    label: "浮遊感",
    category: "texture",
    promptText:
      "浮遊感は、重力が薄い感じ、ぼんやりした輪郭、夢の中のような距離感、空間的な広がりとして扱う。",
  },

  electronic: {
    id: "electronic",
    label: "電子音",
    category: "texture",
    promptText:
      "電子音感は、シンセサイザー、打ち込み、無機的な反復、人工的な質感、機械的なビートとして扱う。",
  },

  "jazz-like": {
    id: "jazz-like",
    label: "ジャズ感",
    category: "texture",
    promptText:
      "ジャズ感は、コードの複雑さ、演奏の揺らぎ、夜の空気、即興感、落ち着いたグルーヴ、演奏者同士の会話感として扱う。",
  },

  loneliness: {
    id: "loneliness",
    label: "孤独",
    category: "emotion",
    promptText:
      "孤独は、悲しみだけでなく、ひとりでいる自由、距離感、静かな集中、自分だけの時間として扱う。",
  },

  happiness: {
    id: "happiness",
    label: "多幸感",
    category: "emotion",
    promptText:
      "多幸感は、祝祭感、軽さ、身体が浮く感じ、明るい高揚、理由のないうれしさとして扱う。",
  },

  bittersweet: {
    id: "bittersweet",
    label: "切なさ",
    category: "emotion",
    promptText:
      "切なさは、甘さと寂しさが混ざった感情、過ぎていく時間、思い出、少しだけ胸が痛む感じとして扱う。",
  },

  escape: {
    id: "escape",
    label: "逃避",
    category: "emotion",
    promptText:
      "逃避は、日常から離れたい気分、どこかへ行きたい衝動、現実との距離、少し危うい自由として扱う。",
  },

  rain: {
    id: "rain",
    label: "雨",
    category: "weather",
    promptText:
      "雨は、湿度、反射する街灯、窓の外を眺める感覚、孤独、少し閉じた空気として扱う。曲名にRainや雨が入っている必要はない。",
  },

  summer: {
    id: "summer",
    label: "夏",
    category: "season",
    promptText:
      "夏は、強い光、湿気、夜風、開放感、少し浮ついた気分、終わりが近づく切なさとして扱う。",
  },

  winter: {
    id: "winter",
    label: "冬",
    category: "season",
    promptText:
      "冬は、冷たい空気、乾いた光、静けさ、距離感、内省、厚着した身体感覚として扱う。",
  },

  lateNight: {
    id: "lateNight",
    label: "深夜",
    category: "time",
    promptText:
      "深夜は、人の少なさ、静けさ、眠らない街、ひとりの時間、少し現実から離れた感覚として扱う。歌詞の内容だけでなく、音数の少なさ、空白、小さな音量でも成立する感じ、近い声、抑えたビート、過度に盛り上がらない曲調、ヘッドホンで聴く距離感を重視する。",
  },

  morning: {
    id: "morning",
    label: "朝",
    category: "time",
    promptText:
      "朝は、やわらかい光、空気の入れ替わり、静かな始まり、少しずつ世界が動き出す感じ、期待感や希望として扱う。曲名にmorningや朝が入っている必要はない。",
  },

  drive: {
    id: "drive",
    label: "ドライブ",
    category: "action",
    promptText:
      "ドライブは、移動感、車窓、流れる景色、速度感、ひとりの時間、目的地へ向かう高揚として扱う。車や道を直接歌った曲に限定しない。",
  },

  walk: {
    id: "walk",
    label: "散歩",
    category: "action",
    promptText:
      "散歩は、歩くテンポ、街の観察、寄り道、軽い内省、生活の中の移動として扱う。",
  },

  sleeping: {
    id: "sleeping",
    label: "微睡み",
    category: "action",
    promptText:
      "微睡みは、眠りを誘うようなゆったりとしたテンポ、刺激的でない音質、人の感情を過度にゆさぶらない感覚として扱う。",
  },
};

export function getKeywordCard(id: string): KeywordCardDefinition | null {
  return keywordCards[id] ?? null;
}

export function getKeywordPromptTexts(keywords: string[]): string[] {
  return keywords
    .map((keyword) => {
      const normalized = String(keyword).trim();

      const card =
        keywordCards[normalized] ??
        Object.values(keywordCards).find(
          (card) => card.id === normalized || card.label === normalized
        );

      if (!card) {
        console.warn("[keywordCards] unknown keyword:", normalized);
        return "";
      }

      return `「${card.label}」: ${card.promptText}`;
    })
    .filter(Boolean);
}