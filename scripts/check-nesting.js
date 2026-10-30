import fs from 'fs';

const html = fs.readFileSync('public/collections/samurai/index.html', 'utf8');
const idx1 = html.indexOf('<shihiko-header');
const idx2 = html.indexOf('</shihiko-header>');
const idxMenu = html.indexOf('class="collection-menu"');
console.log('shihiko-header start:', idx1);
console.log('shihiko-header end:', idx2);
console.log('collection-menu pos:', idxMenu);
console.log('Is collection-menu inside shihiko-header?', idxMenu > idx1 && idxMenu < idx2);
