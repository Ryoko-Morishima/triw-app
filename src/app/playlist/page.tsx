// src/app/playlist/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Balancer from "react-wrap-balancer";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { DJCard } from "@/components/DJCard";
import { SaveToSpotifyButton } from "@/components/SaveToSpotifyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CassetteIndexCard, IndexTrack } from "@/components/CassetteIndexCard";
import { MixtapeSummarySheet } from "@/components/MixtapeSummarySheet";

/* ====================== 擬似進捗の設定 ====================== */
// 見かけ時間（ms）※実時間に応じて自由に調整
const PROGRESS_WEIGHTS_MS: Record<"A"|"B"|"C"|"D"|"E"|"F", number> = {
  A: 10000,
  B: 23000,
  C: 30000,
  D: 20000,
  E: 70000, // 実際に重い工程に寄せる
  F: 25000,
};
/* =========================================================== */

const PROGRESS_STEPS = [
  { key: "A", label: "ペルソナ生成" },
  { key: "B", label: "テーマ解釈" },
  { key: "C", label: "候補出し" },
  { key: "D", label: "Spotify解決" },
  { key: "E", label: "評価" },
  { key: "F", label: "整形" },
] as const; // Gは表示しない（完了時は非表示）

const HOLD_IDX = PROGRESS_STEPS.length - 1; // Fで90%到達→完了時に非表示

function InlineBuildProgress({
  phaseIdx,
}: {
  phaseIdx: number;
}) {
  const clampedIdx = Math.max(0, Math.min(PROGRESS_STEPS.length - 1, phaseIdx));
  const percent = Math.max(
    5,
    Math.min(95, Math.floor((clampedIdx / Math.max(1, HOLD_IDX)) * 90))
  );

  return (
    <div className="w-full rounded-xl border p-4 bg-white shadow-sm">
      <div className="mb-2 text-sm text-gray-600">
        {PROGRESS_STEPS[clampedIdx].key}: {PROGRESS_STEPS[clampedIdx].label} 中…
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-gray-800 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">しばらくお待ちください。完成までの目安を表示しています。</p>
    </div>
  );
}

/* ===== 固定設定 ===== */
const DURATION_OPTIONS = [45, 60, 90, 120, 240] as const;
type Tone = "cream" | "blue" | "pink" | "slate" | "green";

/* ===== 型 ===== */
type PlanResponse = {
  runId: string;
  djId?: string;
  title?: string;
  description?: string;
  mode?: "count" | "duration";
  duration?: number;
  dj?: { id?: string | null; displayName?: string | null } | null;
  djComment?: string | null;
  memoText?: string | null;
  plan?: {
    memoText?: string | null;
    djComment?: string | null;
    dj?: { id?: string | null; displayName?: string | null } | null;
  };
  F?: any;
  error?: string;
};

type DJItem = {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  tagline?: string;
  profile?: string;
};

/* ===== ユーティリティ ===== */
async function safeJson<T = any>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractFinalTracks(F: any) {
  const list: any[] = (F?.tracks ?? F?.setlist ?? F?.items ?? []) as any[];
  return list.map((x) => ({
    title: x?.title ?? x?.name ?? x?.spotify?.name ?? "-",
    artist: x?.artist ?? x?.artists?.[0] ?? x?.spotify?.artists?.[0] ?? "-",
    uri: x?.uri ?? x?.spotify?.uri ?? null,
    cover:
      x?.album_image_url ||
      x?.spotify?.album_image_url ||
      x?.image ||
      x?.cover ||
      x?.album?.images?.[0]?.url ||
      null,
  }));
}

function splitSides(tracks: IndexTrack[]) {
  const mid = Math.ceil(tracks.length / 2);
  return { A: tracks.slice(0, mid), B: tracks.slice(mid) };
}

function coversFrom(tracks: any[]) {
  return tracks
    .map((t) => t?.cover)
    .filter(Boolean)
    .map((src: string) => ({ src }));
}

