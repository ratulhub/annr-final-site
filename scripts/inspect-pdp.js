import fs from "fs";
const html = fs.readFileSync('public/products/aka-manto-longsleeve/index.html', 'utf8');
const idx = html.indexOf('product-info-size-selector');
if (idx !== -1) {
  console.log(html.slice(idx, idx + 1500));
}
