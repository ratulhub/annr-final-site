import fs from 'fs';

const svg = fs.readFileSync('public/cdn/shop/t/75/assets/image_logo.svg', 'utf8');
const dMatch = svg.match(/d="([^"]+)"/);
if (!dMatch) { console.log('no path'); process.exit(1); }
const d = dMatch[1];
const nums = d.match(/[-+]?[0-9]*\.?[0-9]+/g).map(Number);
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let i = 0; i < nums.length - 1; i += 2) {
  const x = nums[i], y = nums[i+1];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
console.log('Path bounds: X [', minX, maxX, '] width:', maxX - minX);
console.log('Path bounds: Y [', minY, maxY, '] height:', maxY - minY);
const vb = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
console.log('viewBox:', vb);
console.log('Padding left:', minX - vb[0], 'right:', (vb[0] + vb[2]) - maxX);
console.log('Padding top:', minY - vb[1], 'bottom:', (vb[1] + vb[3]) - maxY);
