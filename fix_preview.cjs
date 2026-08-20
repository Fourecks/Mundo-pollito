const fs = require('fs');
const file = 'components/ProjectEditorPanel.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\s*\{\/\* Live Preview Card \*\/\}.*?\{\/\* Project Name Field \*\/\}/s, '\n\n          {/* Project Name Field */}');
fs.writeFileSync(file, content);
