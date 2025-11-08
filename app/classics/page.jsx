import React, { useRef, useEffect, useState } from 'react';

// pages/Game.jsx
// Next.js single-file Game page with an HTML5 Canvas infinite runner
// Built with React + Tailwind classes for layout. Default export a React component.
// Controls: Space / Up Arrow / Tap to jump. R to restart.

export default function GamePage() {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('classic-highscore') || 0);
    return 0;
  });
  const [paused, setPaused] = useState(false);
  const requestRef = useRef();
  const lastTimeRef = useRef(0);
  const gameStateRef = useRef(null);

  // Game configuration
  const config = {
    gravity: 2000, // px/s^2
    groundHeight: 96,
    player: {
      w: 44,
      h: 44,
      startX: 80,
      startYOffset: 0
    },
    obstacleMinGap: 360,
    obstacleMaxGap: 700,
    obstacleSpeedStart: 480,
    obstacleAcceleration: 20, // per second
    spawnEarlyTime: 1200
  };

  // Initialize game state
  const resetGameState = () => ({
    player: {
      x: config.player.startX,
      y: 0,
      vy: 0,
      width: config.player.w,
      height: config.player.h,
      grounded: false
    },
    obstacles: [],
    lastSpawnX: 0,
    speed: config.obstacleSpeedStart,
    score: 0,
    running: true,
    groundOffset: 0
  });

  useEffect(() => {
    gameStateRef.current = resetGameState();
  }, []);

  // Input handlers
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
        e.preventDefault();
      }
      if (e.key === 'r' || e.key === 'R') {
        restart();
      }
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
      }
    };

    const handleTouch = (e) => {
      jump();
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  function jump() {
    const state = gameStateRef.current;
    if (!state) return;
    if (!state.running) return;
    if (state.player.grounded) {
      state.player.vy = -820; // impulse up
      state.player.grounded = false;
    } else {
      // allow a small mid-air hop (double-tap style) if you want; here it's disabled
    }
  }

  function restart() {
    gameStateRef.current = resetGameState();
    setScore(0);
    setRunning(true);
    lastTimeRef.current = 0;
  }

  function togglePause() {
    setPaused((p) => !p);
  }

  // Simple rectangle collision
  function rectsCollide(a, b) {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  // Spawn obstacles (simple blocks)
  function spawnObstacle(canvasW) {
    const state = gameStateRef.current;
    const gap = config.obstacleMinGap + Math.random() * (config.obstacleMaxGap - config.obstacleMinGap);
    const lastX = state.lastSpawnX || canvasW;
    const x = canvasW + gap;
    const h = 36 + Math.random() * 64;
    const obstacle = {
      x,
      y: canvasW * 0 + (/* we'll place on ground */ 0),
      width: 28 + Math.random() * 48,
      height: h
    };
    state.obstacles.push(obstacle);
    state.lastSpawnX = x;
  }

  // Main draw + update loop using canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(canvas.clientWidth);
      const h = Math.floor(canvas.clientHeight);
      canvas.width = Math.max(320, Math.floor(w * dpr));
      canvas.height = Math.max(240, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    function loop(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(40, timestamp - lastTimeRef.current) / 1000; // cap dt to avoid huge jumps
      lastTimeRef.current = timestamp;

      if (!gameStateRef.current) gameStateRef.current = resetGameState();
      const state = gameStateRef.current;

      if (!paused && state.running) {
        // update physics
        const p = state.player;
        p.vy += config.gravity * dt;
        p.y += p.vy * dt;

        const groundY = canvas.height / (window.devicePixelRatio || 1) - config.groundHeight - p.height + config.player.startYOffset;

        if (p.y >= groundY) {
          p.y = groundY;
          p.vy = 0;
          p.grounded = true;
        }

        // move obstacles
        state.obstacles.forEach((o) => (o.x -= state.speed * dt));

        // accelerate difficulty
        state.speed += config.obstacleAcceleration * dt;

        // remove off-screen obstacles
        state.obstacles = state.obstacles.filter((o) => o.x + o.width > -100);

        // spawn new obstacles
        const lastX = state.obstacles.length ? state.obstacles[state.obstacles.length - 1].x : -Infinity;
        if (state.obstacles.length === 0 || lastX < canvas.width - config.spawnEarlyTime) {
          spawnObstacle(canvas.width);
        }

        // update score
        state.score += Math.floor(state.speed * dt * 0.05);
        if (state.score > score) setScore(state.score);

        // ground offset for parallax
        state.groundOffset = (state.groundOffset + state.speed * dt) % 60;

        // collision detection
        for (let i = 0; i < state.obstacles.length; i++) {
          const o = state.obstacles[i];
          const playerRect = { x: p.x, y: p.y, width: p.width, height: p.height };
          const obstacleRect = {
            x: o.x,
            y: canvas.height / (window.devicePixelRatio || 1) - config.groundHeight - o.height,
            width: o.width,
            height: o.height
          };
          if (rectsCollide(playerRect, obstacleRect)) {
            // game over
            state.running = false;
            setRunning(false);
            if (state.score > highScore) {
              try { localStorage.setItem('classic-highscore', String(state.score)); } catch (e) {}
              setHighScore(state.score);
            }
          }
        }
      }

      // draw
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const vw = canvas.width / (window.devicePixelRatio || 1);
      const vh = canvas.height / (window.devicePixelRatio || 1);

      // background sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, vh);
      skyGradient.addColorStop(0, '#8fd3f4');
      skyGradient.addColorStop(1, '#a8e6ff');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, vw, vh);

      // sun
      ctx.beginPath();
      ctx.arc(vw - 80, 80, 36, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 240, 120, 0.95)';
      ctx.fill();

      // ground
      const groundTop = vh - config.groundHeight;
      ctx.fillStyle = '#6b8e23';
      ctx.fillRect(0, groundTop, vw, config.groundHeight);

      // ground pattern (simple strips)
      ctx.save();
      ctx.translate(-state.groundOffset, 0);
      for (let x = -60; x < vw + 60; x += 60) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, groundTop + 18, 40, 8);
      }
      ctx.restore();

      // draw player (a simple block with a face)
      const p = gameStateRef.current.player;
      const playerY = (p.y === 0 ? (vh - config.groundHeight - p.height) : p.y);
      // body
      ctx.fillStyle = '#222222';
      ctx.fillRect(p.x, playerY, p.width, p.height);
      // eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 8, playerY + 12, 6, 6);
      ctx.fillRect(p.x + p.width - 14, playerY + 12, 6, 6);
      // mouth
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(p.x + 10, playerY + p.height - 12, p.width - 20, 6);

      // draw obstacles
      gameStateRef.current.obstacles.forEach((o) => {
        const ox = o.x;
        const oy = vh - config.groundHeight - o.height;
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(ox, oy, o.width, o.height);
        // top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox + 4, oy + 4, o.width - 8, 6);
      });

      // UI: score
      ctx.font = '20px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
      ctx.fillStyle = '#082032';
      ctx.fillText(`Score: ${score}`, 16, 32);
      ctx.fillText(`High: ${highScore}`, 16, 58);

      if (!gameStateRef.current.running) {
        // overlay
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, vw, vh);
        ctx.fillStyle = '#fff';
        ctx.font = '36px ui-sans-serif';
        ctx.fillText('Game Over', vw / 2 - 90, vh / 2 - 20);
        ctx.font = '18px ui-sans-serif';
        ctx.fillText('Press R to restart', vw / 2 - 86, vh / 2 + 18);
      }

      requestRef.current = requestAnimationFrame(loop);
    }

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-sky-100 to-sky-50 p-6">
      <header className="w-full max-w-4xl flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Classics — Infinite Runner</h1>
        <div className="space-x-3 text-sm text-slate-700">
          <span>Tap screen or press Space / ↑ to jump, Bucko</span>
          <span>·</span>
          <span>P to pause</span>
          <span>·</span>
          <span>R to restart</span>
        </div>
      </header>

      <main className="w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white">
        <div className="relative" style={{ height: 420 }}>
          <canvas ref={canvasRef} className="w-full h-full block" style={{ background: 'transparent' }} />
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-medium">Score <strong className="ml-2">{score}</strong></div>
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm">High <strong className="ml-2">{highScore}</strong></div>
          </div>

          {!running && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 text-white p-6 rounded-xl text-center backdrop-blur-sm pointer-events-auto">
                <h2 className="text-xl font-bold">Game Over</h2>
                <p className="mt-2">Score: {score} — High: {highScore}</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={() => restart()} className="bg-white text-black px-4 py-2 rounded-lg">Restart</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 text-xs text-center text-slate-600">Built as a Next.js classics page starter — optimized for Netlify static export. Use <code>npm run build</code> and deploy the output to Netlify.</footer>
      </main>
    </div>
  );
      }
      
