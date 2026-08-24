const fs = require('fs');
let code = fs.readFileSync('index.tsx', 'utf8');

const regex = /class ErrorBoundary extends React\.Component<[\s\S]*?>/g;
const replacement = `interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null }
class ErrorBoundary extends React.Component<Props, State>`;

code = code.replace(regex, replacement);
fs.writeFileSync('index.tsx', code);
