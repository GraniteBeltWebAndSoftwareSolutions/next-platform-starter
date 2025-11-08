"use client";
import { useEffect, useRef, useState } from "react";

export default function Classics() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight * 0.8);

    let player = { x: 50, y: height - 80, width: 50, height: 50, dy: 0, gravity: 1 };
    let obstacles = [];
    let gameSpeed = 6;
    let frame = 0;
    let running = true;

    const spawnObstacle = () => {
      obstacles.push({
        x: width,
        y: height - 50,
        width: 40 + Math.random() * 20,
        height: 40,
      });
    };

    const jump = () => {
      if (!isJumping && player.y >= height - 80) {
        player.dy = -18;
        setIsJumping(true);
      }
    };

    const loop = () => {
      if (!running) return;

      ctx.clearRect(0, 0, width, height);

      // Player
      player.y += player.dy;
      player.dy += player.gravity;
      if (player.y > height - 80) {
        player.y = height - 80;
        player.dy = 0;
        setIsJumping(false);
      }

      ctx.fillStyle = "#4ade80";
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Ground
      ctx.fillStyle = "#444";
      ctx.fillRect(0, height - 30, width, 30);

      // Obstacles
      if (frame % 100 === 0) spawnObstacle();
      ctx.fillStyle = "#ef4444";
      obstacles.forEach((o, i) => {
        o.x -= gameSpeed;
        ctx.fillRect(o.x, o.y, o.width, o.height);

        // Collision
        if (
          player.x < o.x + o.width &&
          player.x + player.width > o.x &&
          player.y < o.y + o.height &&
          player.y + player.height > o.y
        ) {
          running = false;
        }

        if (o.x + o.width < 0) {
          obstacles.splice(i, 1);
          setScore((s) => s + 1);
        }
      });

      frame++;
      requestAnimationFrame(loop);
    };

    loop();

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") jump();
    });

    return () => (running = false);
  }, [isJumping]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black text-white">
      <h1 className="text-3xl font-bold mb-4">Infinite Runner - Classics</h1>
      <p className="mb-2">Score: {score}</p>
      <canvas ref={canvasRef} className="border-2 border-white rounded-lg" />
      <p className="mt-2 text-sm opacity-70">Press SPACE to jump</p>
    </div>
  );
                   }
