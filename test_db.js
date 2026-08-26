import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.example', 'utf-8'); // I need the actual env vars.
