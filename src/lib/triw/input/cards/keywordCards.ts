// src/lib/triw/input/cards/keywordCards.ts
export type KeywordCardCategory =
  | "culture"
  | "texture"
  | "emotion"
  | "scene"
  | "taste";

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
    label: "ポップ",
    category: "culture",
    promptText:
      "ポップは、多くの人に開かれたメロディ、洗練された構成、強いフック、広く共有される感情、大衆性として扱う。単なる現在の人気ではなく、『みんなが自然に受け入れやすい感覚』を重視する。",
  },

  world: {
    id: "world",
    label: "ローカルグルーヴ",
    category: "culture",
    promptText:
      "world は、英語圏中心ではない、多言語・非英語圏の地域シーンとして扱う。ラテン、アフリカ、中東、東欧、インド、東南アジアなども含め、地域ごとのリズム感覚、言語感覚、土着性、街の空気感を重視する。英語の曲だけに偏らず、可能であれば英語以外の言語の曲を優先する。",
  },

  asia: {
    id: "asia",
    label: "アジア都市圏",
    category: "culture",
    promptText:
      "asia が選択されている場合、選曲の大半を東アジア圏アーティストで構成する。K-pop、J-pop、歌謡曲、トロット、シティポップ、インディー、R&Bなどを含み、地域ごとのメロディ感覚、都市性、娯楽性、時代感を重視する。",
  },

  lofi: {
    id: "lofi",
    label: "ローファイ",
    category: "texture",
    promptText:
      "ローファイは、ざらつき、手触り、録音の粗さ、親密さ、過度に磨かれていない質感として扱う。",
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

  heavy: {
    id: "heavy",
    label: "ヘヴィ",
    category: "texture",
    promptText:
      "ヘヴィは、重量感、低音、密度、圧迫感、遅さ、身体に響く感覚として扱う。ジャンルに限定せず、音の厚み、存在感、重たい空気感を重視する。",
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
      "多幸感は、素直な明るさ、開放感、笑顔、軽やかさ、人と一緒にいる楽しさとして扱う。過度に幻想的な高揚ではなく、晴れた昼やポップソングのような親しみやすい幸福感を重視する。",
  },

  bittersweet: {
    id: "bittersweet",
    label: "切なさ",
    category: "emotion",
    promptText:
      "切なさは、甘さと寂しさが混ざった感情、過ぎていく時間、思い出、少しだけ胸が痛む感じとして扱う。",
  },

  riot: {
    id: "riot",
    label: "暴発",
    category: "emotion",
    promptText:
      "暴発は、衝動、反抗、若さ、制御しきれないエネルギー、雑さ、ライブ感、感情が一気に噴き出す瞬間として扱う。荒さや勢いを恐れず、身体性や熱量を重視する。",
  },

  euphoria: {
    id: "euphoria",
    label: "陶酔",
    category: "emotion",
    promptText:
      "陶酔は、意識が拡張するような高揚感、没入感、恍惚、光に包まれる感覚として扱う。多幸感よりも、現実感が薄れ、音に溶けていくような感覚を重視する。",
  },

  rain: {
    id: "rain",
    label: "雨",
    category: "scene",
    promptText:
      "雨は、湿度、反射する街灯、窓の外を眺める感覚、孤独、少し閉じた空気として扱う。曲名にRainや雨が入っている必要はない。",
  },

  "summer-feeling": {
    id: "summer-feeling",
    label: "夏",
    category: "scene",
    promptText:
      "夏は、強い光、湿気、夜風、開放感、少し浮ついた気分、終わりが近づく切なさとして扱う。",
  },

  "winter-feeling": {
    id: "winter-feeling",
    label: "冬",
    category: "scene",
    promptText:
      "冬は、冷たい空気、乾いた光、静けさ、距離感、内省、厚着した身体感覚として扱う。",
  },

  "late-night": {
    id: "late-night",
    label: "深夜",
    category: "scene",
    promptText:
      "深夜は、人の少なさ、静けさ、眠らない街、ひとりの時間、少し現実から離れた感覚として扱う。歌詞の内容だけでなく、音数の少なさ、空白、小さな音量でも成立する感じ、近い声、抑えたビート、過度に盛り上がらない曲調、ヘッドホンで聴く距離感を重視する。",
  },

  "morning-light": {
    id: "morning-light",
    label: "朝",
    category: "scene",
    promptText:
      "朝は、やわらかい光、空気の入れ替わり、静かな始まり、少しずつ世界が動き出す感じ、期待感や希望として扱う。曲名にmorningや朝が入っている必要はない。",
  },

  festival: {
    id: "festival",
    label: "フェス",
    category: "scene",
    promptText:
      "フェスは、人混み、屋外、熱気、開放感、騒音、祝祭感、身体が動く感覚として扱う。大規模フェスだけでなく、地域祭りやレイヴ、夏イベントの雑多な高揚感も含める。",
  },

  drive: {
    id: "drive",
    label: "ドライブ",
    category: "scene",
    promptText:
      "ドライブは、移動感、車窓、流れる景色、速度感、ひとりの時間、目的地へ向かう高揚として扱う。車や道を直接歌った曲に限定しない。",
  },

  walk: {
    id: "walk",
    label: "散歩",
    category: "scene",
    promptText:
      "散歩は、歩くテンポ、街の観察、寄り道、軽い内省、生活の中の移動として扱う。",
  },

  sleeping: {
    id: "sleeping",
    label: "まどろみ",
    category: "scene",
    promptText:
      "まどろみは、眠りを誘うようなゆったりとしたテンポ、刺激的でない音質、人の感情を過度にゆさぶらない感覚として扱う。",
  },

  "neon-chaos": {
    id: "neon-chaos",
    label: "猥雑",
    category: "taste",
    promptText:
      "猥雑は、人混み、ネオン、繁華街、生活ノイズ、深夜の雑多さ、湿度のある俗っぽさとして扱う。上品に整えすぎず、街のざわつきや人間くささが出る曲を選ぶ。",
  },

  rustic: {
    id: "rustic",
    label: "素朴",
    category: "taste",
    promptText:
      "素朴は、飾り気のなさ、生活感、手触り、小さな日常、自然体の人間味として扱う。アコースティックやフォークに限定せず、電子音や打ち込みの曲でも、過度に洗練されすぎず、親密さ、素直さ、生活の温度が感じられる曲を選ぶ。",
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