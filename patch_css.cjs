const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/transform: translateY\(100\%\);/g, 'transform: translateY(100%) !important;');
html = html.replace(/transform: translateY\(0\);/g, 'transform: translateY(0) !important;');
html = html.replace(/transform: translateX\(-120\%\);/g, 'transform: translateX(-120%) !important;');
html = html.replace(/transform: translateX\(120\%\);/g, 'transform: translateX(120%) !important;');
html = html.replace(/transform: translateX\(0\);/g, 'transform: translateX(0) !important;');

fs.writeFileSync('index.html', html);
