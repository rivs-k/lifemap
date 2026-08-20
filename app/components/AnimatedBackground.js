"use client";
import { useEffect, useRef } from "react";

// Les particules défilent plus vite que les dunes (0.15) mais moins vite que le
// contenu (1) : cet écart entre les couches donne la profondeur.
const FACTEUR_PARALLAXE = 0.35;

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();

    function createParticles() {
      const count = Math.floor((canvas.width * canvas.height) / 6000);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.3 + 0.3,
        speedX: (Math.random() - 1.5) * 0.12,
        speedY: (Math.random() - 1.5) * 0.12,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.006 + 0.002,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
      }));
    }
    createParticles();

    function handleResize() {
      resize();
      createParticles();
    }
    window.addEventListener("resize", handleResize);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Lu une fois par frame, pas une fois par particule.
      const decalage = window.scrollY * FACTEUR_PARALLAXE;

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        p.opacity += p.twinkleSpeed * p.twinkleDir;
        if (p.opacity > 0.8 || p.opacity < 0.15) p.twinkleDir *= -1;

        // Position ramenée dans l'écran : sans ce repli, les particules
        // sortiraient du canvas et le fond se viderait en bas de page.
        let y = (p.y - decalage) % canvas.height;
        if (y < 0) y += canvas.height;

        ctx.beginPath();
        ctx.arc(p.x, y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-30 pointer-events-none" />;
}
