import { useEffect, useState } from "react";

export const AdvancedGraphics = () => {
  const [scanlinePosition, setScanlinePosition] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; tx: number; ty: number }>>([]);

  useEffect(() => {
    // Scanline effect
    const scanInterval = setInterval(() => {
      setScanlinePosition((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 50);

    // Generate particles periodically
    const particleInterval = setInterval(() => {
      const newParticle = {
        id: Date.now(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        tx: (Math.random() - 0.5) * 200,
        ty: (Math.random() - 0.5) * 200,
      };
      setParticles((prev) => [...prev.slice(-20), newParticle]);
    }, 500);

    return () => {
      clearInterval(scanInterval);
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
      {/* Morphing Blobs */}
      <div className="absolute top-10 left-1/4 w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 blur-2xl animate-morph" />
      <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-gradient-to-br from-accent/15 to-primary/15 blur-2xl animate-morph" 
           style={{ animationDelay: '2s' }} />
      
      {/* Floating Diagonal Elements */}
      <div className="absolute top-1/3 left-10 w-32 h-32 border border-primary/20 rounded-lg animate-float-diagonal" />
      <div className="absolute bottom-1/3 right-10 w-40 h-40 border border-secondary/20 rounded-lg animate-float-diagonal" 
           style={{ animationDelay: '3s' }} />
      
      {/* Scanline Effect */}
      <div 
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        style={{ top: `${scanlinePosition}%` }}
      />
      
      {/* Particle System */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-primary rounded-full particle"
          style={{
            left: particle.x,
            top: particle.y,
            '--tx': `${particle.tx}px`,
            '--ty': `${particle.ty}px`,
            boxShadow: '0 0 10px hsl(var(--primary))',
          } as React.CSSProperties}
        />
      ))}
      
      {/* Corner Accents with Glitch */}
      <svg className="absolute top-0 left-0 w-32 h-32 opacity-30" viewBox="0 0 100 100">
        <path d="M 0 0 L 100 0 L 100 20 L 20 20 L 20 100 L 0 100 Z" 
              fill="url(#corner-gradient)" 
              className="animate-glitch" />
        <defs>
          <linearGradient id="corner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0.3 }} />
          </linearGradient>
        </defs>
      </svg>
      
      <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-30 rotate-180" viewBox="0 0 100 100">
        <path d="M 0 0 L 100 0 L 100 20 L 20 20 L 20 100 L 0 100 Z" 
              fill="url(#corner-gradient-2)" 
              className="animate-glitch" 
              style={{ animationDelay: '1s' }} />
        <defs>
          <linearGradient id="corner-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.3 }} />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Hexagonal Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
             backgroundSize: '60px 60px',
           }}
      />
    </div>
  );
};
