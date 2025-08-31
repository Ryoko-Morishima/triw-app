"use client";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Processing…");

  useEffect(() => {
    const u = new URL(window.location.href);
    const code = u.searchParams.get("code");
    const state = u.searchParams.get("state");
    (async () => {
      if (!code || !state) { setMsg("Missing code/state"); return; }
      try {
        const r = await fetch(
          `/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          { credentials: "include", cache: "no-store" }
        );
        if (r.ok) {
          setMsg("Redirecting to Home…");
          setTimeout(() => (location.href = "/"), 1000);
        } else {
          const t = await r.text().catch(() => "");
          setMsg(`Auth failed: ${t || r.statusText}`);
        }
      } catch {
        setMsg("Auth error");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Auth Callback</h1>
      <p>{msg}</p>
    </main>
  );
}
