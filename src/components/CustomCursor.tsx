import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export const CustomCursor = () => {
  const { theme } = useTheme();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Cursor colors based on theme
  const primaryColor = theme === "light" ? "hsl(260, 70%, 45%)" : "hsl(280, 100%, 70%)";
  const glowColor = theme === "light" ? "rgba(100, 60, 180, 0.4)" : "rgba(200, 100, 255, 0.5)";
  const accentColor = theme === "light" ? "hsl(280, 80%, 55%)" : "hsl(300, 100%, 75%)";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Don't render on mobile devices
  if (isMobile) return null;

  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-4px, -2px)',
      }}
    >
      {/* Arrow cursor SVG with graphics */}
      <svg
        width="28"
        height="34"
        viewBox="0 0 28 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 2px 6px ${glowColor})`,
        }}
      >
        {/* Arrow shape */}
        <path
          d="M2 2L2 26L8 20L13 30L17 28L12 18L20 18L2 2Z"
          fill={primaryColor}
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Inner highlight */}
        <path
          d="M4 6L4 21L8 17L12 25L14 24L10 16L16 16L4 6Z"
          fill="url(#cursorGradient)"
          opacity="0.6"
        />
        
        {/* Small accent details */}
        <circle cx="6" cy="10" r="1" fill={accentColor} opacity="0.8" />
        <circle cx="5" cy="14" r="0.5" fill={accentColor} opacity="0.6" />
        
        <defs>
          <linearGradient id="cursorGradient" x1="4" y1="6" x2="16" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.4" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Trailing glow effect */}
      <div
        className="absolute -inset-2 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: 0.4,
        }}
      />
    </div>
  );
};
