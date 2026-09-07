const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if(file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(/from ['"]([^'"]+)['"]/g);
        if(matches) {
          matches.forEach(m => {
            const imp = m.match(/from ['"]([^'"]+)['"]/)[1];
            if(imp.startsWith('.')) {
              const resolved = path.resolve(path.dirname(file), imp);
              const dirname = path.dirname(resolved);
              const basename = path.basename(resolved);
              if(fs.existsSync(dirname)) {
                const files = fs.readdirSync(dirname);
                const exactMatch = files.find(f => f === basename || f === basename + '.ts' || f === basename + '.tsx' || f === basename + '.css');
                const caseInsensMatch = files.find(f => f.toLowerCase() === basename.toLowerCase() || f.toLowerCase() === basename.toLowerCase() + '.ts' || f.toLowerCase() === basename.toLowerCase() + '.tsx' || f.toLowerCase() === basename.toLowerCase() + '.css');
                if(!exactMatch && caseInsensMatch) {
                  console.log('CASE MISMATCH in ' + file + ': imported ' + imp + ' but file is ' + caseInsensMatch);
                }
              }
            }
          });
        }
      }
    }
  });
  return results;
}
walk('src');
console.log('DONE');
