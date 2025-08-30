"use client";
export default function LoginPage() {
  const go = () => (location.href = "/api/auth/login");
  return (
    <main style={{padding:24}}>
      <h1 style={{fontWeight:700,fontSize:20,marginBottom:12}}>Spotifyにログイン</h1>
      <button onClick={go}>Login with Spotify</button>
    </main>
  );
}
