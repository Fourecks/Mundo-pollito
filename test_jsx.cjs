const fs = require('fs');
const babel = require('@babel/core');
const code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

try {
  babel.transformSync(code, { presets: ['@babel/preset-react', '@babel/preset-typescript'] });
  console.log("Syntax is valid.");
} catch (e) {
  console.log("Error line:", e.loc.line);
  const lines = code.split('\n');
  console.log("Context:");
  for (let i = e.loc.line - 5; i < e.loc.line + 5; i++) {
    console.log(i + 1, lines[i]);
  }
}
