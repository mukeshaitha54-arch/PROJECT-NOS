const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  const dirList = fs.readdirSync(dir);
  for (const file of dirList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      walk(name, files);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      files.push(name);
    }
  }
  return files;
}

const allFiles = walk('apps/frontend/src');
const endpoints = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  const regex = /apiClient\.(get|post|put|patch|delete)\b[^(]*\(\s*(['"`])(.*?)\2/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const url = match[3];
    const relativePath = file.replace(/\\/g, '/').replace('apps/frontend/src/', '');
    endpoints.push(`${method} ${url} in ${relativePath}`);
  }
});

console.log(endpoints.join('\n'));
