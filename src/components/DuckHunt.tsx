import { useState, useEffect } from "react";
import { Bird } from "lucide-react";

interface Duck {
  id: number;
  x: number;
  y: number;
  speed: number;
  direction: "left" | "right";
  size: number;
}

export const DuckHunt = () => {
  const [ducks, setDucks] = useState<Duck[]>([]);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    // Spawn ducks periodically
    const spawnInterval = setInterval(() => {
      const newDuck: Duck = {
        id: Date.now(),
        x: Math.random() > 0.5 ? -50 : window.innerWidth + 50,
        y: Math.random() * (window.innerHeight * 0.7) + 50,
        speed: Math.random() * 2 + 1.5,
        direction: Math.random() > 0.5 ? "left" : "right",
        size: Math.random() * 20 + 30,
      };
      setDucks((prev) => [...prev, newDuck]);
    }, 3000);

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
            className="absolute pointer-events-auto cursor-crosshair transition-transform hover:scale-110"
            style={{
              left: `${duck.x}px`,
              top: `${duck.y}px`,
              transform: duck.direction === "left" ? "scaleX(-1)" : "scaleX(1)",
            }}
            onClick={(e) => shootDuck(duck.id, e)}
          >
            <Bird
              className="text-secondary drop-shadow-lg animate-float"
              style={{
                width: `${duck.size}px`,
                height: `${duck.size}px`,
                filter: "drop-shadow(0 0 8px hsl(var(--secondary) / 0.6))",
              }}
            />
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
