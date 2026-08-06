const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
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

const frontendFiles = walk('apps/frontend/src');
const backendFiles = walk('apps/backend/src');

const frontendEndpoints = [];
const backendEndpoints = [];

// Parse Frontend Endpoints
frontendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const regex = /apiClient\.(get|post|put|patch|delete)\b[^(]*\(\s*(['"`])(.*?)\2/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    frontendEndpoints.push({
      method: match[1].toUpperCase(),
      route: match[3],
      file: file.replace(/\\/g, '/').replace('apps/frontend/src/', '')
    });
  }
});

// Parse Backend Endpoints
backendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
  const controllerPrefix = controllerMatch ? controllerMatch[1] : '';
  const regex = /@(Get|Post|Put|Patch|Delete)\((?:['"]([^'"]*)['"])?\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[2] || '';
    const fullRoute = ('/' + controllerPrefix + (route ? '/' + route : '')).replace(/\/+/g, '/');
    backendEndpoints.push({
      method,
      route: fullRoute,
      file: file.replace(/\\/g, '/').replace('apps/backend/src/', '')
    });
  }
});

// Comparison Logic
// Note: Frontend routes often have template literals e.g. /device/${id}
// Backend routes have Express params e.g. /device/:id
function normalizeRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, ':param').replace(/:[^\/]+/g, ':param');
}

const table = [];
table.push('| Frontend Page/Service | Frontend API Call | Expected Backend Route | Actual Backend Route | Status |');
table.push('|---|---|---|---|---|');

frontendEndpoints.forEach(fe => {
  const feNorm = normalizeRoute(fe.route);
  // Find matching backend route
  const match = backendEndpoints.find(be => be.method === fe.method && normalizeRoute(be.route) === feNorm);
  
  if (match) {
    table.push(`| ${fe.file} | \`${fe.method} ${fe.route}\` | \`${fe.method} ${match.route}\` | \`${fe.method} ${match.route}\` | ✅ Matched |`);
  } else {
    table.push(`| ${fe.file} | \`${fe.method} ${fe.route}\` | \`${fe.method} ${fe.route}\` | ❌ MISSING/404 | ❌ 404 |`);
  }
});

// Also find backend endpoints that are not used by frontend? The prompt says produce mapping table.
fs.writeFileSync('api_audit_report.md', table.join('\n'), 'utf-8');
console.log("Wrote api_audit_report.md");
