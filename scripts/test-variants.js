import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const fontPath = path.resolve('public/cdn/shop/t/75/assets/Rockybilly.ttf');
  const buffer = fs.readFileSync(fontPath);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  
  const variants = ['AnnR', 'Annr', 'ANNR', 'annr'];
  const fontSize = 72;
  const padding = 10;
  
  for (const text of variants) {
    const pathObj = font.getPath(text, 0, 0, fontSize);
    const bbox = pathObj.getBoundingBox();
    const width = Math.ceil(bbox.x2 - bbox.x1);
    const height = Math.ceil(bbox.y2 - bbox.y1);
    const offsetX = -bbox.x1 + padding;
    const offsetY = -bbox.y1 + padding;
    const finalPath = font.getPath(text, offsetX, offsetY, fontSize);
    const svgWidth = width + padding * 2;
    const svgHeight = height + padding * 2;
    const svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${finalPath.toPathData(2)}" fill="#030303" />
</svg>`;
    fs.writeFileSync(`scripts/test-logo-${text}.svg`, svgContent);
    console.log(`Generated scripts/test-logo-${text}.svg (${svgWidth}x${svgHeight})`);
  }
}

main().catch(console.error);
