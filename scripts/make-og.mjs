// Genera public/og.png (1200x630) para previews en Discord/WhatsApp/Twitter.
// Render de un SVG con sharp. Las banderas se inlinean como <image> data-uri.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FLAGS = ["ar", "br", "es", "fr", "gb-eng", "de", "mx", "pt", "nl", "hr"];

function flagDataUri(code) {
  const svg = readFileSync(join(root, "node_modules/flag-icons/flags/4x3", code + ".svg"));
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

const fw = 96, fh = 64, gap = 14;
const rowW = FLAGS.length * fw + (FLAGS.length - 1) * gap;
const rowX = (1200 - rowW) / 2;
const rowY = 470;

const flagEls = FLAGS.map((c, i) => {
  const x = rowX + i * (fw + gap);
  return `<g clip-path="url(#fr)" transform="translate(${x} ${rowY})">
    <image href="${flagDataUri(c)}" width="${fw}" height="${fh}"/>
    <rect width="${fw}" height="${fh}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5" rx="7"/>
  </g>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="78%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#4DE2F0" stop-opacity=".22"/>
      <stop offset="55%" stop-color="#4DE2F0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="6%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#FF3B5C" stop-opacity=".16"/>
      <stop offset="60%" stop-color="#FF3B5C" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="fr"><rect width="${fw}" height="${fh}" rx="7"/></clipPath>
  </defs>

  <rect width="1200" height="630" fill="#0A0A0B"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect x="8" y="8" width="1184" height="614" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="2" rx="10"/>

  <text x="600" y="120" text-anchor="middle" font-family="'JetBrains Mono','Consolas',monospace" font-size="26" letter-spacing="9" fill="#4DE2F0">P R O D E · M U N D I A L</text>

  <text x="600" y="300" text-anchor="middle" font-family="Impact,'Arial Narrow',sans-serif" font-weight="700" font-size="210" letter-spacing="2" fill="#F4F4F2">MUNDIAL <tspan fill="#4DE2F0">26</tspan></text>

  <text x="600" y="370" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="34" letter-spacing="3" fill="#C9C9C4">FASE DE GRUPOS · 72 PARTIDOS · 12 GRUPOS</text>
  <text x="600" y="415" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="26" letter-spacing="5" fill="#8E8E89">USA · CANADÁ · MÉXICO</text>

  ${flagEls}

  <text x="600" y="592" text-anchor="middle" font-family="Impact,'Arial Narrow',sans-serif" font-size="30" letter-spacing="3" fill="#8E8E89">DESARROLLADO POR <tspan fill="#4DE2F0">ISTINCHO</tspan></text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(root, "public/og.png"));
console.log("public/og.png generado");
