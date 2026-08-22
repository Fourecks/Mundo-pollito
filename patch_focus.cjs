const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const focusEffect = `
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add('focus-mode-active');
    } else {
      document.body.classList.remove('focus-mode-active');
    }
  }, [isFocusMode]);
`;

code = code.replace('const [isFocusMode, setIsFocusMode] = useState(false);', 'const [isFocusMode, setIsFocusMode] = useState(false);\n' + focusEffect);
fs.writeFileSync('App.tsx', code);
