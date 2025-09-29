// src/components/Header.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setAuthed(Boolean(j.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  const loginHref =
    `/api/auth/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white/90 backdrop-blur px-4 py-3">
      {/* 左側ロゴ/タイトル */}
      <Link href="/" className="font-bold tracking-tight hover:opacity-80">
        TRIW MIXTAPE
      </Link>

      {/* 中央ナビゲーション */}
      <nav className="flex items-center gap-4 text-sm">
        <Link
          href="/playlist"
          className={`hover:underline ${pathname === "/playlist" ? "font-semibold underline" : ""}`}
          aria-current={pathname === "/playlist" ? "page" : undefined}
        >
          MIXTAPE
        </Link>
        <Link
          href="/about"
          className={`hover:underline ${pathname === "/about" ? "font-semibold underline" : ""}`}
          aria-current={pathname === "/about" ? "page" : undefined}
        >
          Project TRIWとは？
        </Link>
      </nav>

      {/* 右側ログイン/ログアウト */}
      <div>
        {authed === null ? (
          <span className="text-sm text-gray-400">…</span>
        ) : authed ? (
          <a className="text-sm underline" href="/api/auth/logout">
            ログアウト
          </a>
        ) : (
          <a
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
            href={loginHref}
          >
            Spotifyにログイン
          </a>
        )}
      </div>
    </header>
  );
}
