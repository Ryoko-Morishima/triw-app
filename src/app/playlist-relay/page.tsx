"use client";

import { useEffect, useMemo, useState } from "react";
import { parseTrackList, type ParsedLine } from "@/lib/triw/spotify/parseTrackList";

type Candidate = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string | null;
  release_date: string | null;
  popularity: number | null;
  external_url: string | null;
};

type Row = {
  raw: string;
  type: ParsedLine["type"];
  artist: string;
  title: string;
  candidates: Candidate[];
  best: Candidate | null;
  error?: string;
  rowLoading?: boolean;
};

type MyPlaylistSummary = {
  id: string;
  name: string;
  public: boolean | null;
  collaborative: boolean;
  tracksTotal: number;
  imageUrl: string | null;
  ownerId: string;
  ownerName: string | null;
  isMine: boolean;
  canEdit: boolean;
  url: string | null;
};

type RecentPlaylist = { id: string; name: string; url: string | null; updatedAt: number };

const RECENTS_KEY = "playlist_relay_recent_playlists_v1";
// Legacy key from the tool's previous life at /dark-playlist. We migrate its
// data into RECENTS_KEY on first load but deliberately leave it in place
// rather than deleting it.
const LEGACY_RECENTS_KEY = "triw_recent_playlists";

function loadRecents(): RecentPlaylist[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const legacyRaw = window.localStorage.getItem(LEGACY_RECENTS_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(legacyParsed));
        return legacyParsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveRecent(entry: RecentPlaylist) {
  try {
    const existing = loadRecents().filter((r) => r.id !== entry.id);
    const next = [entry, ...existing].slice(0, 5);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [entry];
  }
}

function extractPlaylistId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  return trimmed;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j) => setAuthed(Boolean(j.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div style={{ padding: 24 }}>認証状態を確認中…</div>;
  if (!authed) {
    return (
      <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 12, maxWidth: 480, margin: "40px auto", fontFamily: "system-ui" }}>
        <h2>まずはSpotifyにログイン</h2>
        <p style={{ color: "#666" }}>プレイリスト作成・追加にはSpotify連携が必要です。</p>
        <a href="/api/auth/login?next=/playlist-relay" style={{ display: "inline-block", padding: "10px 16px", background: "#111", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
          Spotifyにログイン
        </a>
      </div>
    );
  }
  return <>{children}</>;
}

function SiteHeader({ authed }: { authed: boolean | null }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid #eee",
        fontFamily: "system-ui",
      }}
    >
      <div>
        <div style={{ fontWeight: "bold", fontSize: 18 }}>Playlist Relay</div>
        <div style={{ fontSize: 13, color: "#666" }}>曲目リストを貼り付けて、Spotifyプレイリストへ。</div>
      </div>
      <div>
        {authed === null ? null : authed ? (
          <a href="/api/auth/logout" style={{ fontSize: 13, textDecoration: "underline", color: "#333" }}>
            ログアウト
          </a>
        ) : (
          <a
            href="/api/auth/login?next=/playlist-relay"
            style={{ fontSize: 13, border: "1px solid #ccc", borderRadius: 6, padding: "4px 10px", textDecoration: "none", color: "#333" }}
          >
            Spotifyにログイン
          </a>
        )}
      </div>
    </header>
  );
}

