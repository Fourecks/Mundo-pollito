const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf8');
appContent = appContent.replace(/<CustomizationPanel([\s\S]*?)isMobile/g, '<CustomizationPanel$1currentUser={currentUser}\n              onLogout={onLogout}\n              isMobile');

appContent = appContent.replace(/<CustomizationPanel\s+progressEmoji/g, '<CustomizationPanel\n        currentUser={currentUser}\n        onLogout={onLogout}\n        progressEmoji');

fs.writeFileSync('App.tsx', appContent);
