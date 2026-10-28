import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

const fontPath = path.resolve('public/cdn/shop/t/75/assets/Rockybilly.ttf');
opentype.load(fontPath, (err, font) => {
  if (err) {
    console.error('Error loading font:', err);
    process.exit(1);
  }
  
  console.log('Font loaded:', font.names.fontFamily.en);
  
  // Test generating path for "AnnR"
  // Let's test different font sizes, e.g. 72, 48, etc.
  const text = 'AnnR';
  const fontSize = 64;
  const pathObj = font.getPath(text, 0, 0, fontSize);
  const bbox = pathObj.getBoundingBox();
  console.log('Bounding box:', bbox);
  
  const width = Math.ceil(bbox.x2 - bbox.x1);
  const height = Math.ceil(bbox.y2 - bbox.y1);
  const padding = 10;
  
  // Re-generate with offset so all coords are positive
  const offsetX = -bbox.x1 + padding;
  const offsetY = -bbox.y1 + padding;
  const finalPath = font.getPath(text, offsetX, offsetY, fontSize);
  const svgPathData = finalPath.toPathData(2);
  
  const svgWidth = width + padding * 2;
  const svgHeight = height + padding * 2;
  
  const svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${svgPathData}" fill="#030303" />
</svg>`;

  console.log('SVG Width:', svgWidth, 'Height:', svgHeight);
  fs.writeFileSync('scripts/test-logo.svg', svgContent);
  console.log('Generated scripts/test-logo.svg');
});
