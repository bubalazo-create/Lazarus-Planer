const fs = require('fs');
let code = fs.readFileSync('src/views/ProjectFinancialsView/ProjectFinancials.tsx', 'utf8');

// The original file got written as UTF-8 by PowerShell after being read as Windows-1252.
// That means the Euro character (\u20AC) became 3 characters: \u00E2\u20AC\u02DC (a‚¬) or similar.
// In the console it looked like `B,¬`. 
// Actually, let's just restore it properly.
// Any sequence of non-ascii characters directly before a number, `{`, or `$` should be `ˆ`.
code = code.replace(/[^\x00-\x7F]+/g, 'ˆ');

fs.writeFileSync('src/views/ProjectFinancialsView/ProjectFinancials.tsx', code, 'utf8');
console.log("Replaced all non-ASCII with Euro.");
