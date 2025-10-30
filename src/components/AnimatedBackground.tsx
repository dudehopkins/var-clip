import { useEffect, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";

export const AnimatedBackground = () => {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 300);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-mesh)] opacity-60" />
      
      {/* Gradient Orbs with Neon Glow */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float" 
           style={{ boxShadow: 'var(--shadow-neon)' }} />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-secondary/25 rounded-full blur-3xl animate-float-delayed" 
           style={{ boxShadow: '0 0 60px hsl(var(--secondary) / 0.4)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Rotating Geometric Border */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-2 border-primary/10 rounded-full animate-rotate-slow" />
      
      {/* Enhanced Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      
      {/* Glitch Effect Layer */}
      {glitchActive && (
        <div className="absolute inset-0 bg-primary/5 animate-glitch" />
      )}
      
      {/* Geometric Shapes with Enhanced Effects */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated Circles with Glow */}
        <circle cx="10%" cy="20%" r="3" fill="url(#grad1)" className="animate-ping-slow" filter="url(#glow)" />
        <circle cx="90%" cy="80%" r="4" fill="url(#grad2)" className="animate-ping-slower" filter="url(#glow)" />
        <circle cx="50%" cy="50%" r="2.5" fill="url(#grad1)" className="animate-ping-slow" filter="url(#glow)" />
        <circle cx="80%" cy="30%" r="3.5" fill="url(#grad2)" className="animate-ping-slower" filter="url(#glow)" />
        <circle cx="20%" cy="70%" r="3" fill="url(#grad1)" className="animate-ping-slow" filter="url(#glow)" />
        
        {/* Snake Movement Lines */}
        <path d="M0,30 Q250,10 500,30 T1000,30" 
              stroke="url(#grad1)" 
              strokeWidth="2" 
              fill="none" 
              opacity="0.2"
              className="animate-pulse-slow">
          <animate attributeName="d" 
                   dur="4s" 
                   repeatCount="indefinite"
                   values="M0,30 Q250,10 500,30 T1000,30;
                           M0,30 Q250,50 500,30 T1000,30;
                           M0,30 Q250,10 500,30 T1000,30" />
        </path>
        
        <path d="M0,70 Q250,90 500,70 T1000,70" 
              stroke="url(#grad2)" 
              strokeWidth="2" 
              fill="none" 
              opacity="0.2"
              className="animate-pulse-slow">
          <animate attributeName="d" 
                   dur="5s" 
                   repeatCount="indefinite"
                   values="M0,70 Q250,90 500,70 T1000,70;
                           M0,70 Q250,50 500,70 T1000,70;
                           M0,70 Q250,90 500,70 T1000,70" />
        </path>
        
        {/* Animated Lines */}
        <line x1="0%" y1="40%" x2="100%" y2="40%" 
              stroke="hsl(var(--primary))" 
              strokeWidth="1" 
              opacity="0.15" 
              className="animate-slide-x" 
              filter="url(#glow)" />
        <line x1="0%" y1="65%" x2="100%" y2="65%" 
              stroke="hsl(var(--accent))" 
              strokeWidth="1" 
              opacity="0.15" 
              className="animate-slide-x-delayed" 
              filter="url(#glow)" />
      </svg>
      
      {/* Arrow Graphics */}
      <div className="absolute top-1/4 left-0 w-full h-12 overflow-hidden">
        <ArrowRight className="absolute top-1/2 w-8 h-8 text-primary/30 animate-arrow-slide" 
                    style={{ animationDelay: '0s' }} />
        <ArrowRight className="absolute top-1/2 w-8 h-8 text-secondary/30 animate-arrow-slide" 
                    style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="absolute bottom-1/4 left-0 w-full h-12 overflow-hidden">
        <Zap className="absolute top-1/2 w-8 h-8 text-accent/30 animate-arrow-slide" 
             style={{ animationDelay: '0.5s' }} />
        <Zap className="absolute top-1/2 w-8 h-8 text-primary/30 animate-arrow-slide" 
             style={{ animationDelay: '1.5s' }} />
      </div>
    </div>
  );
};
