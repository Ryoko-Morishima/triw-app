// scripts/generate-playlist-relay-icons.js
//
// One-off generator for Playlist Relay's app icons. Rasterizes the two SVG
// originals under public/playlist-relay/ into the PNG sizes the app needs
// (Apple touch icon, Web App Manifest icons, small favicons).
//
// Uses `sharp`, which is already a project dependency — no new packages
// are added by this script. Not wired into any build/runtime path; run it
// manually whenever the source SVGs change:
//
//   node scripts/generate-playlist-relay-icons.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "..", "public", "playlist-relay");
const iconSource = fs.readFileSync(path.join(outDir, "icon-source.svg"));
const faviconSource = fs.readFileSync(path.join(outDir, "favicon-source.svg"));

async function render(svgBuffer, size, outFile) {
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, outFile));
  console.log(`wrote ${outFile} (${size}x${size})`);
}

async function main() {
  // Large sizes from the detailed original.
  await render(iconSource, 180, "apple-touch-icon.png");
  await render(iconSource, 192, "icon-192.png");
  await render(iconSource, 512, "icon-512.png");

  // Small sizes from the simplified, thicker-lined original.
  await render(faviconSource, 16, "favicon-16.png");
  await render(faviconSource, 32, "favicon-32.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
