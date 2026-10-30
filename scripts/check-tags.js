import fs from 'fs';

for (const c of ['samurai', 'clocked-out', 'divine']) {
  const p = `public/collections/${c}/index.html`;
  const html = fs.readFileSync(p, 'utf8');
  console.log(`\n=== Collection [${c}] ===`);
  const bodyTag = html.match(/<body[^>]*>/i)?.[0];
  console.log('Body tag:', bodyTag);
  const headerTag = html.match(/<header[^>]*>/i)?.[0];
  console.log('Header tag:', headerTag);
}
