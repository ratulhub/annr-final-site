import fs from 'fs';

const js = fs.readFileSync('public/cdn/shop/t/75/assets/collection-navigation.js', 'utf8');
let pos = 0;
while ((pos = js.indexOf('replaceHeader', pos)) !== -1) {
  console.log('pos:', pos, js.substring(pos, pos + 200));
  pos += 13;
}
