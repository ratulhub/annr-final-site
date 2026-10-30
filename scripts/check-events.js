import fs from 'fs';

const js = fs.readFileSync('public/cdn/shop/t/75/assets/collection-navigation.js', 'utf8');
const events = js.match(/dispatch(Event)?\([^)]*\)/g) || [];
console.log('Dispatched events:', events);
const customs = js.match(/CustomEvent\([^)]*\)/g) || [];
console.log('Custom events:', customs);
