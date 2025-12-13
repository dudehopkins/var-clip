import { useEffect, useState } from "react";

export const CustomCursor = () => {
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
  
  // Dark theme colors
  const primaryColor = "hsl(280, 100%, 70%)";
  const glowColor = "rgba(200, 100, 255, 0.5)";
  const accentColor = "hsl(300, 100%, 75%)";

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
        transform: 'translate(-2px, -1px)',
      }}
    >
      {/* Smaller arrow cursor SVG */}
      <svg
        width="18"
        height="22"
        viewBox="0 0 28 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 3px ${glowColor}) drop-shadow(0 1px 4px ${glowColor})`,
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
        
        <defs>
          <linearGradient id="cursorGradient" x1="4" y1="6" x2="16" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.4" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
