import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const fontPath = path.resolve('public/cdn/shop/t/75/assets/Rockybilly.ttf');
  const buffer = fs.readFileSync(fontPath);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  
  console.log('Font names:', font.names);
  
  const text = 'AnnR';
  const fontSize = 72;
  const pathObj = font.getPath(text, 0, 0, fontSize);
  const bbox = pathObj.getBoundingBox();
  console.log('Bounding box:', bbox);
  
  const width = Math.ceil(bbox.x2 - bbox.x1);
  const height = Math.ceil(bbox.y2 - bbox.y1);
  const paddingX = 4;
  const paddingY = 4;
  
  const offsetX = -bbox.x1 + paddingX;
  const offsetY = -bbox.y1 + paddingY;
  const finalPath = font.getPath(text, offsetX, offsetY, fontSize);
  const svgPathData = finalPath.toPathData(2);
  
  const svgWidth = width + paddingX * 2;
  const svgHeight = height + paddingY * 2;
  
  const svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${svgPathData}" fill="#030303" />
</svg>
`;

  console.log('SVG Width:', svgWidth, 'Height:', svgHeight);
  fs.writeFileSync('scripts/test-logo.svg', svgContent);
  console.log('Generated scripts/test-logo.svg');
}

main().catch(console.error);
