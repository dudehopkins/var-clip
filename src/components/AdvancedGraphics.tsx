export const AdvancedGraphics = () => {
  return (
    <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
      {/* Neon Particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full animate-particle-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: '100%',
            background: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(var(--secondary))' : 'hsl(var(--accent))',
            animationDuration: `${10 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: 0.6,
          }}
        />
      ))}
      
      {/* Glitch Boxes */}
      {[...Array(4)].map((_, i) => (
        <div
          key={`glitch-${i}`}
          className="absolute w-20 h-20 border border-primary/30 animate-glitch"
          style={{
            left: `${10 + i * 25}%`,
            top: `${30 + (i % 2) * 40}%`,
            animationDelay: `${i * 1.2}s`,
          }}
        />
      ))}
      
      {/* Rotating Hexagon Border */}
      <div className="absolute top-10 right-10 w-40 h-40 animate-rotate-slow opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="none"
            stroke="url(#hexGradient)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(var(--secondary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Corner Tech Brackets */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-primary/60 animate-neon-pulse" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-secondary/60 animate-neon-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-accent/60 animate-neon-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-primary/60 animate-neon-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  );
};
