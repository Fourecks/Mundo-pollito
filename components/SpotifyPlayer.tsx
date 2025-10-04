
import React from 'react';

const SpotifyPlayer: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Música</h2>
      <div className="w-full shadow-lg">
        <iframe 
          style={{borderRadius: '12px'}} 
          src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator" 
          width="100%" 
          height="152" 
          frameBorder="0" 
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
          title="Spotify Playlist Player"
          ></iframe>
      </div>
    </div>
  );
};

export default SpotifyPlayer;
