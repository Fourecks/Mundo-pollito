const fs = require('fs');
let code = fs.readFileSync('components/MobileTasks.tsx', 'utf-8');

if (!code.includes('ChevronDown} from')) {
    code = code.replace("ExternalLink", "ExternalLink, ChevronDown");
    fs.writeFileSync('components/MobileTasks.tsx', code);
}
