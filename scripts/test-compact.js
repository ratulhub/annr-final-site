import fs from 'fs';

const cat = JSON.parse(fs.readFileSync('src/admin/catalog.json', 'utf8'));
const list = cat.products.map(p => ({
  handle: p.handle,
  title: p.title,
  price: String(p.price || '0').replace(/\.00$/, ''),
  compareAt: p.compareAt ? String(p.compareAt).replace(/\.00$/, '') : '',
  image: p.image || (p.images && p.images[0]) || '',
  image2: (p.images && p.images[1]) || '',
  description: (p.description || '').slice(0, 150),
  status: p.status || 'active',
  type: p.type || '',
  tags: p.tags || ''
}));

console.log('Compact catalog size:', JSON.stringify(list).length, 'bytes');
fs.writeFileSync('scripts/compact-catalog.json', JSON.stringify(list), 'utf8');
