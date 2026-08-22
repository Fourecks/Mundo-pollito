const fs = require('fs');
let code = fs.readFileSync('components/TodaysAgenda.tsx', 'utf8');

const startTag = '<div\\s+id="main-daily-goal-container"';
const endTag = '<!-- Body: Text Input or Prominent Display -->'; // wait, it's easier to just use regex to replace the whole block

const startIndex = code.indexOf('<div\\n                id="main-daily-goal-container"');
// wait, the actual text is `<div\n                id="main-daily-goal-container"`
