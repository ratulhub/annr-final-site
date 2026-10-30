import fs from 'fs';

const html = fs.readFileSync('public/home.html', 'utf8');
const idx = html.indexOf('data-header-menu-index="2"');
console.log(html.substring(idx, idx + 1800));
