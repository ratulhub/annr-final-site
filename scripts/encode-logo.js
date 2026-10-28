import fs from 'fs';

const svg = fs.readFileSync('public/cdn/shop/t/75/assets/image_logo.svg', 'utf8');
const base64 = Buffer.from(svg).toString('base64');
const dataUri = `data:image/svg+xml;base64,${base64}`;

console.log('Data URI length:', dataUri.length);
console.log('Preview:', dataUri.substring(0, 80));
