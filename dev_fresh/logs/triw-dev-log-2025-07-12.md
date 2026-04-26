# 📓 開発日誌：2025-07-12（土）

🕒 **作業時間**：9:30～10:50（約1時間）（Node.js〜VS Code、ディレクトリ構成まで）

---

## 🎯 今日の目標

- Spotify連携の準備を始める
- Next.jsのプロジェクト構築とローカル開発環境の整備
- フォルダ構成・Git管理の見直し

---

## ✅ やったこと

### 🌐 開発環境整備
- Node.js（v22.17.0）とnpm（v10.9.2）をインストール
- `create-next-app` で Next.js プロジェクト作成 → フォルダ名を `triw-app` に変更
- PowerShell と管理者権限での実行によりエラー解消
- `npm run dev` で開発サーバー起動確認

### 🖥 VS Code関連
- VS Code をインストール（C:\Users\ryoko\AppData\Local\Programs\Microsoft VS Code）
- 拡張機能をいくつかインストール（GitHub 関連など）
- `.vscode/` ディレクトリの役割と `.gitignore` 対応を理解

### 🗂 ディレクトリ構成整理
- `D:\work\triw\dev\` をプロジェクトルートに設定
- `triw-app` をサブディレクトリとして配置
- `logs/`, `data/` フォルダは GitHub 管理外に
- `.gitignore` を調整して不要なファイルを除外
- `public/` 以下の旧プロトタイプ（HTML/JS/CSSなど）を `archive/` に移動整理

### 🔁 Git/GitHubの確認
- リポジトリの構成方針を見直し（`triw-app/` のみ GitHub 管理とする方針に確定）
- `.gitignore` の書き方と作用範囲を確認

---

## 💭 気づき・メモ

- 環境整備ばかりでつかれた！
- GitHub 連携は次回に持ち越し
- 開発起動手順や作業フェーズを忘れやすいため、「スタート！」宣言に対応して都度ナビゲートするよう設定済み！

---

## 🧭 次回やること

- [ ] GitHubに新しいリポジトリを作成（`triw-app`）
- [ ] ローカルとリモートを連携（`git remote add` など）
- [ ] 初回 `git push` でリポジトリをアップ
- [ ] Spotify API連携（アプリ設定、認証まわり）の本格スタート！
