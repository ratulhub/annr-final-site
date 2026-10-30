import fs from 'fs';

const cat = JSON.parse(fs.readFileSync('src/admin/catalog.json', 'utf8'));
console.log('Sample titles:');
cat.products.slice(0, 15).forEach(p => console.log(' - ' + p.title + ' (' + p.price + ')'));

// Search test
function search(q) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return cat.products.filter(p => {
    const text = (p.title + ' ' + (p.description || '') + ' ' + p.handle).toLowerCase();
    return terms.every(t => text.includes(t));
  });
}

console.log('\nSearch "hoodie":', search('hoodie').length, 'results');
console.log('Search "samurai":', search('samurai').length, 'results');
console.log('Search "jeans":', search('jeans').length, 'results');
console.log('Search "jacket":', search('jacket').length, 'results');
console.log('Search "divine":', search('divine').length, 'results');
console.log('Search "clocked":', search('clocked').length, 'results');
console.log('Search "tee":', search('tee').length, 'results');
console.log('Search "bonsai":', search('bonsai').length, 'results');
