export type DJPreset = {
  id: string;
  name: string;       // UI表示名
  shortName: string;  // 生成や文面で使う呼称
  description: string;// Aパスへ渡す自由文（ジャンル/時代/地域/選曲姿勢）
};

export const DJ_PRESETS: DJPreset[] = [

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
   // ユーザーのオリジナルＤＪ
  {
    id: "custom",
    name: "カスタムDJ",
    shortName: "Custom",
    description: "好きなDJを呼んでみよう!",
  }
];
