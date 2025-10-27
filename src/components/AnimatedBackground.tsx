export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Floating Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Geometric Shapes */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        
        {/* Animated Circles */}
        <circle cx="10%" cy="20%" r="2" fill="url(#grad1)" className="animate-ping-slow" />
        <circle cx="90%" cy="80%" r="3" fill="url(#grad1)" className="animate-ping-slower" />
        <circle cx="50%" cy="50%" r="2" fill="url(#grad1)" className="animate-ping-slow" />
        <circle cx="80%" cy="30%" r="2.5" fill="url(#grad1)" className="animate-ping-slower" />
        <circle cx="20%" cy="70%" r="2" fill="url(#grad1)" className="animate-ping-slow" />
        
        {/* Animated Lines */}
        <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" className="animate-slide-x" />
        <line x1="0%" y1="60%" x2="100%" y2="60%" stroke="hsl(var(--accent))" strokeWidth="0.5" opacity="0.1" className="animate-slide-x-delayed" />
      </svg>
    </div>
  );
};
