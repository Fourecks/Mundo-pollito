const fs = require('fs');
const content = fs.readFileSync('components/CustomizationPanel.tsx', 'utf8');

// Replace custom icons with Lucide icons if any imports are missing
// we can just remove custom icon imports and use standard lucide ones

let newContent = content.replace(/import ParticlesOffIcon from '.\/icons\/ParticlesOffIcon';/, '');
newContent = newContent.replace(/import SnowIcon from '.\/icons\/SnowIcon';/, '');
newContent = newContent.replace(/import RainIcon from '.\/icons\/RainIcon';/, '');
newContent = newContent.replace(/import StarsIcon from '.\/icons\/StarsIcon';/, '');
newContent = newContent.replace(/import BubblesIcon from '.\/icons\/BubblesIcon';/, '');
newContent = newContent.replace(/import SparksIcon from '.\/icons\/SparksIcon';/, '');
newContent = newContent.replace(/import ForestIcon from '.\/icons\/ForestIcon';/, '');
newContent = newContent.replace(/import CoffeeIcon from '.\/icons\/CoffeeIcon';/, '');
newContent = newContent.replace(/import WaveIcon from '.\/icons\/WaveIcon';/, '');
newContent = newContent.replace(/import SoundOffIcon from '.\/icons\/SoundOffIcon';/, '');

// Add lucide icons
newContent = newContent.replace(/import \{ User, X, Upload, Trash2, Star, Image as ImageIconLucide, Video as VideoIconLucide, Volume2 \} from 'lucide-react';/,
`import { User, X, Upload, Trash2, Star, Image as ImageIconLucide, Video as VideoIconLucide, Volume2, CloudOff, Snowflake, CloudRain, Stars, Circle, Zap, TreePine, Coffee, Waves, VolumeX } from 'lucide-react';`);

newContent = newContent.replace(/icon: ParticlesOffIcon/g, 'icon: CloudOff');
newContent = newContent.replace(/icon: SnowIcon/g, 'icon: Snowflake');
newContent = newContent.replace(/icon: RainIcon/g, 'icon: CloudRain');
newContent = newContent.replace(/icon: StarsIcon/g, 'icon: Stars');
newContent = newContent.replace(/icon: BubblesIcon/g, 'icon: Circle');
newContent = newContent.replace(/icon: SparksIcon/g, 'icon: Zap');
newContent = newContent.replace(/icon: SoundOffIcon/g, 'icon: VolumeX');
newContent = newContent.replace(/icon: ForestIcon/g, 'icon: TreePine');
newContent = newContent.replace(/icon: CoffeeIcon/g, 'icon: Coffee');
newContent = newContent.replace(/icon: WaveIcon/g, 'icon: Waves');

fs.writeFileSync('components/CustomizationPanel.tsx', newContent);
