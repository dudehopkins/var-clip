import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export const CustomCursor = () => {
  const { theme } = useTheme();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<CursorPosition[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);
  
  // Dynamic colors based on theme - much darker in light mode
  const primaryColor = theme === "light" ? "260 80% 25%" : "var(--primary)";
  const secondaryColor = theme === "light" ? "280 85% 30%" : "var(--secondary)";
  const accentColor = theme === "light" ? "300 80% 35%" : "var(--accent)";

  useEffect(() => {
    let movementTimer: NodeJS.Timeout;
    let lastMoveTime = Date.now();

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      setPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Add to trail with timestamp
      setTrail((prev) => {
        const newTrail = [
          ...prev,
          { x: e.clientX, y: e.clientY, timestamp: now },
        ].slice(-20); // Keep last 20 positions
        
        // Remove old trail points (older than 500ms)
        return newTrail.filter((point) => now - point.timestamp < 500);
      });

      clearTimeout(movementTimer);
      movementTimer = setTimeout(() => {
        setIsMoving(false);
        setTrail([]);
      }, 150);

      lastMoveTime = now;
    };

    // Clean up old trail points periodically
    const trailCleanup = setInterval(() => {
      const now = Date.now();
      setTrail((prev) => prev.filter((point) => now - point.timestamp < 500));
    }, 50);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(movementTimer);
      clearInterval(trailCleanup);
    };
  }, []);

  // Don't render on mobile devices
  if (isMobile) return null;

  return (
    <>
      {/* Long exposure trail */}
      {trail.map((point, index) => {
        const age = Date.now() - point.timestamp;
        const opacity = Math.max(0, 1 - age / 500);
        const scale = 0.3 + (index / trail.length) * 0.7;

        return (
          <div
            key={`${point.timestamp}-${index}`}
            className="fixed pointer-events-none z-[9999] mix-blend-screen"
            style={{
              left: point.x,
              top: point.y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity: opacity * 0.6,
            }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{
                background: `radial-gradient(circle, 
                  hsl(${primaryColor}) 0%, 
                  hsl(${secondaryColor}) 50%, 
                  transparent 70%)`,
                boxShadow: `0 0 10px hsl(${primaryColor} / ${opacity * 0.8}),
                           0 0 20px hsl(${secondaryColor} / ${opacity * 0.4})`,
              }}
            />
          </div>
        );
      })}

      {/* Main cursor */}
      <div
        className="fixed pointer-events-none z-[10000] mix-blend-screen transition-transform duration-100"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) ${isMoving ? 'scale(1.2)' : 'scale(1)'}`,
        }}
      >
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 ${
            isMoving ? 'animate-ping' : ''
          }`}
          style={{
            borderColor: `hsl(${primaryColor})`,
            boxShadow: `0 0 20px hsl(${primaryColor} / 0.6),
                       0 0 40px hsl(${secondaryColor} / 0.4)`,
          }}
        />

        {/* Glitch effect when moving */}
        {isMoving && (
          <>
            <div
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-pulse"
              style={{
                borderColor: `hsl(${accentColor})`,
                transform: `translate(calc(-50% + ${Math.sin(Date.now() / 100) * 3}px), calc(-50% + ${Math.cos(Date.now() / 100) * 3}px))`,
                opacity: 0.5,
              }}
            />
            <div
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-pulse"
              style={{
                borderColor: `hsl(${secondaryColor})`,
                transform: `translate(calc(-50% - ${Math.sin(Date.now() / 80) * 2}px), calc(-50% - ${Math.cos(Date.now() / 80) * 2}px))`,
                opacity: 0.4,
              }}
            />
          </>
        )}

        {/* Center dot */}
        <div
          className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `hsl(${primaryColor})`,
            boxShadow: `0 0 10px hsl(${primaryColor}),
                       0 0 20px hsl(${primaryColor} / 0.5)`,
          }}
        />

        {/* Crosshair lines */}
        <div
          className="absolute w-0.5 h-4 -translate-x-1/2 -top-6"
          style={{
            background: `hsl(${primaryColor})`,
            boxShadow: `0 0 5px hsl(${primaryColor})`,
          }}
        />
        <div
          className="absolute w-0.5 h-4 -translate-x-1/2 top-2"
          style={{
            background: `hsl(${primaryColor})`,
            boxShadow: `0 0 5px hsl(${primaryColor})`,
          }}
        />
        <div
          className="absolute w-4 h-0.5 -translate-y-1/2 -left-6"
          style={{
            background: `hsl(${primaryColor})`,
            boxShadow: `0 0 5px hsl(${primaryColor})`,
          }}
        />
        <div
          className="absolute w-4 h-0.5 -translate-y-1/2 left-2"
          style={{
            background: `hsl(${primaryColor})`,
            boxShadow: `0 0 5px hsl(${primaryColor})`,
          }}
        />
      </div>
    </>
  );
};
