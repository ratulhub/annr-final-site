import fs from 'fs';

const html = fs.readFileSync('public/search/index.html', 'utf8');
const scripts = [];
for (const m of html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/g)) {
  scripts.push(m[1]);
}
console.log('Scripts loaded by public/search/index.html:');
scripts.forEach(s => console.log(' - ' + s));
