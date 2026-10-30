import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

const targetReplacement = `        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="alternate icon" href="/favicon.ico" type="image/x-icon">
        <link rel="apple-touch-icon" href="/favicon.png">`;

let totalFiles = 0;
let updatedFiles = 0;

walkDir('public', (filePath) => {
  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf8');

  // Match:
  // <link rel="shortcut icon" href="https://shihiko.com/...FAVicon..." type="image/x-icon">\s*<link rel="icon" href="https://shihiko.com/...FAVicon..." type="image/x-icon">
  // or individual <link rel="(shortcut )?icon" href="[^"]*FAVicon[^"]*"[^>]*>
  const pattern = /[ \t]*<link\s+rel="shortcut icon"\s+href="[^"]*FAVicon[^"]*"[^>]*>\s*<link\s+rel="icon"\s+href="[^"]*FAVicon[^"]*"[^>]*>/gi;

  if (pattern.test(content)) {
    content = content.replace(pattern, targetReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    updatedFiles++;
  } else {
    // Check if there are individual favicon tags with FAVicon
    const singlePattern = /[ \t]*<link\s+rel="(?:shortcut )?icon"\s+href="[^"]*FAVicon[^"]*"[^>]*>/gi;
    if (singlePattern.test(content)) {
      content = content.replace(singlePattern, '');
      // Insert standard targetReplacement right after <meta name="theme-color"[^>]*> or before </head>
      if (content.includes('name="theme-color"')) {
        content = content.replace(/(<meta\s+name="theme-color"[^>]*>)/i, `$1\n${targetReplacement}`);
      } else {
        content = content.replace('</head>', `${targetReplacement}\n</head>`);
      }
      fs.writeFileSync(filePath, content, 'utf8');
      updatedFiles++;
    }
  }
});

console.log(`Scanned ${totalFiles} HTML files.`);
console.log(`Updated ${updatedFiles} files with native AnnR favicon tags.`);
