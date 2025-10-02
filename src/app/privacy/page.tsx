export default function PrivacyPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto text-zinc-800">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-2">
        This application, <strong>TRIW MIXTAPE</strong>, uses the Spotify Web API to create playlists based on user input.
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>We do not store or share your personal information.</li>
        <li>Your Spotify account data is only used to authenticate and create playlists on your behalf.</li>
        <li>No sensitive information (such as passwords or emails) is stored by this application.</li>
        <li>
          You may revoke access at any time from your{" "}
          <a
            href="https://www.spotify.com/account/apps/"
            target="_blank"
            className="text-blue-600 underline"
          >
            Spotify account settings
          </a>.
        </li>
      </ul>
      <p>If you have any concerns, please contact us.</p>
    </main>
  );
}
