import fs from 'fs';

const html = fs.readFileSync('public/search/index.html', 'utf8');
const searchClasses = new Set();
const matches = html.matchAll(/class=["']([^"']*search[^"']*)["']/gi);
for (const m of matches) {
  searchClasses.add(m[1]);
}
console.log('Search classes in public/search/index.html:');
console.log(Array.from(searchClasses));

// Let's also check sections in public/search/index.html
const sections = html.matchAll(/id=["'](shopify-section-[^"']+)["']/gi);
const secList = [];
for (const s of sections) {
  secList.push(s[1]);
}
console.log('\nSections in search page:', secList);

// Check main content or search form on search page
const mainIdx = html.indexOf('<main');
const mainEnd = html.indexOf('</main>');
if (mainIdx !== -1 && mainEnd !== -1) {
  console.log('\nMain content snippet:');
  console.log(html.substring(mainIdx, mainIdx + 1500));
}
