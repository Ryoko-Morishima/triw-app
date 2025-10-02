"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-black dark:text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:text-zinc-300">
            <span>✨</span> AI × Radio Experience
          </div>

          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
            Project TRIW ってなに？
          </h1>

          <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Project TRIW</strong> は、理想のラジオ音楽番組を AI でつくるプロジェクトです。
            まずは <em className="mx-1">選曲体験</em>から。テーマとDJしだいで、君だけのMIXTAPEが生まれます。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/playlist"
              className="group inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow hover:opacity-95 dark:bg-white dark:text-zinc-900"
            >
              MIXTAPE を作る
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
               href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
            >
              機能を見る
            </a>
          </div>
        </div>

        {/* soft circles */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-200/40 to-cyan-200/40 blur-3xl dark:from-indigo-500/10 dark:to-cyan-500/10" />
          <div className="absolute -right-24 top-24 h-64 w-64 rounded-full bg-gradient-to-tr from-fuchsia-200/40 to-amber-200/40 blur-3xl dark:from-fuchsia-500/10 dark:to-amber-500/10" />
        </div>
      </section>

      {/* Intro & Points */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-6 md:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            📻 まずは MIXTAPE から
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            最初のステップとして「選曲部分」を形にしました。
            それが{" "}
            <Link href="/playlist" className="underline underline-offset-2">
              MIXTAPE ジェネレーター
            </Link>{" "}
            です。
          </p>
          <div className="mt-4">
            <Link
              href="/playlist"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60"
            >
              🎵 今すぐ試す
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            🎧 TRIW の面白さ（訴求ポイント）
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-300">
            <li>同じテーマでも、DJを変えると選曲が変わる</li>
            <li>漠然としたテーマからミックスが作れる</li>
            <li>カスタムDJで思い通りの選曲に</li>
            <li>自分が知らない名曲に出会える</li>
          </ul>
        </div>
      </section>

      {/* Use cases */}
<section className="mx-auto max-w-6xl px-6 py-4">
  <h2 className="mb-4 text-2xl font-semibold">こんな使い方がオススメ</h2>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[
      {
        title: "ドライブのBGM",
        desc: "DJ Techneでクールに疾走、DJ Sakuraで歌モノ爽快、DJ Nomadで旅気分。",
        icon: "🛣️",
        examples: [
          { label: "テーマ", value: "ハイウェイドライブ" },
          { label: "概要", value: "ドライブをもっと楽しくするBGM" },
        ],
      },
      {
        title: "夜更けの作業用",
        desc: "DJ Mistで瞑想空間、DJ Blue Noteで都会的な集中を。",
        icon: "🌙",
        examples: [
          { label: "テーマ", value: "0時以降の深夜作業" },
          { label: "概要", value: "作業を邪魔しない、ボーカル少なめの曲" },
        ],
      },
      {
        title: "パーティ前の気分上げ",
        // カスタムDJ推しにテキスト変更
        desc: "カスタムDJでクセあり選曲も。",
        icon: "⚡",
        examples: [
          { label: "テーマ", value: "週末のウォームアップ" },
          {
            label: "カスタムDJ例",
            value:
              "DJ noisy：ノイズミュージックしばり｜DJ しゃれお：カフェミュージックはまかせろ",
          },
        ],
      },
    ].map((it) => (
      <div
        key={it.title}
        className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900"
      >
        <h3 className="flex items-center gap-2 text-lg font-medium">
          <span className="text-base">{it.icon}</span> {it.title}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{it.desc}</p>

        {/* 入力例 */}
        {it.examples?.length ? (
          <div className="mt-4 space-y-2">
            {it.examples.map((ex) => (
              <div key={ex.label} className="text-sm">
                <span className="mr-2 inline-flex select-none items-center rounded-full border border-zinc-200/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-800/70 dark:text-zinc-300">
                  入力例・{ex.label}
                </span>
                <span className="text-zinc-700 dark:text-zinc-200">{ex.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ))}
  </div>
</section>

      {/* Value */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="mb-4 text-2xl font-semibold">なにが得られる？</h2>
        <ul className="grid gap-3 text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          <li className="rounded-xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800/70 dark:bg-zinc-900">
            Spotifyに眠る、触れたことのない名曲に出会える
          </li>
          <li className="rounded-xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800/70 dark:bg-zinc-900">
            選曲の手間なく理想の音楽体験ができる
          </li>
        </ul>
        <div className="mt-6">
          <Link
            href="/playlist"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow hover:opacity-95 dark:bg-white dark:text-zinc-900"
          >
            TRIW MIXTAPE を試す
          </Link>
        </div>
      </section>
      {/* Features */}
<section id="features" className="mx-auto max-w-6xl px-6 py-8">
  <h2 className="text-2xl font-semibold">TRIWでできること</h2>
  <ul className="mt-4 list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-300">
    <li>テーマを入れてDJを選ぶとプレイリストを自動生成</li>
    <li>Spotifyで再生してシェアできる</li>
    <li>知らない名曲に出会える</li>
  </ul>
</section>

      {/* Vision & How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <h2 className="text-2xl font-semibold">🎧 プロジェクト構想メモ：理想のラジオアプリをつくる</h2>

        {[
          {
            title: "💡 作りたいもの",
            body: (
              <>
                <p>「自分の理想のラジオ番組」をWebアプリで実現したい。</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Spotifyの音楽を使って構成された番組</li>
                  <li>曲の間にナレーション（曲紹介）を挟む</li>
                  <li>ナレーションは原稿をAIで生成し、TTSで音声にする</li>
                  <li>音楽とナレーションが交互に流れるよう、自動再生を実装する</li>
                </ul>
              </>
            ),
          },
          {
            title: "❌ 今のサービスで満足できない点",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>最近のFMラジオは「余計なトーク」が多く、音楽が主体となっていない番組が多い</li>
                <li>Spotifyは音楽を流すには良いが「曲名やちょっとした説明」がなくて物足りない</li>
                <li>自分で曲を選ぶと同じ傾向に偏ってしまい、ラジオならではの発見が乏しい</li>
              </ul>
            ),
          },
          {
            title: "🎯 実現したいこと（最低限の完成ライン）",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>番組テーマに沿ったプレイリストを生成</li>
                <li>プレイリストの各曲に対して、AIで曲紹介の原稿を生成</li>
                <li>その原稿をTTSで音声化（MP3）</li>
                <li>Webアプリ上で「ナレーション → 曲 → ナレーション → 曲…」と順番に再生</li>
              </ul>
            ),
          },
          {
            title: "❓ 曲の選び方について",
            body: (
              <>
                <ul className="list-inside list-disc space-y-1">
                  <li>生成AIでテーマに沿った選曲を自動生成 → Spotifyにプレイリスト作成</li>
                  <li>DJを選択／ユーザーが作成（名前・特徴）し、そのペルソナに合わせて選曲</li>
                </ul>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  ※ 当初はこのプレイリスト制作までをアプリとしてリリースすることをめざす。
                </p>
              </>
            ),
          },
          {
            title: "🌟 今後入れたい「ラジオらしい機能」",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>時報（毎正時に「ピッ、ポーン、ポーン…」みたいな音）</li>
                <li>ニュース・天気・交通情報などを自動で挿入できる仕組み</li>
              </ul>
            ),
          },
          {
            title: "📱 利用シーン・デバイス",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>スマホからの利用を想定（運転中などに最適）</li>
                <li>PCからも使えると嬉しい</li>
              </ul>
            ),
          },
          {
            title: "🧩 技術の方向性（現時点）",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>ナレーション生成：OpenAI / Gemini など</li>
                <li>音声化：Google Cloud TTS / ElevenLabs など</li>
                <li>曲再生：Spotify Web API + Web Playback SDK</li>
                <li>UI：シンプルなWebアプリ（スマホ最適化）</li>
              </ul>
            ),
          },
          {
            title: "🐣 雑感・メモ",
            body: (
              <ul className="list-inside list-disc space-y-1">
                <li>ラジオは「音楽＋ちょっとした人の声、情報」があってこそ楽しい</li>
                <li>毎日のテーマやコーナーを考えると、運用も続けたくなる</li>
                <li>UIは番組表っぽい見せ方も相性が良いかも</li>
              </ul>
            ),
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900"
          >
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <div className="mt-2 text-zinc-600 dark:text-zinc-300">{card.body}</div>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-zinc-50 to-white p-6 text-center shadow-sm dark:border-zinc-800/70 dark:from-zinc-900 dark:to-zinc-950">
          <h3 className="text-balance text-2xl font-semibold">まずは TRIW MIXTAPE から始めよう</h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            テーマとDJを選ぶだけ。新しい音楽との出会いが待っています。
          </p>
          <div className="mt-4">
            <Link
              href="/playlist"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-3 text-sm font-medium text-white shadow hover:opacity-95 dark:bg-white dark:text-zinc-900"
            >
              MIXTAPE を作る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
