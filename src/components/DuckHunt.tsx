import { useState, useEffect } from "react";

interface Duck {
  id: number;
  x: number;
  y: number;
  speed: number;
  direction: "left" | "right";
  size: number;
  color: string;
}

const RealisticBird = ({ size, color }: { size: number; color: string }) => {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 100 60"
      className="animate-wing-flap"
    >
      {/* Bird Body */}
      <ellipse cx="50" cy="35" rx="15" ry="20" fill={color} />
      
      {/* Bird Head */}
      <circle cx="50" cy="20" r="12" fill={color} />
      
      {/* Beak */}
      <polygon points="50,15 58,18 50,21" fill="#FFA500" />
      
      {/* Eye */}
      <circle cx="53" cy="18" r="2" fill="#000" />
      
      {/* Left Wing - animated */}
      <g className="wing-left" style={{ transformOrigin: "40px 35px" }}>
        <ellipse cx="30" cy="35" rx="25" ry="12" fill={color} opacity="0.9" />
        <path d="M 15,35 Q 20,30 30,32 Q 35,28 40,35" stroke={color} strokeWidth="2" fill="none" opacity="0.7" />
      </g>
      
      {/* Right Wing - animated */}
      <g className="wing-right" style={{ transformOrigin: "60px 35px" }}>
        <ellipse cx="70" cy="35" rx="25" ry="12" fill={color} opacity="0.9" />
        <path d="M 85,35 Q 80,30 70,32 Q 65,28 60,35" stroke={color} strokeWidth="2" fill="none" opacity="0.7" />
      </g>
      
      {/* Tail */}
      <path d="M 35,45 L 30,55 L 35,50 L 40,55 Z" fill={color} opacity="0.8" />
    </svg>
  );
};

export const DuckHunt = () => {
  const [ducks, setDucks] = useState<Duck[]>([]);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    // Spawn ducks periodically
    const spawnInterval = setInterval(() => {
      const birdColors = ["#8B4513", "#654321", "#4A4A4A", "#2C2C2C", "#5D4E37"];
      const newDuck: Duck = {
        id: Date.now(),
        x: Math.random() > 0.5 ? -50 : window.innerWidth + 50,
        y: Math.random() * (window.innerHeight * 0.7) + 50,
        speed: Math.random() * 2 + 2,
        direction: Math.random() > 0.5 ? "left" : "right",
        size: Math.random() * 30 + 50,
        color: birdColors[Math.floor(Math.random() * birdColors.length)],
      };
      setDucks((prev) => [...prev, newDuck]);
    }, 2500);

    return () => clearInterval(spawnInterval);
  }, []);

  useEffect(() => {
    // Animate ducks
    const animationInterval = setInterval(() => {
      setDucks((prev) =>
        prev
          .map((duck) => ({
            ...duck,
            x:
              duck.direction === "right"
                ? duck.x + duck.speed
                : duck.x - duck.speed,
          }))
          .filter(
            (duck) =>
              duck.x > -100 && duck.x < window.innerWidth + 100
          )
      );
    }, 16);

    return () => clearInterval(animationInterval);
  }, []);

  useEffect(() => {
    // Clean up shot effects
    const cleanup = setInterval(() => {
      setShots((prev) => prev.filter((shot) => Date.now() - shot.id < 500));
    }, 100);

    return () => clearInterval(cleanup);
  }, []);

  const shootDuck = (duckId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setDucks((prev) => prev.filter((duck) => duck.id !== duckId));
    setScore((prev) => prev + 1);
    
    // Add shot effect
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setShots((prev) => [
      ...prev,
      { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    ]);

    // Play sound effect (if keystroke sound exists, we can reuse it)
    const audio = new Audio("/sounds/keystroke.mp3");
    audio.volume = 0.3;
    audio.playbackRate = 2;
    audio.play().catch(() => {});
  };

  return (
    <>
      {/* Score Display */}
      {score > 0 && (
        <div className="fixed top-20 right-6 z-[100] pointer-events-none">
          <div className="bg-primary/20 backdrop-blur-md border-2 border-primary rounded-lg px-4 py-2 animate-pulse-slow">
            <p className="text-sm text-primary font-bold font-orbitron">
              🎯 HITS: {score}
            </p>
          </div>
        </div>
      )}

      {/* Flying Ducks */}
      <div className="fixed inset-0 pointer-events-none z-[90] overflow-hidden">
        {ducks.map((duck) => (
          <div
            key={duck.id}
            className="absolute pointer-events-auto cursor-crosshair transition-all hover:scale-110"
            style={{
              left: `${duck.x}px`,
              top: `${duck.y}px`,
              transform: duck.direction === "left" ? "scaleX(-1)" : "scaleX(1)",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
            }}
            onClick={(e) => shootDuck(duck.id, e)}
          >
            <RealisticBird size={duck.size} color={duck.color} />
          </div>
        ))}
      </div>

      {/* Shot Effects */}
      {shots.map((shot) => (
        <div
          key={shot.id}
          className="fixed z-[95] pointer-events-none"
          style={{
            left: `${shot.x}px`,
            top: `${shot.y}px`,
          }}
        >
          <div className="relative">
            {/* Explosion effect */}
            <div className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2">
              <div className="w-full h-full rounded-full bg-accent/60 animate-ping" />
              <div className="absolute inset-0 w-full h-full rounded-full bg-primary/40 animate-ping animation-delay-75" />
            </div>
            {/* Hit marker */}
            <div className="absolute -translate-x-1/2 -translate-y-1/2">
              <div className="text-accent font-bold text-2xl animate-scale-in">
                ✕
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