/* ===== 認証チェック ===== */
function useAuthStatus() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        setAuthed(Boolean(json?.authenticated));
      } catch (e: any) {
        setErr(e?.message || "auth check failed");
        setAuthed(false);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { checking, authed, err };
}

function LoginButtonInline() {
  const pathname = usePathname();
  const loginUrl = `/api/auth/login?next=${encodeURIComponent(pathname || "/playlist")}`;
  return (
    <a
      href={loginUrl}
      className="rounded-2xl px-4 py-2 bg-black text-white text-sm hover:opacity-90"
    >
      Spotify でログイン
    </a>
  );
}

/* ================== ページ本体 ================== */
export default function Page() {
  const { checking, authed, err } = useAuthStatus();

  /* --- 状態 --- */
  const [djs, setDjs] = useState<DJItem[]>([]);
  const [djId, setDjId] = useState<string>("");

  const [tone, setTone] = useState<Tone>("cream");
  const [customName, setCustomName] = useState("");
  const [customOverview, setCustomOverview] = useState("");

  const [title, setTitle] = useState("MIXTAPEのタイトル");
  const [desc, setDesc] = useState(
    "気分や聞きたいシーンを自由に書いて。90s/平成などの年代やアーティスト名もOK。"
  );
  const [duration, setDuration] = useState<number>(90);

  const [loading, setLoading] = useState(false);

  // 進捗の可視/状態
  const [showProgress, setShowProgress] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const timersRef = useRef<number[]>([]);

  function clearPhaseTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }
  function startPhaseTimers() {
    clearPhaseTimers();
    setPhaseIdx(0);
    setShowProgress(true);
    // 累積スケジュールで A..F を進める
    let acc = 0;
    const keys: ("A"|"B"|"C"|"D"|"E"|"F")[] = ["A","B","C","D","E","F"];
    for (let i = 0; i < keys.length; i++) {
      acc += PROGRESS_WEIGHTS_MS[keys[i]];
      const nextIdx = Math.min(HOLD_IDX, i + 1);
      const id = window.setTimeout(() => setPhaseIdx(nextIdx), acc);
      timersRef.current.push(id);
    }
  }
  function finishProgress() {
    clearPhaseTimers();
    // 完了時は即座にまるっと非表示
    setShowProgress(false);
  }

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<string>("");

  /* 設定（1〜4）の折りたたみ状態 */
  const [builderOpen, setBuilderOpen] = useState(true);

  /* --- DJ一覧取得 --- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/djs", { cache: "no-store" });
        const json = await safeJson<{ djs: DJItem[] }>(res);
        const list: DJItem[] = Array.isArray(json?.djs) ? json!.djs : [];
        setDjs(list);
        if (!djId && list.length) setDjId(list[0].id);
      } catch {
        const fallback: DJItem[] = [
          { id: "mellow", name: "DJ Mellow", description: "夜更けにそっと寄り添うチル担当", tagline: "夜更けのチル", image: "/dj/mellow.png" },
          { id: "groove", name: "DJ Groove", description: "ダンサブルでハッピー", tagline: "ダンサブル&ハッピー", image: "/dj/groove.png" },
          { id: "classic", name: "DJ Classic", description: "黄金期の名曲案内人", tagline: "黄金期の名曲案内", image: "/dj/classic.png" },
        ];
        setDjs(fallback);
        if (!djId) setDjId(fallback[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIsCustom = djId === "custom";

  // サーバ返りのDJ表示名があれば優先
  const serverDjDisplayName =
    (plan?.plan?.dj as any)?.displayName ?? plan?.dj?.displayName ?? null;

  const uiSelectedDjName =
    selectedIsCustom
      ? customName || "Custom DJ"
      : djs.find((d) => d.id === djId)?.name || djId;

  const cassetteDjDisplayName = serverDjDisplayName || uiSelectedDjName;

  /* --- Cassette/Sheet 用 --- */
  const finalRaw = useMemo(() => extractFinalTracks(plan?.F), [plan]);
  const finalForIndex: IndexTrack[] = finalRaw.map((t) => ({
    title: t.title,
    artist: t.artist,
  }));
  const sides = splitSides(finalForIndex);
  const covers = coversFrom(finalRaw);
  const uris: string[] = (plan?.F?.tracks ?? plan?.F?.setlist ?? plan?.F?.items ?? [])
    .map((t: any) => t?.uri || t?.spotify?.uri)
    .filter(Boolean);

  /* 生成後は設定(1〜4)を自動で畳む */
  useEffect(() => {
    if (finalForIndex.length > 0) setBuilderOpen(false);
  }, [finalForIndex.length]);

  /* --- 生成ハンドラ（完了時は即非表示） --- */
  async function handleGenerate() {
    try {
      setLoading(true);
      setError(null);
      setPlan(null);
      setMemo("");
      startPhaseTimers();

      const body: any = {
        title,
        description: desc,
        djId,
        mode: "duration",
        duration,
      };

      if (selectedIsCustom) {
        if (!customName.trim() || !customOverview.trim()) {
          setError("カスタムDJ名と概要は必須です");
          finishProgress();
          return;
        }
        body.customDJ = {
          name: customName.trim(),
          overview: customOverview.trim(),
        };
      }

      const res = await fetch("/api/mixtape/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await safeJson<PlanResponse>(res);
      if (!res.ok) throw new Error((json && (json as any).error) || `${res.status} ${res.statusText}`);

      const planObj = (json as any)?.plan ?? (json as any) ?? {};
      const memoText = (planObj?.memoText ?? planObj?.djComment ?? "") as string;

      setPlan(json!);
      setMemo(memoText);
      setBuilderOpen(false);
      finishProgress(); // ← 完了したら即バーを消す
    } catch (e: any) {
      setError(String(e?.message || e));
      finishProgress(); // ← 失敗時も即バーを消す
    } finally {
      setLoading(false);
    }
  }

  /* ----------------- UI ----------------- */
  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <div className="mb-4">
          <h1 className="text-4xl font-bold tracking-tight">
            <Balancer>TRIW / MIXTAPE</Balancer>
          </h1>
          <p className="mt-2 text-zinc-600">
            <Balancer>
              好きなDJを選んでテーマを一言。あなたのためにMIXTAPEを作ります。気に入ったらSpotifyプレイリストで聴いてみて!
            </Balancer>
          </p>
        </div>

        {/* 認証バナー */}
        <div className="mb-6">
          {checking ? (
            <div className="rounded-xl border bg-white p-3 text-sm text-zinc-600">
              ログイン状態を確認中…
            </div>
          ) : authed ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div className="text-sm text-zinc-700">
                保存（Spotifyプレイリスト作成）にはログインが必要です。
                {err ? <span className="ml-2 text-xs text-red-500">({err})</span> : null}
              </div>
              <LoginButtonInline />
            </div>
          )}
        </div>

        {/* 1〜4: 設定 */}
        <details
          open={builderOpen}
          onToggle={(e) => setBuilderOpen((e.currentTarget as HTMLDetailsElement).open)}
          className="mb-6 rounded-xl border bg-white p-4 shadow-sm
                   [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer select-none items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">
              {builderOpen ? "設定（とじる）" : "設定（ひらく）"}
            </span>
            <span className={`transition-transform ${builderOpen ? "rotate-180" : ""}`}>⌃</span>
          </summary>

          <div className="mt-4 space-y-8">
            {/* 1. DJを選ぶ */}
            <section>
              <h2 className="mb-3 text-xl font-semibold">1. DJを選ぶ</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {djs.map((dj) => {
                  const raw =
                    dj.profile?.trim() ||
                    dj.tagline?.trim() ||
                    (dj.description ?? "").trim();

                  const sentences = raw.split(/[。.!?]/).filter(Boolean);
                  const twoSentences = sentences.slice(0, 2).join("。");
                  const text = (twoSentences ? twoSentences + "。" : raw)
                    .replace(/\s+/g, " ")
                    .trim();
                  const brief = text.length > 80 ? text.slice(0, 80) + "…" : text;

                  return (
                    <DJCard
                      key={dj.id}
                      name={dj.name}
                      desc={brief}
                      image={dj.image || `/dj/${dj.id}.png`}
                      active={djId === dj.id}
                      onClick={() => setDjId(dj.id)}
                    />
                  );
                })}

                {/* カスタムDJ */}
                <div
                  className={`grid cursor-pointer gap-2 rounded-2xl border border-dashed p-4 ${
                    djId === "custom" ? "border-black" : "border-zinc-200"
                  }`}
                  onClick={() => setDjId("custom")}
                >
                  <div className="text-sm text-zinc-500">＋ カスタムDJ</div>
                  {djId === "custom" && (
                    <>
                      <Input
                        placeholder="DJの名前（必須）"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                      <Input
                        placeholder="DJのプロフ。雰囲気や得意分野、なんでもOK（必須）"
                        value={customOverview}
                        onChange={(e) => setCustomOverview(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* 2. テーマ */}
            <section>
              <h2 className="mb-3 text-xl font-semibold">2. テーマ</h2>
              <div className="grid gap-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="MIXTAPEのタイトル"
                />
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="どんなMIXがいい? 気分/シーン、年代やジャンル、アーティスト名、なんでも自由にいれてみて！"
                />
              </div>
            </section>

            {/* 3. 分数（固定5択） */}
            <section>
              <h2 className="mb-3 text-xl font-semibold">3. 分数を選ぶ</h2>
              <div className="flex flex-wrap items-center gap-2">
                {DURATION_OPTIONS.map((m) => (
                  <Button
                    key={m}
                    variant={duration === m ? "default" : "outline"}
                    onClick={() => setDuration(m)}
                  >
                    {m}分
                  </Button>
                ))}
              </div>
            </section>

            {/* 4. レーベル色 */}
            <section>
              <h2 className="mb-3 text-xl font-semibold">4. レーベルの色</h2>
              <div className="flex flex-wrap items-center gap-2">
                {(["cream", "blue", "pink", "slate", "green"] as Tone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`h-8 w-8 rounded-full border bg-gradient-to-br ${
                      t === "cream"
                        ? "from-amber-50 to-amber-100"
                        : t === "blue"
                        ? "from-sky-50 to-blue-100"
                        : t === "pink"
                        ? "from-rose-50 to-pink-100"
                        : t === "slate"
                        ? "from-slate-50 to-slate-100"
                        : "from-emerald-50 to-emerald-100"
                    } ${tone === t ? "ring-2 ring-black" : ""}`}
                    aria-label={t}
                    title={t}
                  />
                ))}
              </div>
            </section>
          </div>
        </details>

        {/* 実行ボタン */}
        <div className="mb-8 flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={loading || !djId}>
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "選曲中…" : "MIXTAPEを作る"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* 進捗（実行中のみ表示。完了/失敗で即非表示） */}
        {showProgress && (
          <div className="mb-8">
            <InlineBuildProgress phaseIdx={phaseIdx} />
          </div>
        )}

        {/* 出力 */}
        {finalForIndex.length > 0 && (() => {
          const planObj = (plan as any)?.plan ?? (plan as any) ?? {};
          const memoText = planObj?.memoText ?? planObj?.djComment ?? memo;

          return (
            <div className="mt-8 space-y-6">
              <CassetteIndexCard
                title={plan?.title ?? "Untitled Mixtape"}
                djName={cassetteDjDisplayName}
                sideA={sides.A}
                sideB={sides.B}
                tone={tone}
              />

              <MixtapeSummarySheet
                title={plan?.title ?? "Untitled Mixtape"}
                memo={memoText}
                covers={covers}
              />

              <div className="flex flex-wrap items-center gap-3">
                <SaveToSpotifyButton
                  uris={uris}
                  name={`TRIW - ${plan?.title ?? "Untitled"}`}
                  description={plan?.description ?? ""}
                  disabled={!authed}
                />
                {!authed && (
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <span>保存するにはログインしてください</span>
                    <LoginButtonInline />
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>
    </>
  );
}
