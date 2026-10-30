import fs from 'fs';

const cat = JSON.parse(fs.readFileSync('src/admin/catalog.json', 'utf8'));
const products = cat.products.map(p => ({
  handle: p.handle,
  title: p.title,
  description: p.description || '',
  image: p.image || (p.images && p.images[0]) || '',
  image2: (p.images && p.images[1]) || p.image || '',
  price: p.price,
  compareAt: p.compareAt || null,
  badge: p.badge || (p.title.toLowerCase().includes('hoodie') || p.title.toLowerCase().includes('tee') ? '' : ''),
  status: p.status || 'active',
  type: p.type || '',
  tags: p.tags || ''
}));

fs.writeFileSync('public/_ext/catalog.json', JSON.stringify(products, null, 2), 'utf8');
console.log(`Successfully generated public/_ext/catalog.json with ${products.length} products.`);
