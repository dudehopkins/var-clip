import { useEffect, useState, useRef, useCallback } from "react";

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

export const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const trailRef = useRef<TrailPoint[]>([]);
  const lastTrailUpdate = useRef(0);
  
  const TRAIL_LENGTH = 8;
  const TRAIL_DELAY = 25; // ms between trail updates
  
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

  // Smooth animation loop
  const animate = useCallback((timestamp: number) => {
    const lerpFactor = 0.35;
    
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * lerpFactor;
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * lerpFactor;
    
    setPosition({ x: currentRef.current.x, y: currentRef.current.y });
    
    // Update trail at intervals
    if (timestamp - lastTrailUpdate.current > TRAIL_DELAY) {
      const newPoint = { 
        x: currentRef.current.x, 
        y: currentRef.current.y, 
        opacity: 1 
      };
      
      trailRef.current = [newPoint, ...trailRef.current.slice(0, TRAIL_LENGTH - 1)].map((point, i) => ({
        ...point,
        opacity: 1 - (i / TRAIL_LENGTH)
      }));
      
      setTrail([...trailRef.current]);
      lastTrailUpdate.current = timestamp;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Don't render on mobile devices
  if (isMobile) return null;

  return (
    <>
      {/* Trail effect */}
      {trail.map((point, index) => (
        <div
          key={index}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: point.x,
            top: point.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 6 - index * 0.5,
              height: 6 - index * 0.5,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accentColor}, ${primaryColor})`,
              opacity: point.opacity * 0.6,
              filter: `blur(${index * 0.3}px)`,
              boxShadow: `0 0 ${4 - index * 0.3}px ${glowColor}`,
            }}
          />
        </div>
      ))}
      
      {/* Main cursor */}
      <div
        className="fixed pointer-events-none z-[10000]"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-2px, -1px)',
        }}
      >
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
          <path
            d="M2 2L2 26L8 20L13 30L17 28L12 18L20 18L2 2Z"
            fill={primaryColor}
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          
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
    </>
  );
};
