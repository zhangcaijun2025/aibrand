const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = pkg.dependencies || {};
for (const [k, v] of Object.entries(deps)) {
  if (v === 'workspace:*') {
    const libName = k.replace('@yikart/', '');
    deps[k] = 'file:./libs/' + libName;
    console.log('Fixed: ' + k + ' -> ' + deps[k]);
  }
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Done fixing deps');
