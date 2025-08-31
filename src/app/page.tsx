"use client";
import { useEffect, useRef, useState } from "react";

type Status = { loggedIn: boolean; expiresAt: number | null };

export default function Home() {
  const [s, setS] = useState<Status | null>(null);
  const started = useRef(false);

  async function fetchStatus() {
    const r = await fetch("/api/auth/status", {
      cache: "no-store",
      credentials: "include",
    });
    const j = (await r.json()) as Status;
    setS(j);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchStatus();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    location.reload();
  };

  if (!s) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
        TRIW Minimal: Home ✅
      </h1>
      {s.loggedIn ? (
        <>
          <p style={{ marginBottom: 6 }}>✅ Logged in</p>
          <p style={{ marginBottom: 16, color: "#666" }}>
            Expires: {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "-"}
          </p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 16 }}>未ログインです。</p>
          <a href="/login">Login Pageへ</a>
        </>
      )}
    </main>
  );
}
