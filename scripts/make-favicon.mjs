// Genera public/favicon.svg (pelota de fútbol clásica, patrón Telstar) y
// rasteriza public/favicon.png + apple-touch-icon.png con sharp.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = 50, BALL_R = 44;

const rad = (d) => (d * Math.PI) / 180;
function pentagon(cx, cy, r, rotDeg = 0) {
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const a = rad(-90 + k * 72 + rotDeg);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
const toPath = (pts) =>
  "M" + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join("L") + "Z";

// Pentágono central.
const center = pentagon(C, C, 15, 0);

// 5 pentágonos del borde, sobre las direcciones de las aristas del central.
const edgeDirs = [-54, 18, 90, 162, 234];
const outers = edgeDirs.map((d) => {
  const cx = C + 37 * Math.cos(rad(d));
  const cy = C + 37 * Math.sin(rad(d));
  return pentagon(cx, cy, 12, d + 90);
});

// Costuras: de cada vértice del central hacia el borde (radial).
const vertDirs = [-90, -18, 54, 126, 198];
const seams = vertDirs
  .map((d) => {
    const x1 = C + 15 * Math.cos(rad(d));
    const y1 = C + 15 * Math.sin(rad(d));
    const x2 = C + BALL_R * Math.cos(rad(d));
    const y2 = C + BALL_R * Math.sin(rad(d));
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
  })
  .join("");

const ink = "#0B0B0D";
const white = "#F4F4F2";
const ring = "#3FE06B";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs><clipPath id="ball"><circle cx="${C}" cy="${C}" r="${BALL_R}"/></clipPath></defs>
  <circle cx="${C}" cy="${C}" r="${BALL_R}" fill="${white}"/>
  <g clip-path="url(#ball)">
    <path d="${toPath(center)}" fill="${ink}"/>
    ${outers.map((p) => `<path d="${toPath(p)}" fill="${ink}"/>`).join("\n    ")}
    <g stroke="${ink}" stroke-width="2.4" stroke-linecap="round">${seams}</g>
  </g>
  <circle cx="${C}" cy="${C}" r="${BALL_R}" fill="none" stroke="${ink}" stroke-width="3"/>
  <circle cx="${C}" cy="${C}" r="${BALL_R + 2.5}" fill="none" stroke="${ring}" stroke-width="2.5"/>
</svg>`;

writeFileSync(join(root, "public/favicon.svg"), svg);

const buf = Buffer.from(svg);
await sharp(buf, { density: 384 }).resize(64, 64).png().toFile(join(root, "public/favicon.png"));
await sharp(buf, { density: 384 }).resize(180, 180).png().toFile(join(root, "public/apple-touch-icon.png"));
console.log("favicon.svg + favicon.png + apple-touch-icon.png generados");
