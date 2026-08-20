import React, { useState, useEffect } from 'react';
import { Background } from '../types';
import { Search, Sparkles, Check, Play, Link, Film, Image as ImageIcon } from 'lucide-react';

interface UnsplashPhoto {
  id: string;
  name: string;
  url: string;
  category: string;
  type?: 'image' | 'video' | 'youtube';
  photographer?: string;
}

interface UnsplashGalleryProps {
  activeBackground: Background | null;
  onSelectBackground: (background: Background | null) => void;
}

const PRESET_CATEGORIES = [
  { id: 'montaña', label: 'Montaña', emoji: '🏔️' },
  { id: 'cafeteria', label: 'Cafetería', emoji: '☕' },
  { id: 'paisaje', label: 'Paisaje', emoji: '🌄' },
  { id: 'flores', label: 'Paisajes Florales', emoji: '🌸' },
  { id: 'bosque', label: 'Bosque', emoji: '🌲' },
  { id: 'atardecer', label: 'Atardecer', emoji: '🌅' },
  { id: 'noche', label: 'Noche', emoji: '🌌' },
  { id: 'minimalista', label: 'Minimalista', emoji: '🍃' },
  { id: 'ciudad', label: 'Ciudad', emoji: '🏢' },
  { id: 'playa', label: 'Playa', emoji: '🌊' },
  { id: 'aesthetic', label: 'Aesthetic', emoji: '🎨' },
];

