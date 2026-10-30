import fs from 'fs';

for (const c of ['samurai', 'clocked-out', 'divine']) {
  const p = `public/collections/${c}/index.html`;
  const html = fs.readFileSync(p, 'utf8');
  console.log(`\n=== Collection [${c}] ===`);
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
  console.log('H1 Title:', title);
  const colMenu = html.match(/<nav class="collection-menu"[^>]*>([\s\S]*?)<\/nav>/i)?.[0];
  console.log('Collection Menu length:', colMenu?.length);
  const activeLink = html.match(/class="[^"]*collection-menu__link--active[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  console.log('Active Link in collection-menu:', activeLink?.[1]?.trim());
}
