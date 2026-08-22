const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/z-index: 70000;/g, 'z-index: 70000 !important;');

fs.writeFileSync('index.html', html);
