const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf8');

code = code.replace("import { Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video } from 'lucide-react';",
"import { Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video, Search } from 'lucide-react';");

fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
