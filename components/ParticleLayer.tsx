import React from 'react';
import { ParticleType } from '../types';

interface ParticleLayerProps {
  type: ParticleType;
}

// Simple CSS-based particles. In a real-world scenario, a library like particles.js or tsParticles would be better.
const Particle: React.FC<{ style: React.CSSProperties }> = ({ style }) => <div className="particle" style={style} />;

const createParticles = (count: number, createStyle: (i: number) => React.CSSProperties) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
        particles.push(<Particle key={i} style={createStyle(i)} />);
    }
    return particles;
};

const ParticleLayer: React.FC<ParticleLayerProps> = ({ type }) => {
    if (type === 'none') {
        return null;
    }

    let particles = null;
    let styles = '';

    switch (type) {
        case 'snow':
            particles = createParticles(100, i => ({
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 6 + 3}px`,
                height: `${Math.random() * 6 + 3}px`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${Math.random() * 10 + 5}s`,
            }));
            styles = `
                .particle {
                    position: absolute;
                    top: -20px;
                    background-color: white;
                    border-radius: 50%;
                    opacity: 0.7;
                    animation-name: fall;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
                @keyframes fall {
                    to {
                        transform: translateY(calc(100vh + 30px)) rotate(600deg);
                        opacity: 0;
                    }
                }
            `;
            break;
        
        case 'rain':
            particles = createParticles(150, i => ({
                left: `${Math.random() * 100}%`,
                width: '1px',
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 0.5 + 0.3}s`,
            }));
             styles = `
                .particle {
                    position: absolute;
                    top: -30px;
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.4));
                    animation-name: fall-rain;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
                @keyframes fall-rain {
                    to {
                        transform: translateY(calc(100vh + 40px));
                    }
                }
            `;
            break;

        case 'stars':
            particles = createParticles(80, i => ({
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                animationDelay: `${Math.random() * 5}s`,
            }));
            styles = `
                .particle {
                    position: absolute;
                    background-color: white;
                    border-radius: 50%;
                    animation: twinkle 1.5s infinite alternate;
                }
                @keyframes twinkle {
                    0% { opacity: 0.3; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1.2); }
                }
            `;
            break;

        case 'bubbles':
            particles = createParticles(40, i => ({
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 20 + 5}px`,
                height: `${Math.random() * 20 + 5}px`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${Math.random() * 10 + 8}s`,
            }));
            styles = `
                .particle {
                    position: absolute;
                    bottom: -30px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    animation-name: rise;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
                @keyframes rise {
                    to {
                        transform: translateY(-105vh);
                        opacity: 0;
                    }
                }
            `;
            break;
            
        case 'sparks':
             particles = createParticles(50, i => ({
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${Math.random() * 2}s`,
            }));
            styles = `
                .particle {
                    position: absolute;
                    background-color: #ffd700;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700;
                    animation: flicker 0.5s infinite alternate;
                }
                 @keyframes flicker {
                    0% { opacity: 0.5; transform: scale(0.5); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `;
            break;

        default:
            return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none -z-10">
            <style>{styles}</style>
            {particles}
        </div>
    );
};

export default ParticleLayer;