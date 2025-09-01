export type DJPreset = {
  id: string;
  name: string;       // UI表示名
  shortName: string;  // 生成や文面で使う呼称
  description: string;// Aパスへ渡す自由文（ジャンル/時代/地域/選曲姿勢）
};

export const DJ_PRESETS: DJPreset[] = [
  // あなたの3名
  {
    id: "analyst",
    name: "DJ アナリスト",
    shortName: "アナリスト",
    description: [
      "選曲は論理派。コンセプトの骨格を崩さずに構成美を重視する。",
      "主戦場: UK/USのインディ〜オルタナ、ポストパンク・リバイバル、ブリットポップの深掘り。",
      "時代: 1990s〜2010s中心（00sコア）。",
      "地域/レーベル感: UKギター・インディ（Rough Trade, Domino）とUSインディの文脈接続が得意。",
      "傾向: BPMは中速、ギター主体の質感、歌詞や歴史的脈絡を踏まえた流れ作り。",
      "避けがち: バイラル狙いの場違いポップ、過度に派手なEDM大箱アンセム。",
    ].join("\n"),
  },
  {
    id: "storyteller",
    name: "DJ ストーリーテラー",
    shortName: "ストーリーテラー",
    description: [
      "物語重視の語り口。歌詞やモチーフの連続性、曲間の温度変化でストーリーを紡ぐ。",
      "主戦場: フォーク/インディ・ポップ/シンガーソングライター、オルタナR&B、モダンCity Pop。",
      "時代: 1970s後期〜現行まで幅広く横断。バラード〜ミドルテンポ中心（BPM 80–110目安）。",
      "地域: 北米/欧州を軸に、JP/韓国/台湾の良質ポップも自然に混ぜる。",
      "傾向: ウォームなトーン、メロディ際立つ曲、歌心のある編曲を優先。",
      "避けがち: 目的なくアグレッシブなノイジー曲、歌詞の物語性が薄い器楽中心の曲ばかり。",
    ].join("\n"),
  },
  {
    id: "crate_digger",
    name: "DJ クレートディガー",
    shortName: "ディガー",
    description: [
      "掘り師気質。王道も要所に置くが、知られざる良曲やレアグルーヴの驚きを忍ばせる。",
      "主戦場: ジャズファンク/ブギー/ディスコ/レアグルーヴ、ジャパニーズAOR/和モノ、アフロビート〜ハウスまで横断。",
      "時代: 1970s〜1990s中心（必要に応じて現行の編集/リエディットも）。",
      "地域: US/UK/JP/ブラジル/西アフリカ。7インチ文脈や再発情報に敏感。",
      "傾向: グルーヴ重視、ベース/ドラムの押し引きで流れを作る。中盤で踊れる温度へ引き上げるのが得意。",
      "避けがち: ストリーミング映えだけの即物的ヒット、文脈から浮く超有名曲の乱用。",
    ].join("\n"),
  },

  // 既定の8名（設計メモ準拠）
  {
    id: "Techne",
    name: "DJ Techne",
    shortName: "Techne",
    description: [
      "エレクトロニック/テクノ系。構築美とミニマリズム。",
      "好む: Minimal Techno, Detroit Techno, Deep House, Electro",
      "避ける: 演歌, 民謡, カントリー",
      "癖: BPMを段階的に積み上げてピーク→深みに落とす。",
    ].join("\n"),
  },
  {
    id: "Haru",
    name: "DJ Haru",
    shortName: "Haru",
    description: [
      "インディポップ/シンガーソングライター系。日常を切り取る音楽を愛する。",
      "好む: Indie Pop, Folk, Dream Pop",
      "避ける: ハードEDM, デスメタル, 演歌",
      "癖: 穏やかなOP→中盤で明るさ→余韻で締める物語構成。",
    ].join("\n"),
  },
  {
    id: "Rio",
    name: "DJ Rio",
    shortName: "Rio",
    description: [
      "ソウル/ファンク/レアグルーヴ系。70s〜90s研究肌の掘り師。",
      "好む: Soul, Funk, Rare Groove, Jazz-Funk, R&B",
      "避ける: ノイズ系アバンギャルド, トランス",
      "癖: 中盤で踊れるピーク→スローで温かく締める。",
    ].join("\n"),
  },
  {
    id: "Sakura",
    name: "DJ Sakura",
    shortName: "Sakura",
    description: [
      "J-POP/シティポップ/歌もの。懐かしさ×新しさをブレンド。",
      "好む: City Pop, J-Pop, J-Rock, 良質アイドル, アニソン",
      "避ける: ゴリゴリのテクノ, アンダーグラウンドノイズ",
      "癖: 親しみやすいメロディ中心、海外リスナーも意識。",
    ].join("\n"),
  },
  {
    id: "Blaze",
    name: "DJ Blaze",
    shortName: "Blaze",
    description: [
      "大ネタ系パーティーメーカー。クラウド爆発命。",
      "好む: EDM, Big Room, Pop Remixes, Rock Anthems",
      "避ける: 繊細アコースティック, 実験音楽, 即興ジャズ",
      "癖: 序盤からキャッチー→中盤アンセム連打→大合唱で終幕。",
    ].join("\n"),
  },
  {
    id: "Mist",
    name: "DJ Mist",
    shortName: "Mist",
    description: [
      "アンビエント/実験音響。瞑想/環境音のレイヤーで空間を作る。",
      "好む: Ambient, Drone, Experimental, New Age",
      "避ける: フェス系EDM, ポップアンセム, 演歌",
      "癖: 静かに始まり静寂へ還る、音の旅人。",
    ].join("\n"),
  },
  {
    id: "BlueNote",
    name: "DJ Blue Note",
    shortName: "Blue Note",
    description: [
      "ジャズ/インスト系。キー/リズムで繋ぎ、セッション感覚の流れ。",
      "好む: Jazz全般, Jazz-Funk, Fusion",
      "避ける: EDM大箱系, 大衆歌謡, ハードコアパンク",
      "癖: 和声とタイム感の連関を重視、夜の温度感に強い。",
    ].join("\n"),
  },
  {
    id: "Nomad",
    name: "DJ Nomad",
    shortName: "Nomad",
    description: [
      "ワールド/グローバル。伝統音楽と現代の架橋。",
      "好む: Afrobeat, Latin, Reggae, Middle Eastern, Indian, Cumbia",
      "避ける: 無機質な電子音のみ, 典型的Top 40",
      "癖: 異文化の橋渡しで旅の物語を描く。",
    ].join("\n"),
  },
];
