const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

if (!code.includes('createPortal')) {
    code = code.replace(/import React, \{ useState, useEffect, useRef, useMemo \} from 'react';/, "import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport { createPortal } from 'react-dom';");
    fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
    console.log("createPortal imported!");
}
