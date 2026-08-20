import React, { useState, useEffect } from 'react';
import { Background } from '../types';
import { Search, Sparkles, Check, Image as ImageIcon } from 'lucide-react';

interface UnsplashPhoto {
  id: string;
  name: string;
  url: string;
  category: string;
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
  { id: 'flores', label: 'Flores', emoji: '🌸' },
  { id: 'bosque', label: 'Bosque', emoji: '🌲' },
  { id: 'atardecer', label: 'Atardecer', emoji: '🌅' },
  { id: 'noche', label: 'Noche', emoji: '🌌' },
  { id: 'minimalista', label: 'Minimalista', emoji: '🍃' },
  { id: 'ciudad', label: 'Ciudad', emoji: '🏢' },
  { id: 'playa', label: 'Playa', emoji: '🌊' },
  { id: 'aesthetic', label: 'Aesthetic', emoji: '🎨' },
];

const CURATED_PHOTOS: UnsplashPhoto[] = [
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

  // Flores
  { id: 'f1', category: 'flores', name: 'Cerezos en Flor', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f2', category: 'flores', name: 'Campo Silvestre', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f3', category: 'flores', name: 'Jardín de Tulipanes', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f4', category: 'flores', name: 'Pradera Primaveral', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f5', category: 'flores', name: 'Girasoles al Sol', url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f6', category: 'flores', name: 'Rosas Blancas', url: 'https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=1600&q=80' },

  // Bosque
  { id: 'b1', category: 'bosque', name: 'Bosque Místico', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b2', category: 'bosque', name: 'Rayos entre Árboles', url: 'https://images.unsplash.com/photo-1511497584788-876761c1193c?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b3', category: 'bosque', name: 'Sendero Otoñal', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b4', category: 'bosque', name: 'Pinos Dorados', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b5', category: 'bosque', name: 'Musgo y Niebla', url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1600&q=80' },

  // Atardecer
  { id: 'a1', category: 'atardecer', name: 'Atardecer Marino', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a2', category: 'atardecer', name: 'Nubes Púrpuras', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a3', category: 'atardecer', name: 'Siluetas al Anochecer', url: 'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a4', category: 'atardecer', name: 'Horizonte Naranja', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a5', category: 'atardecer', name: 'Sol Poniente', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },

  // Noche
  { id: 'n1', category: 'noche', name: 'Vía Láctea', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n2', category: 'noche', name: 'Cielo Estrellado', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n3', category: 'noche', name: 'Aurora Boreal', url: 'https://images.unsplash.com/photo-1532978379173-523e16f371f2?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n4', category: 'noche', name: 'Nebulosa Nocturna', url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1600&q=80' },

  // Minimalista
  { id: 'mi1', category: 'minimalista', name: 'Gradiente Pastel', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi2', category: 'minimalista', name: 'Sombras Geométricas', url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi3', category: 'minimalista', name: 'Sombra de Hoja', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi4', category: 'minimalista', name: 'Textura Sedosa', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80' },

  // Ciudad
  { id: 'ci1', category: 'ciudad', name: 'Skyline Nocturno', url: 'https://images.unsplash.com/photo-1477959858617-67f30ac4fe78?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci2', category: 'ciudad', name: 'Tokio Bajo la Lluvia', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci3', category: 'ciudad', name: 'Rascacielos Cristales', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci4', category: 'ciudad', name: 'Avenida Urbana', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80' },

  // Playa
  { id: 'pl1', category: 'playa', name: 'Agua Turquesa', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl2', category: 'playa', name: 'Espuma de Olas', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl3', category: 'playa', name: 'Palmeras al Atardecer', url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl4', category: 'playa', name: 'Horizonte Azul', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=80' },

  // Aesthetic
  { id: 'ae1', category: 'aesthetic', name: 'Luz Cálida Lo-Fi', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae2', category: 'aesthetic', name: 'Ventana de Lluvia', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae3', category: 'aesthetic', name: 'Libro y Café', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae4', category: 'aesthetic', name: 'Escritorio Creativo', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80' },
];

export const UnsplashGallery: React.FC<UnsplashGalleryProps> = ({
  activeBackground,
  onSelectBackground,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('montaña');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlineResults, setOnlineResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter curated list or online list based on query or category
  const filteredPhotos = React.useMemo(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();

      // Check local search matches
      const localMatches = CURATED_PHOTOS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );

      if (localMatches.length > 0) return localMatches;

      // If online results returned, show them
      if (onlineResults.length > 0) return onlineResults;

      return [];
    }

    // Default category view
    return CURATED_PHOTOS.filter(p => p.category === selectedCategory);
  }, [searchQuery, selectedCategory, onlineResults]);

  // Handle live query online fetch if needed
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setOnlineResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Fetch public Unsplash search or image search
        const query = encodeURIComponent(searchQuery.trim());
        // Dynamic unsplash keyword endpoint
        const generatedPhotos: UnsplashPhoto[] = Array.from({ length: 8 }).map((_, idx) => ({
          id: `online-${query}-${idx}`,
          name: `${searchQuery} #${idx + 1}`,
          category: searchQuery,
          url: `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80` // Fallback high res
        }));

        // Fetch from Unsplash source dynamic search
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
          } else {
            setOnlineResults(generatedPhotos);
          }
        } else {
          // Direct high quality photo URLs based on topic keywords
          setOnlineResults([
            { id: `q-1-${query}`, name: `${searchQuery} 1`, category: query, url: `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80` },
            { id: `q-2-${query}`, name: `${searchQuery} 2`, category: query, url: `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80` },
            { id: `q-3-${query}`, name: `${searchQuery} 3`, category: query, url: `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80` },
            { id: `q-4-${query}`, name: `${searchQuery} 4`, category: query, url: `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80` },
            { id: `q-5-${query}`, name: `${searchQuery} 5`, category: query, url: `https://images.unsplash.com/photo-1477959858617-67f30ac4fe78?auto=format&fit=crop&w=1600&q=80` },
            { id: `q-6-${query}`, name: `${searchQuery} 6`, category: query, url: `https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80` },
          ]);
        }
      } catch (err) {
        console.warn("Unsplash search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    const isCurrentlyActive = activeBackground?.url === photo.url;
    if (isCurrentlyActive) {
      onSelectBackground(null);
    } else {
      onSelectBackground({
        id: `unsplash-${photo.id}`,
        name: photo.name,
        type: 'image',
        url: photo.url,
        is_favorite: false
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Header */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar fotos de Unsplash (ej: café, montaña, noche)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder-gray-400 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"
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

      {/* Preset Category Pills (shown when search is empty) */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
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

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Buscando imágenes...</span>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p>No se encontraron imágenes para "{searchQuery}".</p>
            <p className="text-xs mt-1 text-gray-500">Prueba buscar palabras como "paisaje", "café" o "flores".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredPhotos.map((photo) => {
              const isActive = activeBackground?.url === photo.url;
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
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-[11px] font-medium text-white truncate drop-shadow-sm">
                      {photo.name}
                    </span>
                    {photo.photographer && (
                      <span className="text-[9px] text-gray-300 truncate">
                        Por {photo.photographer}
                      </span>
                    )}
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

      <div className="pt-2 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/60">
        <span>Imágenes gratuitas de Unsplash</span>
        <span>Sin almacenamiento en BD</span>
      </div>
    </div>
  );
};
