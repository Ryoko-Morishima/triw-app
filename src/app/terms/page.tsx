export default function TermsPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto text-zinc-800">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-2">
        By using <strong>TRIW MIXTAPE</strong>, you agree to the following terms:
      </p>
      <ol className="list-decimal pl-6 mb-4">
        <li>This service is provided “as is,” without any guarantees of availability or functionality.</li>
        <li>The app only creates playlists on your Spotify account with your permission.</li>
        <li>
          You remain responsible for your use of Spotify according to{" "}
          <a
            href="https://www.spotify.com/legal/end-user-agreement/"
            target="_blank"
            className="text-blue-600 underline"
          >
            Spotify’s Terms of Service
          </a>.
        </li>
        <li>We may update or discontinue this application at any time without notice.</li>
      </ol>
      <p>If you do not agree with these terms, please stop using this application.</p>
    </main>
  );
}
