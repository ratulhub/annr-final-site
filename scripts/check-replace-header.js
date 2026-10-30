import fs from 'fs';

const js = fs.readFileSync('public/cdn/shop/t/75/assets/collection-navigation.js', 'utf8');
const idx = js.indexOf('replaceHeader');
console.log(js.substring(idx - 50, idx + 800));
