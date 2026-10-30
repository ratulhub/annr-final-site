import fs from 'fs';

const pages = ['public/home.html', 'public/collections/all/index.html', 'public/collections/samurai/index.html'];
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const matches = html.match(/href="[^"]*(?:samurai|clocked-out|divine)[^"]*"/g) || [];
  console.log(`\nPage [${p}] unique links:`, Array.from(new Set(matches)));
}
