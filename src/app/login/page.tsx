"use client";

export default function LoginPage() {
  const go = () => (location.href = "/api/auth/login");
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
        Login Page
      </h1>
      <button
        onClick={go}
        style={{ padding: "10px 16px", background: "black", color: "white" }}
      >
        Login with Spotify
      </button>
      <div style={{ marginTop: 12 }}>
        <a href="/api/auth/login">/api/auth/login へ直接アクセス</a>
      </div>
    </main>
  );
}
