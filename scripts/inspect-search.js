import fs from 'fs';

const html = fs.readFileSync('public/home.html', 'utf8');
const start = html.indexOf('<div class="header-search-new__products">');
const end = html.indexOf('</div>\n                    </div>', start);
console.log('Sample product card inside search:');
console.log(html.substring(start, start + 3000));
