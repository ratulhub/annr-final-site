import fs from "fs";
const html = fs.readFileSync('public/products/aka-manto-longsleeve/index.html', 'utf8');
const regex = /class=["']([^"']*product-info[^"']*)["']/g;
const matches = new Set();
let m;
while ((m = regex.exec(html)) !== null) {
  matches.add(m[1]);
}
console.log('Classes found:');
console.log(Array.from(matches));

const atcIdx = html.indexOf('product-info-submit');
if (atcIdx !== -1) {
  console.log('\nATC context:');
  console.log(html.slice(atcIdx - 300, atcIdx + 400));
}
