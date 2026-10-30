import fs from 'fs';
import path from 'path';

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      res = res.concat(walk(p));
    } else if (p.endsWith('.html')) {
      res.push(p);
    }
  }
  return res;
}

const files = walk('public');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Clocked_out')) {
    content = content.split('Clocked_out').join('Clocked out');
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
  }
}

console.log(`Successfully updated Clocked_out -> Clocked out in ${updatedCount} files.`);
