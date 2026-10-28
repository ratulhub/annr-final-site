import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

const fontPath = path.resolve('public/cdn/shop/t/75/assets/Rockybilly.ttf');
const buffer = fs.readFileSync(fontPath);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

const text = 'AnnR';
const fontSize = 72;
const pathObj = font.getPath(text, 0, 0, fontSize);
const bbox = pathObj.getBoundingBox();

console.log('Original bbox:', bbox);
const width = bbox.x2 - bbox.x1;
const height = bbox.y2 - bbox.y1;

// Let's create an SVG with width 140 and proportional height
const pad = 6;
const vbWidth = Math.ceil(width + pad * 2);
const vbHeight = Math.ceil(height + pad * 2);

const offsetX = -bbox.x1 + pad;
const offsetY = -bbox.y1 + pad;

const finalPath = font.getPath(text, offsetX, offsetY, fontSize);
const d = finalPath.toPathData(2);

// Standard aspect ratio for image_logo.svg
// Originally image_logo.svg was 78x35 (ratio ~2.2:1)
// vbWidth ~ 453, vbHeight ~ 205 (ratio ~2.21:1) - EXACT SAME PROPORTION!
console.log('Aspect ratio:', vbWidth / vbHeight);

const svg = `<svg width="${vbWidth}" height="${vbHeight}" viewBox="0 0 ${vbWidth} ${vbHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${d}" fill="#030303" />
</svg>
`;

fs.writeFileSync('public/cdn/shop/t/75/assets/image_logo.svg', svg);
console.log('Updated public/cdn/shop/t/75/assets/image_logo.svg successfully!');

