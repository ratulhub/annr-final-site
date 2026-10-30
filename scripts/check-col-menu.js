import fs from 'fs';

const collections = ['accessories', 'all', 'bonsai', 'golden-goal', 'samurai', 'clocked-out', 'divine', 'classics', 'archived', 'hoodies', 't-shirts'];
for (const c of collections) {
  const file = `public/collections/${c}/index.html`;
  if (fs.existsSync(file)) {
    const html = fs.readFileSync(file, 'utf8');
    const match = html.match(/<nav class="collection-menu"[^>]*>([\s\S]*?)<\/nav>/);
    if (match) {
      const items = Array.from(match[1].matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)).map(m => `${m[1]} -> ${m[2].trim()}`);
      console.log(`\n=== Collection [${c}] ===`);
      items.forEach(it => console.log('  ', it));
    } else {
      console.log(`\n=== Collection [${c}]: NO collection-menu ===`);
    }
  }
}
