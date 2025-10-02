// src/app/about/page.tsx
"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-zinc">
      <h1>Project TRIW ってなに？</h1>
      <p>
        <strong>Project TRIW</strong> は、理想のラジオ音楽番組を AI でつくるプロジェクトです。
      </p>

      <h2>まずは MIXTAPE から</h2>
      <p>
        最初のステップとして「選曲部分」を形にしました。
        それが <Link href="/playlist">MIXTAPE ジェネレーター</Link> です。
      </p>

      <hr />

      <h2>🎧 プロジェクト構想メモ：理想のラジオアプリをつくる</h2>

      <h3>💡 作りたいもの</h3>
      <p>「自分の理想のラジオ番組」をWebアプリで実現したい。</p>
      <ul>
        <li>Spotifyの音楽を使って構成された番組</li>
        <li>曲の間にナレーション（曲紹介）を挟む</li>
        <li>ナレーションは原稿をAIで生成し、TTSで音声にする</li>
        <li>音楽とナレーションが交互に流れるよう、自動再生を実装する</li>
      </ul>

      <h3>❌ 今のサービスで満足できない点</h3>
      <ul>
        <li>最近のFMラジオは「余計なトーク」が多く、音楽が主体となっていない番組が多い</li>
        <li>Spotifyは音楽を流すには良いが「曲名やちょっとした説明」がなくて物足りない</li>
        <li>自分で曲を選ぶと同じ傾向に偏ってしまい、ラジオならではの発見が乏しい</li>
      </ul>

      <h3>🎯 実現したいこと（最低限の完成ライン）</h3>
      <ul>
        <li>番組テーマに沿ったプレイリストを生成</li>
        <li>プレイリストの各曲に対して、AIで曲紹介の原稿を生成</li>
        <li>その原稿をTTSで音声化（MP3）</li>
        <li>Webアプリ上で「ナレーション → 曲 → ナレーション → 曲…」と順番に再生</li>
      </ul>

      <h3>❓ 曲の選び方について</h3>
      <ul>
        <li>生成AIでテーマに沿った選曲を自動生成 → Spotifyにプレイリスト作成</li>
        <li>DJを選択／ユーザーが作成（名前・特徴）し、そのペルソナに合わせて選曲</li>
      </ul>
      <p>※ 当初はこのプレイリスト制作までをアプリとしてリリースすることをめざす。</p>

      <h3>🌟 今後入れたい「ラジオらしい機能」</h3>
      <ul>
        <li>時報（毎正時に「ピッ、ポーン、ポーン…」みたいな音）</li>
        <li>ニュース・天気・交通情報などを自動で挿入できる仕組み</li>
      </ul>

      <h3>📱 利用シーン・デバイス</h3>
      <ul>
        <li>スマホからの利用を想定（運転中などに最適）</li>
        <li>PCからも使えると嬉しい</li>
      </ul>

      <h3>🧩 技術の方向性（現時点）</h3>
      <ul>
        <li>ナレーション生成：OpenAI / Gemini など</li>
        <li>音声化：Google Cloud TTS / ElevenLabs など</li>
        <li>曲再生：Spotify Web API + Web Playback SDK</li>
        <li>UI：シンプルなWebアプリ（スマホ最適化）</li>
      </ul>

      <h3>🐣 雑感・メモ</h3>
      <ul>
        <li>ラジオは「音楽＋ちょっとした人の声、情報」があってこそ楽しい</li>
        <li>毎日のテーマやコーナーを考えると、運用も続けたくなる</li>
        <li>UIは番組表っぽい見せ方も相性が良いかも</li>
      </ul>

      <hr />

      <h2>TRIW の面白さ（訴求ポイント）</h2>
      <ul>
        <li>DJが選曲するという面白さ</li>
        <li>同じテーマでも DJ によって選曲が変わる</li>
        <li>DJ次第で結果が全然違ってくる</li>
        <li>自分だけの DJ も作れちゃう</li>
      </ul>

      <h2>こんな使い方がオススメ</h2>
      <ul>
        <li>
          <strong>ドライブのBGM</strong>：
          Techneでクールに疾走、Sakuraで歌モノ爽快、Nomadで旅気分。
        </li>
        <li>
          <strong>夜更けの作業用</strong>：
          Mistで瞑想空間、Blue Noteで都会的な集中を。
        </li>
        <li>
          <strong>パーティ前の気分上げ</strong>：
          Blazeでアンセム連打、Rioでファンクに体をほどく。
        </li>
      </ul>

      <h2>なにが得られる？</h2>
      <ul>
        <li>Spotifyに眠る、触れたことのない名曲に出会える</li>
        <li>音楽をもっと楽しめる。BGMが“番組”に変わる</li>
      </ul>

      <p>
        まずは <Link href="/playlist">TRIW MIXTAPE</Link> を試してみてください。
      </p>
    </main>
  );
}
