import fs from 'fs';

const js = fs.readFileSync('public/cdn/shop/t/75/assets/collection-navigation.js', 'utf8');
console.log(js.substring(6109, 7100));
