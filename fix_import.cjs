const fs = require('fs');
let code = fs.readFileSync('components/MobileTasks.tsx', 'utf-8');
if (!code.includes('ChevronDown')) {
    code = code.replace('ExternalLink', 'ExternalLink,\n    ChevronDown');
    fs.writeFileSync('components/MobileTasks.tsx', code);
}
