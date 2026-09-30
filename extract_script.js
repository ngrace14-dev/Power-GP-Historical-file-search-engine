const fs = require('fs');
const content = fs.readFileSync('lighthouse.html', 'utf8');
const scriptMatch = content.match(/<script type="module">([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync('test_script.js', scriptMatch[1]);
}