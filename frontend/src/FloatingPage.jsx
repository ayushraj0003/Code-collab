import React, { useEffect, useState } from "react";

const FloatingKeywords = () => {
  const keywords = [
    ";", "{", "}", "if", "else", "const", "let", "return", "=>", "===",
    "function", "var", "null", "true", "false", "while", "for", "async", "await", "import"
  ];

  // Initial positions and velocities for keywords
  const [positions, setPositions] = useState(
    keywords.map(() => ({
      left: Math.random() * 100, // % of viewport width
      top: Math.random() * 100, // % of viewport height
      velocityX: (Math.random() * 2 - 1) * 0.5, // Horizontal velocity (randomized)
      velocityY: (Math.random() * 2 - 1) * 0.5, // Vertical velocity (randomized)
    }))
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPositions(prevPositions =>
        prevPositions.map(pos => {
          // Update positions based on velocity
          let newLeft = pos.left + pos.velocityX;
          let newTop = pos.top + pos.velocityY;

          // Reverse direction when hitting borders (bounce effect)
          if (newLeft <= 0 || newLeft >= 95) pos.velocityX *= -1;
          if (newTop <= 0 || newTop >= 95) pos.velocityY *= -1;

          // Ensure words stay within the bounds
          newLeft = Math.max(0, Math.min(newLeft, 95));
          newTop = Math.max(0, Math.min(newTop, 95));

          return {
            ...pos,
            left: newLeft,
            top: newTop,
          };
        })
      );
    }, 20); // Update every 20ms for smooth animation

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="floating-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {positions.map((pos, index) => (
        <span
          key={index}
          className="keyword"
          style={{
            position: "absolute",
            fontSize: "24px",
            color: "#ff6347",
            left: `${pos.left}vw`,
            top: `${pos.top}vh`,
            transition: "transform 0.02s linear", // Smooth movement
          }}
        >
          {keywords[index]}
        </span>
      ))}

      <style>{`
        .keyword {
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default FloatingKeywords;