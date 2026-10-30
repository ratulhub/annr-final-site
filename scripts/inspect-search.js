import fs from 'fs';

const html = fs.readFileSync('public/search/index.html', 'utf8');
const start = html.indexOf('<div class="collection-product-grid">');
const end = html.indexOf('</div>\n				</div>\n				<div data-pagination>', start);
console.log('Sample product card on search page:');
console.log(html.substring(start, start + 2500));
