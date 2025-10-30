import fs from "fs";
import path from "path";
import sharp from "sharp";

const projectRoot = path.resolve(process.cwd());
const publicDir = path.join(projectRoot, "public");
const sourceLogo = path.join(publicDir, "FullLogo.png");

async function ensureSquare(inputPath) {
  const img = sharp(inputPath);
  const metadata = await img.metadata();
  const size = Math.max(metadata.width || 0, metadata.height || 0, 512);
  // Extend to square with transparent background if not square
  return img
    .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png();
}

async function generate() {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Expected source logo at ${sourceLogo}. Move your FullLogo.png into public/ then rerun.`);
  }

  const square = await ensureSquare(sourceLogo);
  const out192 = path.join(publicDir, "icon-192.png");
  const out512 = path.join(publicDir, "icon-512.png");

  await square.clone().resize(192, 192).toFile(out192);
  await square.clone().resize(512, 512).toFile(out512);

  console.log("Generated:", path.relative(projectRoot, out192), path.relative(projectRoot, out512));
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});


