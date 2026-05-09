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

  evening: {
    id: "evening",
    label: "夕方",
    category: "time",
    promptText:
      "夕方は、一日の終わり、斜めの光、帰り道、少し寂しい高揚、これから夜に向かう感じとして扱う。",
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

  highway: {
    id: "highway",
    label: "高速道路",
    category: "place",
    promptText:
      "高速道路は、夜の移動、一定の速度、遠くの灯り、逃避、目的地に向かう緊張感として扱う。",
  },

  seaside: {
    id: "seaside",
    label: "海沿い",
    category: "place",
    promptText:
      "海沿いは、開けた視界、風、水平線、潮の匂い、少し遠くへ来た感じとして扱う。",
  },

  room: {
    id: "room",
    label: "部屋",
    category: "place",
    promptText:
      "部屋は、室内の静けさ、個人的な時間、閉じた安心感、外の世界との距離として扱う。",
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

  alternative: {
    id: "alternative",
    label: "オルタナ",
    category: "culture",
    promptText:
      "オルタナは、主流から少し外れた感覚、ひねりのあるメロディ、歪み、内省、インディー／ポストパンク／シューゲイズ的な質感として扱う。",
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

  humidity: {
    id: "humidity",
    label: "湿度",
    category: "texture",
    promptText:
      "湿度は、音のにじみ、空気の重さ、肌にまとわりつく感じ、熱や雨の気配として扱う。",
  },
};

export function getKeywordPromptTexts(keywords: string[]): string[] {
  return keywords
    .map((keyword) => {
      const normalized = String(keyword).trim();

      const card =
        keywordCards[normalized] ??
        Object.values(keywordCards).find(
          (card) => card.label === normalized
        );

      if (!card) {
        console.warn("[keywordCards] unknown keyword:", normalized);
        return "";
      }

      return `「${card.label}」: ${card.promptText}`;
    })
    .filter(Boolean);
}