import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Blue circle with white "R" — simple SVG source
const svgBase = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <text x="256" y="340" font-family="system-ui,sans-serif" font-weight="700"
        font-size="300" text-anchor="middle" fill="#ffffff">R</text>
</svg>`;

const sizes = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon-180.png", size: 180 },
];

for (const { file, size } of sizes) {
  await sharp(Buffer.from(svgBase))
    .resize(size, size)
    .png()
    .toFile(`public/icons/${file}`);
  console.log(`✓ public/icons/${file}`);
}

// Maskable — no rounded corners, fills the full canvas
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f172a"/>
  <text x="256" y="340" font-family="system-ui,sans-serif" font-weight="700"
        font-size="260" text-anchor="middle" fill="#ffffff">R</text>
</svg>`;

await sharp(Buffer.from(svgMaskable))
  .resize(512, 512)
  .png()
  .toFile("public/icons/maskable-512.png");
console.log("✓ public/icons/maskable-512.png");
