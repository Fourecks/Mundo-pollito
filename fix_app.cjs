const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

const regex = /const renderContent = \(\) => \{\s+switch \(activeTab\) \{([\s\S]*?)\}\s+\};/m;
const match = code.match(regex);

if (match) {
    let casesStr = match[1];
    
    // Manual replacements
    casesStr = casesStr.replace(/case 'home':\s+return \(/, "<div className={activeTab === 'home' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+case 'tasks':/, "\n</div>\n<div className={activeTab === 'tasks' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+case 'projects':/, "\n</div>\n<div className={activeTab === 'projects' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+case 'calendar':/, "\n</div>\n<div className={activeTab === 'calendar' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+case 'habits':/, "\n</div>\n<div className={activeTab === 'habits' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+case 'notes':/, "\n</div>\n<div className={activeTab === 'notes' ? 'h-full flex flex-col' : 'hidden'}>");
    casesStr = casesStr.replace(/\s*\);\s+default:/, "\n</div>\n{/* default ");
    
    // Fix default ending
    casesStr = casesStr.replace(/\s+return null;\s*$/, " */}\n");

    const newRenderContent = `const renderContent = () => {
        return (
            <>
${casesStr}
            </>
        );
    };`;

    code = code.replace(regex, newRenderContent);
    fs.writeFileSync('App.tsx', code);
    console.log("App.tsx updated!");
} else {
    console.log("Regex did not match.");
}
