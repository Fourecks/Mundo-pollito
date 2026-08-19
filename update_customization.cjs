const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf8');

// The file might still have <CustomizationPanel ...
// We need to make sure the prop is passed accurately as `onLogout={handleLogout}` since that is the correct function

appContent = appContent.replace(/<CustomizationPanel([\s\S]*?)onLogout=\{onLogout\}/g, '<CustomizationPanel$1onLogout={handleLogout}');

fs.writeFileSync('App.tsx', appContent);
