export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gaming Grid Pattern */}
      <div className="gaming-grid absolute inset-0 opacity-30" />
      
      {/* Animated Cyber Orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Neon Corner Accent Lines */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/40" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-secondary/40" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-accent/40" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-primary/40" />
      
      {/* Floating Hexagons */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-12 h-12 border-2 border-primary/20"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            left: `${Math.random() * 90}%`,
            top: `${Math.random() * 90}%`,
            animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};
