interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  const primaryColor = "hsl(280, 100%, 70%)";
  const glowColor = "rgba(200, 100, 255, 0.4)";
  const accentColor = "hsl(300, 100%, 75%)";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated loading graphic */}
        <div className="relative w-20 h-20">
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: `3px solid transparent`,
              borderTopColor: primaryColor,
              borderRightColor: accentColor,
              animationDuration: "1.2s",
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            }}
          />
          
          {/* Inner counter-rotating ring */}
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: `2px solid transparent`,
              borderBottomColor: accentColor,
              borderLeftColor: primaryColor,
              animationDuration: "0.8s",
              animationDirection: "reverse",
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
          
          {/* Center pulsing core */}
          <div
            className="absolute inset-5 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
              boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
            }}
          />
          
          {/* Orbiting dots */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-spin"
              style={{
                background: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
                left: "50%",
                top: "50%",
                marginLeft: "-4px",
                marginTop: "-4px",
                transformOrigin: "4px 36px",
                animationDuration: "2s",
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
        
        {/* Loading text with glitch effect */}
        <div className="relative">
          <span
            className="text-lg font-orbitron font-semibold tracking-wider"
            style={{
              color: primaryColor,
              textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
            }}
          >
            {message}
          </span>
          
          {/* Animated underline */}
          <div
            className="h-0.5 mt-2 rounded-full animate-pulse"
            style={{
              background: `linear-gradient(90deg, transparent, ${primaryColor}, ${accentColor}, transparent)`,
              boxShadow: `0 0 8px ${glowColor}`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
