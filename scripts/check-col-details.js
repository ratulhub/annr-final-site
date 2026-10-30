import fs from 'fs';

const files = ['public/collections/samurai/index.html', 'public/collections/clocked-out/index.html', 'public/collections/divine/index.html'];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  console.log(`\n=== File: ${f} ===`);
  const suffix = html.match(/data-template-suffix="([^"]*)"/);
  console.log('templateSuffix:', suffix ? suffix[1] : 'none');
  const overlay = html.match(/data-header-overlay="([^"]*)"/);
  console.log('header-overlay:', overlay ? overlay[1] : 'none');
  const scripts = html.match(/<script[^>]*src="([^"]*)"[^>]*>/g) || [];
  const colScripts = scripts.filter(s => s.includes('collection'));
  console.log('Collection scripts:', colScripts);
}
