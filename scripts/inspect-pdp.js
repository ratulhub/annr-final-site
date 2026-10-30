const fs = require('fs');
const html = fs.readFileSync('public/products/aka-manto-longsleeve/index.html', 'utf8');
const regex = /class=["']([^"']*product-info[^"']*)["']/g;
const matches = new Set();
let m;
while ((m = regex.exec(html)) !== null) {
  matches.add(m[1]);
}
console.log('Classes found:');
console.log(Array.from(matches));

const formIdx = html.indexOf('<product-form');
if (formIdx !== -1) {
  console.log('\nProduct form context:');
  console.log(html.slice(formIdx - 200, formIdx + 1200));
}