export default function PlaylistRelayPage() {
  const [headerAuthed, setHeaderAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");

  const [destMode, setDestMode] = useState<"recent" | "new" | "search">("new");
  const [recents, setRecents] = useState<RecentPlaylist[]>([]);
  const [selectedRecentId, setSelectedRecentId] = useState<string>("");

  const [existingResults, setExistingResults] = useState<MyPlaylistSummary[] | null>(null);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<{ message: string; code?: string } | null>(null);
  const [existingFilter, setExistingFilter] = useState("");
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [manualPlaylistInput, setManualPlaylistInput] = useState("");

  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [resolving, setResolving] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ playlist: { id: string; name: string; url: string | null }; addedCount: number } | null>(null);

  useEffect(() => {
    const r = loadRecents();
    setRecents(r);
    if (r.length > 0) {
      setDestMode("recent");
      setSelectedRecentId(r[0].id);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j) => setHeaderAuthed(Boolean(j.authenticated)))
      .catch(() => setHeaderAuthed(false));
  }, []);

  useEffect(() => {
    if (destMode !== "search" || existingResults !== null || existingLoading) return;
    setExistingLoading(true);
    setExistingError(null);
    fetch("/api/spotify/playlists")
      .then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (!j.ok) {
          setExistingError({ message: j.error || "取得に失敗しました", code: j.code });
          return;
        }
        setExistingResults(j.playlists);
      })
      .catch((e) => setExistingError({ message: String(e?.message || e) }))
      .finally(() => setExistingLoading(false));
  }, [destMode, existingResults, existingLoading]);

  const filteredExisting = useMemo(() => {
    if (!existingResults) return [];
    const q = existingFilter.trim().toLowerCase();
    const base = q ? existingResults.filter((p) => p.name.toLowerCase().includes(q)) : existingResults;
    return base.slice(0, 60);
  }, [existingResults, existingFilter]);

  async function searchRow(artist: string, title: string) {
    const res = await fetch("/api/spotify/playlist-tool/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ type: "query", artist, title, raw: `${artist} - ${title}` }] }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "検索に失敗しました");
    return json.results[0];
  }

  async function handleResolveAll() {
    setResolving(true);
    setError("");
    setResult(null);
    try {
      const parsed = parseTrackList(text);
      if (parsed.length === 0) throw new Error("曲目リストを入力してください");

      const res = await fetch("/api/spotify/playlist-tool/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "解決に失敗しました");

      const nextRows: Row[] = json.results.map((r: any) => ({
        raw: r.raw,
        type: r.type,
        artist: r.query?.artist ?? r.best?.artists?.join(", ") ?? "",
        title: r.query?.title ?? r.best?.name ?? "",
        candidates: r.candidates,
        best: r.best,
        error: r.error,
      }));
      setRows(nextRows);

      const initial: Record<number, string> = {};
      nextRows.forEach((r, i) => {
        if (r.best?.uri) initial[i] = r.best.uri;
      });
      setSelected(initial);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setResolving(false);
    }
  }

  async function handleRowResearch(index: number) {
    if (!rows) return;
    const row = rows[index];
    setRows((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, rowLoading: true } : r)) : prev));
    try {
      const r = await searchRow(row.artist, row.title);
      setRows((prev) =>
        prev
          ? prev.map((rr, i) => (i === index ? { ...rr, candidates: r.candidates, best: r.best, error: r.error, rowLoading: false } : rr))
          : prev
      );
      setSelected((s) => ({ ...s, [index]: r.best?.uri ?? "" }));
    } catch (e: any) {
      setRows((prev) => (prev ? prev.map((rr, i) => (i === index ? { ...rr, rowLoading: false, error: e.message || String(e) } : rr)) : prev));
    }
  }

  async function handleWrite() {
    if (!rows) return;
    setWriting(true);
    setError("");
    setResult(null);
    try {
      const uris = rows.map((_, i) => selected[i]).filter(Boolean);
      if (uris.length === 0) throw new Error("追加する曲が選択されていません");

      let body: any;
      if (destMode === "new") {
        if (!name.trim()) throw new Error("プレイリスト名を入力してください");
        body = { mode: "new", name: name.trim(), description: description.trim(), uris };
      } else if (destMode === "recent") {
        if (!selectedRecentId) throw new Error("追加先のプレイリストを選択してください");
        body = { mode: "existing", playlistId: selectedRecentId, uris };
      } else {
        const playlistId = selectedExistingId || (manualPlaylistInput ? extractPlaylistId(manualPlaylistInput) : "");
        if (!playlistId) throw new Error("追加先のプレイリストを選択するか、URL/IDを入力してください");
        body = { mode: "existing", playlistId, uris };
      }

      const res = await fetch("/api/spotify/playlist-tool/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "書き込みに失敗しました");

      setResult(json);
      const nextRecents = saveRecent({
        id: json.playlist.id,
        name: json.playlist.name || "(名称不明)",
        url: json.playlist.url,
        updatedAt: Date.now(),
      });
      setRecents(nextRecents);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setWriting(false);
    }
  }

  return (
    <>
      <SiteHeader authed={headerAuthed} />
      <AuthGate>
        <main style={{ maxWidth: 920, margin: "24px auto", padding: 24, fontFamily: "system-ui" }}>
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 6 }}>曲目リスト</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"1行1曲。例:\nArtist - Title\nArtist – Title\nhttps://open.spotify.com/track/...\nspotify:track:..."}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ccc", fontFamily: "monospace" }}
          />
          <button
            onClick={handleResolveAll}
            disabled={resolving || !text.trim()}
            style={{ marginTop: 8, padding: "10px 16px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}
          >
            {resolving ? "検索中…" : "① 曲を検索して候補を表示"}
          </button>
        </section>

        <section style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 8 }}>作成先</label>

          {recents.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <label>
                <input type="radio" checked={destMode === "recent"} onChange={() => setDestMode("recent")} />{" "}
                前回使ったプレイリストに追加（{recents.find((r) => r.id === selectedRecentId)?.name ?? recents[0].name}）
              </label>
              {destMode === "recent" && (
                <select
                  value={selectedRecentId}
                  onChange={(e) => setSelectedRecentId(e.target.value)}
                  style={{ display: "block", marginTop: 6, marginLeft: 24, padding: 6 }}
                >
                  {recents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <label>
              <input type="radio" checked={destMode === "new"} onChange={() => setDestMode("new")} /> 新しい非公開プレイリストを作成
            </label>
            {destMode === "new" && (
              <div style={{ marginLeft: 24, marginTop: 6 }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="プレイリスト名"
                  style={{ display: "block", width: "100%", maxWidth: 400, padding: 8, marginBottom: 6, borderRadius: 6, border: "1px solid #ccc" }}
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="説明"
                  rows={2}
                  style={{ display: "block", width: "100%", maxWidth: 400, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              </div>
            )}
          </div>

          <div>
            <label>
              <input type="radio" checked={destMode === "search"} onChange={() => setDestMode("search")} /> 別の既存プレイリストを探す
            </label>
            {destMode === "search" && (
              <div style={{ marginLeft: 24, marginTop: 6 }}>
                {existingLoading && <div>プレイリスト一覧を取得中…</div>}
                {existingError && (
                  <div style={{ color: "#b00", marginBottom: 8 }}>
                    {existingError.message}
                    {existingError.code === "INSUFFICIENT_SCOPE" && (
                      <div>
                        <a href="/api/auth/login?next=/playlist-relay">Spotifyに再ログイン</a>
                      </div>
                    )}
                  </div>
                )}
                {existingResults && (
                  <>
                    <input
                      value={existingFilter}
                      onChange={(e) => setExistingFilter(e.target.value)}
                      placeholder="名前で絞り込み"
                      style={{ width: "100%", maxWidth: 400, padding: 8, marginBottom: 8, borderRadius: 6, border: "1px solid #ccc" }}
                    />
                    <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                      {filteredExisting.map((p) => (
                        <label
                          key={p.id}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                        >
                          <input type="radio" name="existingPlaylist" checked={selectedExistingId === p.id} onChange={() => setSelectedExistingId(p.id)} />
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" width={40} height={40} style={{ borderRadius: 4, objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: "#eee", borderRadius: 4 }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: p.isMine ? "bold" : "normal" }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>
                              {p.public ? "公開" : "非公開"} ・ {p.tracksTotal}曲
                              {!p.isMine && !p.collaborative && " ・ 追加できない可能性あり"}
                              {!p.isMine && p.collaborative && " ・ 共同編集"}
                            </div>
                          </div>
                        </label>
                      ))}
                      {filteredExisting.length === 0 && <div style={{ padding: 8, color: "#666" }}>該当なし</div>}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 4 }}>
                    見つからない場合はURLまたはIDを直接入力
                  </label>
                  <input
                    value={manualPlaylistInput}
                    onChange={(e) => setManualPlaylistInput(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/... または ID"
                    style={{ width: "100%", maxWidth: 400, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {error && <div style={{ marginBottom: 16, color: "#b00", whiteSpace: "pre-wrap" }}>{error}</div>}

        {rows && (
          <>
            <ol style={{ padding: 0, listStyle: "none" }}>
              {rows.map((row, i) => {
                const selectedCandidate = row.candidates.find((c) => c.uri === selected[i]) ?? row.best;
                const ambiguous = row.candidates.length > 1;
                return (
                  <li key={i} style={{ marginBottom: 14, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <input
                        value={row.artist}
                        onChange={(e) =>
                          setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, artist: e.target.value } : r)) : prev))
                        }
                        placeholder="アーティスト"
                        style={{ flex: 1, minWidth: 160, padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
                      />
                      <input
                        value={row.title}
                        onChange={(e) =>
                          setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)) : prev))
                        }
                        placeholder="曲名"
                        style={{ flex: 1, minWidth: 160, padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
                      />
                      <button
                        onClick={() => handleRowResearch(i)}
                        disabled={row.rowLoading}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fafafa", cursor: "pointer" }}
                      >
                        {row.rowLoading ? "検索中…" : "この曲だけ再検索"}
                      </button>
                    </div>

                    {row.error && <div style={{ color: "#b00", fontSize: 13, marginBottom: 6 }}>{row.error}</div>}

                    {row.candidates.length > 0 ? (
                      <select
                        value={selected[i] || ""}
                        onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.value }))}
                        style={{ width: "100%", padding: 6, marginBottom: 6 }}
                      >
                        <option value="">(追加しない)</option>
                        {row.candidates.map((c) => (
                          <option key={c.uri} value={c.uri}>
                            {c.artists.join(", ")} – {c.name} [{c.album ?? "-"}, {c.release_date ?? "-"}]
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ fontSize: 13, color: "#b00", marginBottom: 6 }}>候補が見つかりませんでした</div>
                    )}

                    {selectedCandidate && (
                      <div style={{ fontSize: 13, color: "#333" }}>
                        {selectedCandidate.artists.join(", ")} – {selectedCandidate.name}
                        {" ・ "}
                        {selectedCandidate.album ?? "-"}
                        {" ・ "}
                        {selectedCandidate.release_date ?? "-"}
                        {selectedCandidate.external_url && (
                          <>
                            {" ・ "}
                            <a href={selectedCandidate.external_url} target="_blank" rel="noopener noreferrer">
                              Spotifyで確認
                            </a>
                          </>
                        )}
                      </div>
                    )}

                    {ambiguous && <div style={{ fontSize: 12, color: "#a60", marginTop: 4 }}>⚠ 候補が複数あります。選択を確認してください。</div>}
                  </li>
                );
              })}
            </ol>

            <button
              onClick={handleWrite}
              disabled={writing}
              style={{ padding: "12px 20px", borderRadius: 8, border: "none", background: "#1DB954", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
            >
              {writing ? "書き込み中…" : "② このリストをSpotifyへ反映"}
            </button>
          </>
        )}

        {result?.playlist && (
          <div style={{ marginTop: 24, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
            <h2>完了</h2>
            {result.playlist.url && (
              <a href={result.playlist.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1DB954", fontWeight: "bold" }}>
                ▶ {result.playlist.name}（Spotifyで開く）
              </a>
            )}
            <p>追加曲数: {result.addedCount}</p>
          </div>
        )}
        </main>
      </AuthGate>
    </>
  );
}