const CURATED_PHOTOS: UnsplashPhoto[] = [
  // Flores (Paisajes Florales Reales)
  { id: 'f1', category: 'flores', name: 'Campo de Lavanda en Provenza', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f2', category: 'flores', name: 'Valle de Tulipanes en Holanda', url: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f3', category: 'flores', name: 'Prado de Flores Silvestres Alpinas', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f4', category: 'flores', name: 'Campo Infinito de Girasoles', url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f5', category: 'flores', name: 'Parque de Cerezos Sakura', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f6', category: 'flores', name: 'Colinas de Flores Primaverales', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80' },

  // Montaña
  { id: 'm1', category: 'montaña', name: 'Picos Alpinos', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm2', category: 'montaña', name: 'Lago Yosemite', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm3', category: 'montaña', name: 'Cumbre Nevada', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm4', category: 'montaña', name: 'Noche en la Montaña', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm5', category: 'montaña', name: 'Cordillera Elevada', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm6', category: 'montaña', name: 'Sol en los Alpes', url: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?auto=format&fit=crop&w=1600&q=80' },

  // Cafeteria
  { id: 'c1', category: 'cafeteria', name: 'Café Cálido', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c2', category: 'cafeteria', name: 'Taza y Grano', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c3', category: 'cafeteria', name: 'Rincón de Lectura', url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c4', category: 'cafeteria', name: 'Ventana del Café', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c5', category: 'cafeteria', name: 'Capuchino Latte', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c6', category: 'cafeteria', name: 'Ambiente Tostado', url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80' },

  // Paisaje
  { id: 'p1', category: 'paisaje', name: 'Valle Verde', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p2', category: 'paisaje', name: 'Amanecer Dorado', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p3', category: 'paisaje', name: 'Niebla en la Colina', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p4', category: 'paisaje', name: 'Cascada Natural', url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p5', category: 'paisaje', name: 'Reflejo en el Lago', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p6', category: 'paisaje', name: 'Cañón al Atardecer', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80' },

  // Bosque
  { id: 'b1', category: 'bosque', name: 'Bosque Místico', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b2', category: 'bosque', name: 'Rayos entre Árboles', url: 'https://images.unsplash.com/photo-1511497584788-876761c1193c?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b3', category: 'bosque', name: 'Sendero Otoñal', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b4', category: 'bosque', name: 'Pinos Dorados', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80' },

  // Atardecer
  { id: 'a1', category: 'atardecer', name: 'Atardecer Marino', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a2', category: 'atardecer', name: 'Nubes Púrpuras', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a3', category: 'atardecer', name: 'Siluetas al Anochecer', url: 'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=1600&q=80' },

  // Noche
  { id: 'n1', category: 'noche', name: 'Vía Láctea', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n2', category: 'noche', name: 'Cielo Estrellado', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n3', category: 'noche', name: 'Aurora Boreal', url: 'https://images.unsplash.com/photo-1532978379173-523e16f371f2?auto=format&fit=crop&w=1600&q=80' },

  // Minimalista
  { id: 'mi1', category: 'minimalista', name: 'Gradiente Pastel', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi2', category: 'minimalista', name: 'Sombras Geométricas', url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=80' },

  // Ciudad
  { id: 'ci1', category: 'ciudad', name: 'Skyline Nocturno', url: 'https://images.unsplash.com/photo-1477959858617-67f30ac4fe78?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci2', category: 'ciudad', name: 'Tokio Bajo la Lluvia', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80' },

  // Playa
  { id: 'pl1', category: 'playa', name: 'Agua Turquesa', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl2', category: 'playa', name: 'Espuma de Olas', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=80' },

  // Aesthetic
  { id: 'ae1', category: 'aesthetic', name: 'Luz Cálida Lo-Fi', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae2', category: 'aesthetic', name: 'Ventana de Lluvia', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80' },
];

const CURATED_VIDEO_LOOPS: UnsplashPhoto[] = [
  {
    id: 'yt-lofi-1',
    name: 'Lo-Fi Chill & Cafetería',
    category: 'video',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    id: 'yt-rain-1',
    name: 'Lluvia en la Ventana',
    category: 'video',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=mPZkdNFkNps',
  },
  {
    id: 'yt-fireplace-1',
    name: 'Chimenea Acogedora',
    category: 'video',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
  },
  {
    id: 'yt-waves-1',
    name: 'Olas del Mar Tranquilas',
    category: 'video',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=vPhg6sc1Mk4',
  },
  {
    id: 'vid-rain-mp4',
    name: 'Gotas de Lluvia (MP4 Loop)',
    category: 'video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-a-window-pane-16327-large.mp4',
  },
  {
    id: 'vid-coffee-mp4',
    name: 'Vapor de Café (MP4 Loop)',
    category: 'video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-coffee-cup-with-steam-43033-large.mp4',
  },
  {
    id: 'vid-fire-mp4',
    name: 'Fogata Nocturna (MP4 Loop)',
    category: 'video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-burning-fire-41315-large.mp4',
  },
  {
    id: 'vid-aurora-mp4',
    name: 'Aurora Boreal (MP4 Loop)',
    category: 'video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aurora-borealis-over-snowy-mountains-42939-large.mp4',
  },
  {
    id: 'vid-stars-mp4',
    name: 'Cielo Estrellado (MP4 Loop)',
    category: 'video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-starry-sky-at-night-42861-large.mp4',
  },
];

export const UnsplashGallery: React.FC<UnsplashGalleryProps> = ({
  activeBackground,
  onSelectBackground,
}) => {
  const [galleryTab, setGalleryTab] = useState<'photos' | 'videos' | 'custom_link'>('photos');
  const [selectedCategory, setSelectedCategory] = useState<string>('flores');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const [onlineResults, setOnlineResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter photos
  const filteredPhotos = React.useMemo(() => {
    if (galleryTab === 'videos') {
      if (!searchQuery.trim()) return CURATED_VIDEO_LOOPS;
      const q = searchQuery.toLowerCase().trim();
      return CURATED_VIDEO_LOOPS.filter(v => v.name.toLowerCase().includes(q));
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const localMatches = CURATED_PHOTOS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
      if (localMatches.length > 0) return localMatches;
      if (onlineResults.length > 0) return onlineResults;
      return [];
    }

    return CURATED_PHOTOS.filter(p => p.category === selectedCategory);
  }, [galleryTab, searchQuery, selectedCategory, onlineResults]);

  // Live query online fetch
  useEffect(() => {
    if (galleryTab !== 'photos' || !searchQuery.trim() || searchQuery.length < 2) {
      setOnlineResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(searchQuery.trim());
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.unsplash.com/search/photos?query=${query}&per_page=12`)}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.results?.length > 0) {
            const fetched = data.results.map((item: any, i: number) => ({
              id: `unsplash-api-${item.id || i}`,
              name: item.alt_description || item.description || `${searchQuery} ${i + 1}`,
              category: searchQuery,
              url: item.urls?.regular || item.urls?.full || item.urls?.small,
              photographer: item.user?.name
            }));
            setOnlineResults(fetched);
          }
        }
      } catch (err) {
        console.warn("Unsplash search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, galleryTab]);

  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    const isCurrentlyActive = activeBackground?.url === photo.url;
    if (isCurrentlyActive) {
      onSelectBackground(null);
    } else {
      const bgType: 'image' | 'video' | 'youtube' = photo.type || (photo.url.includes('youtube.com') || photo.url.includes('youtu.be') ? 'youtube' : photo.url.endsWith('.mp4') ? 'video' : 'image');
      onSelectBackground({
        id: `unsplash-${photo.id}`,
        name: photo.name,
        type: bgType,
        url: photo.url,
        is_favorite: false
      });
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoUrl.trim()) return;
    const url = customVideoUrl.trim();
    const isYt = url.includes('youtube.com') || url.includes('youtu.be');
    const isVid = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video');

    onSelectBackground({
      id: `custom-link-${Date.now()}`,
      name: isYt ? 'Fondo Animado YouTube' : 'Video Personalizado',
      type: isYt ? 'youtube' : isVid ? 'video' : 'image',
      url: url,
      is_favorite: false
    });
    setCustomVideoUrl('');
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Gallery Mode Selector (Fotos, Videos, Enlace YouTube/MP4) */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
        <button
          onClick={() => { setGalleryTab('photos'); setSearchQuery(''); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            galleryTab === 'photos'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Fotos Unsplash</span>
        </button>
        <button
          onClick={() => { setGalleryTab('videos'); setSearchQuery(''); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            galleryTab === 'videos'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Videos Animados</span>
        </button>
        <button
          onClick={() => setGalleryTab('custom_link')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            galleryTab === 'custom_link'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          <span>YouTube / URL</span>
        </button>
      </div>

      {galleryTab === 'custom_link' ? (
        <form onSubmit={handleApplyCustomUrl} className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Pega la URL de tu video o YouTube:
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Soporta enlaces de YouTube (ej. <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">youtube.com/watch?v=...</code>) o URLs directas de video MP4.
            </p>
            <div className="relative">
              <input
                type="url"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none"
              />
              <Link className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!customVideoUrl.trim()}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Aplicar Fondo Animado</span>
          </button>
        </form>
      ) : (
        <>
          {/* Search Header */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={galleryTab === 'photos' ? "Buscar fotos en Unsplash (ej: café, flores, montaña)..." : "Filtrar fondos animados..."}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/60 text-xs text-gray-900 dark:text-white placeholder-gray-400 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Preset Category Pills for Photos */}
          {galleryTab === 'photos' && !searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Image/Video Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Buscando en Unsplash...</span>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <p>No se encontraron resultados para "{searchQuery}".</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredPhotos.map((photo) => {
                  const isActive = activeBackground?.url === photo.url;
                  const isVid = photo.type === 'video' || photo.type === 'youtube' || photo.url.includes('youtube.com') || photo.url.endsWith('.mp4');

                  return (
                    <div
                      key={photo.id}
                      onClick={() => handleSelectPhoto(photo)}
                      className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800 transition-all border ${
                        isActive
                          ? 'ring-2 ring-blue-500 border-blue-500 shadow-md scale-[1.02]'
                          : 'border-gray-100 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
                      }`}
                    >
                      {isVid && photo.type === 'video' ? (
                        <video src={photo.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <img
                          src={photo.url.includes('youtube.com') ? `https://img.youtube.com/vi/${photo.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]}/hqdefault.jpg` : photo.url}
                          alt={photo.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}

                      {/* Video Indicator Badge */}
                      {isVid && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <Play className="w-3 h-3 fill-current text-blue-400" />
                          <span>Video</span>
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <span className="text-[11px] font-medium text-white truncate drop-shadow-sm">
                          {photo.name}
                        </span>
                      </div>

                      {/* Active Indicator Badge */}
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-md flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="pt-2 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/60">
        <span>Fondos e imágenes de Unsplash y YouTube</span>
      </div>
    </div>
  );
};
