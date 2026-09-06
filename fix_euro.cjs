const fs = require('fs');
let code = fs.readFileSync('src/views/ProjectFinancialsView/ProjectFinancials.tsx', 'utf8');

// The corrupt symbol appears right before `{` in `'{inv.netAmount`
// It looks like `'` in PowerShell console, which usually means replacement chars.
// We can use a regex to find any non-ascii characters before `{` that are meant to be currency symbols.
code = code.replace(/[^\x00-\x7F]+\{/g, 'ˆ{');

fs.writeFileSync('src/views/ProjectFinancialsView/ProjectFinancials.tsx', code, 'utf8');
console.log("Fixed!");
