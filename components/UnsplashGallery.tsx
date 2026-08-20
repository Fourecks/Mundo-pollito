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
  { id: 'espacio', label: 'Espacio', emoji: '🚀' },
];

const PRESET_VIDEO_CATEGORIES = [
  { id: 'todos', label: 'Todos', emoji: '✨' },
  { id: 'lofi', label: 'Lo-Fi & Relax', emoji: '🎧' },
  { id: 'montaña', label: 'Montañas & Naturaleza', emoji: '🏔️' },
  { id: 'lluvia', label: 'Lluvia & Chimenea', emoji: '🌧️' },
  { id: 'mar', label: 'Playa & Olas', emoji: '🌊' },
  { id: 'espacio', label: 'Espacio & Noche', emoji: '🌌' },
  { id: 'cyberpunk', label: 'Ciudad & Neón', emoji: '🌆' },
];

const CURATED_PHOTOS: UnsplashPhoto[] = [
  // Montaña
  { id: 'm1', category: 'montaña', name: 'Picos Alpinos al Atardecer', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm2', category: 'montaña', name: 'Lago Yosemite Cristalino', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm3', category: 'montaña', name: 'Cumbre Nevada y Sol', url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm4', category: 'montaña', name: 'Noche Estrellada en la Montaña', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm5', category: 'montaña', name: 'Cordillera Elevada', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm6', category: 'montaña', name: 'Sol de Mañana en los Alpes', url: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm7', category: 'montaña', name: 'Monte Fuji al Amanecer', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm8', category: 'montaña', name: 'Dolomitas Italianas', url: 'https://images.unsplash.com/photo-1516655855035-d5215bcb5604?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm9', category: 'montaña', name: 'Patagonia Torres del Paine', url: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm10', category: 'montaña', name: 'Valle entre Montañas', url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm11', category: 'montaña', name: 'Crestas entre Niebla Mística', url: 'https://images.unsplash.com/photo-1480497490787-505ec076689f?auto=format&fit=crop&w=1600&q=80' },
  { id: 'm12', category: 'montaña', name: 'Montañas Doradas', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80' },

  // Cafeteria
  { id: 'c1', category: 'cafeteria', name: 'Café Cálido en Taza', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c2', category: 'cafeteria', name: 'Taza y Granos de Café', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c3', category: 'cafeteria', name: 'Rincón de Lectura Acogedor', url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c4', category: 'cafeteria', name: 'Ventana de Cafetería', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c5', category: 'cafeteria', name: 'Capuchino con Latte Art', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c6', category: 'cafeteria', name: 'Ambiente Tostado Lo-Fi', url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c7', category: 'cafeteria', name: 'Barra de Barista Moderna', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c8', category: 'cafeteria', name: 'Café y Libro Abierto', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c9', category: 'cafeteria', name: 'Espreso en Rincón de Madera', url: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c10', category: 'cafeteria', name: 'Cafetería Vintage', url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c11', category: 'cafeteria', name: 'Mesa con Sol de Mañana', url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=1600&q=80' },
  { id: 'c12', category: 'cafeteria', name: 'Croissant y Café Caliente', url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1600&q=80' },

  // Paisaje
  { id: 'p1', category: 'paisaje', name: 'Valle Verde Extenso', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p2', category: 'paisaje', name: 'Amanecer Dorado en la Colina', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p3', category: 'paisaje', name: 'Niebla de Mañana en la Colina', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p4', category: 'paisaje', name: 'Cascada Natural Impresionante', url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p5', category: 'paisaje', name: 'Reflejo Perfecto en el Lago', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p6', category: 'paisaje', name: 'Cañón al Atardecer', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p7', category: 'paisaje', name: 'Prado Escocés', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p8', category: 'paisaje', name: 'Acantilados en el Océano', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p9', category: 'paisaje', name: 'Río Serpenteante en el Valle', url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p10', category: 'paisaje', name: 'Valle de Islandia', url: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p11', category: 'paisaje', name: 'Desierto Dorado al Atardecer', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'p12', category: 'paisaje', name: 'Bosque y Río Verde', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80' },

  // Flores (Paisajes Florales Reales)
  { id: 'f1', category: 'flores', name: 'Campo de Lavanda en Provenza', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f2', category: 'flores', name: 'Valle de Tulipanes en Holanda', url: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f3', category: 'flores', name: 'Prado de Flores Silvestres Alpinas', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f4', category: 'flores', name: 'Campo Infinito de Girasoles', url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f5', category: 'flores', name: 'Parque de Cerezos Sakura', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f6', category: 'flores', name: 'Colinas de Flores Primaverales', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f7', category: 'flores', name: 'Campo de Amapolas Rojas', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f8', category: 'flores', name: 'Valle de Hortensias Azules', url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f9', category: 'flores', name: 'Sendero de Rosas en Flor', url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f10', category: 'flores', name: 'Flores Silvestres al Atardecer', url: 'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f11', category: 'flores', name: 'Jardín de Magnolias', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'f12', category: 'flores', name: 'Colina de Margaritas', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1600&q=80' },

  // Bosque
  { id: 'b1', category: 'bosque', name: 'Bosque Místico y Mágico', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b2', category: 'bosque', name: 'Rayos de Sol entre Árboles', url: 'https://images.unsplash.com/photo-1511497584788-876761c1193c?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b3', category: 'bosque', name: 'Sendero Otoñal Dorado', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b4', category: 'bosque', name: 'Pinos Dorados y Sol', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b5', category: 'bosque', name: 'Bosque de Bambú Arashiyama', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b6', category: 'bosque', name: 'Secuoyas Gigantes', url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b7', category: 'bosque', name: 'Bosque Verde Húmedo', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b8', category: 'bosque', name: 'Árboles en la Niebla', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b9', category: 'bosque', name: 'Bosque Neval de Pinos', url: 'https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=1600&q=80' },
  { id: 'b10', category: 'bosque', name: 'Camino con Musgo Silvestre', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80' },

  // Atardecer
  { id: 'a1', category: 'atardecer', name: 'Atardecer Marino Dorado', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a2', category: 'atardecer', name: 'Nubes Púrpuras y Rosas', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a3', category: 'atardecer', name: 'Siluetas al Anochecer', url: 'https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a4', category: 'atardecer', name: 'Horizonte Dorado en el Campo', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a5', category: 'atardecer', name: 'Sol Poniente en el Mar', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a6', category: 'atardecer', name: 'Atardecer en la Ciudad', url: 'https://images.unsplash.com/photo-1477959858617-67f30ac4fe78?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a7', category: 'atardecer', name: 'Atardecer con Palmeras', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'a8', category: 'atardecer', name: 'Atardecer en el Muelle', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=80' },

  // Noche
  { id: 'n1', category: 'noche', name: 'Vía Láctea e Infinito', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n2', category: 'noche', name: 'Cielo Estrellado Claro', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n3', category: 'noche', name: 'Aurora Boreal Mágica', url: 'https://images.unsplash.com/photo-1532978379173-523e16f371f2?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n4', category: 'noche', name: 'Campamento bajo las Estrellas', url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n5', category: 'noche', name: 'Galaxia y Polvo Estellar', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80' },
  { id: 'n6', category: 'noche', name: 'Luna Llena en el Lago', url: 'https://images.unsplash.com/photo-1509778268196-857a82f34271?auto=format&fit=crop&w=1600&q=80' },

  // Minimalista
  { id: 'mi1', category: 'minimalista', name: 'Gradiente Pastel Suave', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi2', category: 'minimalista', name: 'Sombras Geométricas', url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi3', category: 'minimalista', name: 'Hoja de Palma y Sombra', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi4', category: 'minimalista', name: 'Muro de Arcilla Minimal', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80' },
  { id: 'mi5', category: 'minimalista', name: 'Niebla Blanca y Árbol Solo', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80' },

  // Ciudad
  { id: 'ci1', category: 'ciudad', name: 'Skyline Nocturno Iluminado', url: 'https://images.unsplash.com/photo-1477959858617-67f30ac4fe78?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci2', category: 'ciudad', name: 'Tokio Bajo la Lluvia Nocturna', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci3', category: 'ciudad', name: 'Callejón de Neón Cyberpunk', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci4', category: 'ciudad', name: 'Rooftop de Nueva York', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ci5', category: 'ciudad', name: 'Puente de Brooklyn al Atardecer', url: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=1600&q=80' },

  // Playa
  { id: 'pl1', category: 'playa', name: 'Agua Turquesa y Arena', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl2', category: 'playa', name: 'Espuma de Olas Suaves', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl3', category: 'playa', name: 'Palmeras y Arena Blanca', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' },
  { id: 'pl4', category: 'playa', name: 'Maldivas Isla Tropical', url: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1600&q=80' },

  // Aesthetic
  { id: 'ae1', category: 'aesthetic', name: 'Luz Cálida Lo-Fi en Habitación', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae2', category: 'aesthetic', name: 'Ventana de Lluvia y Luces', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae3', category: 'aesthetic', name: 'Tocadiscos Vintage', url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=1600&q=80' },
  { id: 'ae4', category: 'aesthetic', name: 'Habitación Neón Lo-Fi', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80' },

  // Espacio
  { id: 'es1', category: 'espacio', name: 'Nebulosa en Espacio Profundo', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80' },
  { id: 'es2', category: 'espacio', name: 'Planeta Tierra desde la Órbita', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80' },
  { id: 'es3', category: 'espacio', name: 'Superficie de la Luna', url: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1600&q=80' },
  { id: 'es4', category: 'espacio', name: 'Galaxia Espiral Brillante', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80' },
];

const CURATED_VIDEO_LOOPS: UnsplashPhoto[] = [
  // Lo-Fi & Relax
  {
    id: 'yt-lofi-1',
    name: 'Lo-Fi Girl - Beats para Estudiar / Relajarse',
    category: 'lofi',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    id: 'yt-lofi-coffee',
    name: 'Café de la Mañana & Lo-Fi Chill',
    category: 'lofi',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=1fueZCTYkpA',
  },
  {
    id: 'yt-lofi-radio',
    name: 'Lo-Fi Radio 24/7 Chill Beats',
    category: 'lofi',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
  },
  {
    id: 'vid-cozy-room',
    name: 'Habitación Acogedora Lofi & Lluvia (Video HD)',
    category: 'lofi',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/5198159/5198159-hd_1920_1080_25fps.mp4',
  },
  {
    id: 'vid-coffee-steam',
    name: 'Vapor de Café Recién Hecho (Video HD)',
    category: 'lofi',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/2903268/2903268-hd_1920_1080_24fps.mp4',
  },

  // Montañas & Naturaleza
  {
    id: 'vid-mountain-snow',
    name: 'Nevada en la Cumbre Alpina (Video HD)',
    category: 'montaña',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4',
  },
  {
    id: 'vid-mountain-waterfall',
    name: 'Cascada en la Montaña Verde (Video HD)',
    category: 'montaña',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4',
  },
  {
    id: 'vid-forest-fog',
    name: 'Niebla Silenciosa sobre el Bosque (Video HD)',
    category: 'montaña',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4',
  },

  // Lluvia & Chimenea
  {
    id: 'yt-rain-window',
    name: 'Lluvia Intensa en la Ventana',
    category: 'lluvia',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=mPZkdNFkNps',
  },
  {
    id: 'yt-rain-night',
    name: 'Lluvia Suave Nocturna para Dormir',
    category: 'lluvia',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=q76bMs-NwRk',
  },
  {
    id: 'vid-rain-glass',
    name: 'Gotas de Lluvia sobre Vidrio (Video HD)',
    category: 'lluvia',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4',
  },
  {
    id: 'yt-fireplace-1',
    name: 'Chimenea Cálida Acogedora',
    category: 'lluvia',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
  },
  {
    id: 'vid-fireplace-flames',
    name: 'Llamas de Fogata Relajante (Video HD)',
    category: 'lluvia',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/1858219/1858219-hd_1920_1080_25fps.mp4',
  },

  // Playa & Olas
  {
    id: 'yt-waves-1',
    name: 'Olas del Mar Relajante',
    category: 'mar',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=vPhg6sc1Mk4',
  },
  {
    id: 'vid-ocean-sunset',
    name: 'Atardecer Dorado en el Mar (Video HD)',
    category: 'mar',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/857032/857032-hd_1920_1080_25fps.mp4',
  },

  // Espacio & Noche
  {
    id: 'vid-starry-sky',
    name: 'Cielo Estrellado y Vía Láctea (Video HD)',
    category: 'espacio',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4',
  },

  // Ciudad & Cyberpunk
  {
    id: 'yt-synthwave-1',
    name: 'Synthwave Cyberpunk Chill Radio',
    category: 'cyberpunk',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    id: 'vid-tokyo-lights',
    name: 'Luces Nocturnas de Tokio (Video HD)',
    category: 'cyberpunk',
    type: 'video',
    url: 'https://videos.pexels.com/video-files/3121459/3121459-hd_1920_1080_24fps.mp4',
  },
];

export const UnsplashGallery: React.FC<UnsplashGalleryProps> = ({
  activeBackground,
  onSelectBackground,
}) => {
  const [galleryTab, setGalleryTab] = useState<'photos' | 'videos' | 'custom_link'>('photos');
  const [selectedCategory, setSelectedCategory] = useState<string>('montaña');
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const [onlineResults, setOnlineResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter photos and videos
  const filteredPhotos = React.useMemo(() => {
    if (galleryTab === 'videos') {
      let list = CURATED_VIDEO_LOOPS;
      if (selectedVideoCategory !== 'todos') {
        list = list.filter(v => v.category === selectedVideoCategory);
      }
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase().trim();
      return list.filter(v => v.name.toLowerCase().includes(q));
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
  }, [galleryTab, searchQuery, selectedCategory, selectedVideoCategory, onlineResults]);

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

          {/* Preset Category Pills for Videos */}
          {galleryTab === 'videos' && !searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {PRESET_VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedVideoCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedVideoCategory === cat.id
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
