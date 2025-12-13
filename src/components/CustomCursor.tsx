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
  const cursorColor = theme === "light" ? "hsl(260 70% 45%)" : "hsl(var(--primary))";
  const shadowColor = theme === "light" ? "rgba(100, 60, 180, 0.3)" : "rgba(168, 85, 247, 0.4)";

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
      className="fixed pointer-events-none z-[10000] transition-all duration-75 ease-out"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Main cursor dot */}
      <div
        className="w-3 h-3 rounded-full transition-transform duration-100"
        style={{
          background: cursorColor,
          boxShadow: `
            0 0 8px ${shadowColor},
            0 2px 8px ${shadowColor},
            0 4px 16px ${shadowColor}
          `,
        }}
      />
      
      {/* Outer ring */}
      <div
        className="absolute inset-0 w-6 h-6 -translate-x-1.5 -translate-y-1.5 rounded-full border transition-all duration-200 opacity-60"
        style={{
          borderColor: cursorColor,
          boxShadow: `0 0 12px ${shadowColor}`,
        }}
      />
    </div>
  );
};
