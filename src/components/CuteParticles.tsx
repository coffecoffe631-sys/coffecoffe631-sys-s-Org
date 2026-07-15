import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  emoji: string;
  opacity: number;
  tx: number; // target X translation
  ty: number; // target Y translation
  duration: number;
  delay: number;
}

interface CuteParticlesProps {
  burstTrigger?: number; // Increment this to fire an explosion
  ambient?: boolean; // Enable gentle floating background particles
  count?: number; // Base count for burst
}

const CUTE_EMOJIS = ['✨', '⭐', '☕', '🍃', '🫧', '🌟', '🫘'];

export default function CuteParticles({ burstTrigger = 0, ambient = false, count = 20 }: CuteParticlesProps) {
  const [burstParticles, setBurstParticles] = useState<Particle[]>([]);

  // 1. High density transient burst handling
  useEffect(() => {
    if (burstTrigger === 0) return;

    // Use smaller count on mobile to prevent any performance drops
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const finalCount = isMobile ? Math.min(count, 12) : count;

    // Generate burst particles originating from center-bottom
    const newBurst: Particle[] = Array.from({ length: finalCount }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / finalCount + (Math.random() - 0.5) * 0.5; // spread circular
      const distance = isMobile ? 60 + Math.random() * 80 : 80 + Math.random() * 140; // expand distance
      return {
        id: Math.random() + Date.now() + i,
        x: 50, // Origin X (50% is center)
        y: 75, // Origin Y (75% is near the buttons)
        scale: 0.6 + Math.random() * 1.0,
        rotation: Math.random() * 720 - 360,
        emoji: CUTE_EMOJIS[Math.floor(Math.random() * CUTE_EMOJIS.length)],
        opacity: 1,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance - 60,
        duration: 1.0 + Math.random() * 0.6,
        delay: 0,
      };
    });

    setBurstParticles((prev) => [...prev, ...newBurst]);

    // Clean up burst particles after they finish animating to keep DOM clean
    const timer = setTimeout(() => {
      setBurstParticles([]);
    }, 2000);

    return () => clearTimeout(timer);
  }, [burstTrigger, count]);

  // 2. Generate a static list of ambient particles so they never trigger state updates or re-renders
  const ambientParticles = useMemo(() => {
    if (!ambient) return [];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const size = isMobile ? 6 : 14; // drastically reduce count on mobile to keep device cool

    return Array.from({ length: size }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage left
      y: 105, // start just below viewport
      scale: 0.5 + Math.random() * 0.6,
      rotation: (Math.random() - 0.5) * 360,
      emoji: CUTE_EMOJIS[Math.floor(Math.random() * CUTE_EMOJIS.length)],
      opacity: 0.15 + Math.random() * 0.4,
      tx: (Math.random() - 0.5) * 60, // drift horizontally
      ty: -(500 + Math.random() * 300), // float upwards
      duration: 10 + Math.random() * 12, // slow, gentle float
      delay: Math.random() * -15, // negative delay so they start scattered initially
    }));
  }, [ambient]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[400] w-full h-full">
      {/* High-performance CSS Keyframes for ambient floating */}
      {ambient && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes ambient-float {
            0% {
              transform: translate3d(-50%, 0, 0) scale(0.2);
              opacity: 0;
            }
            15% {
              opacity: var(--p-opacity);
            }
            85% {
              opacity: var(--p-opacity);
            }
            100% {
              transform: translate3d(calc(-50% + var(--p-tx)), var(--p-ty), 0) scale(var(--p-scale)) rotate(var(--p-rotation));
              opacity: 0;
            }
          }
          .ambient-particle {
            will-change: transform, opacity;
            backface-visibility: hidden;
            transform-style: preserve-3d;
          }
        `}} />
      )}

      {/* Render Ambient Particles with pure CSS animations (zero React state updates, 60fps GPU compositor) */}
      {ambientParticles.map((p) => (
        <div
          key={p.id}
          className="absolute text-lg sm:text-xl select-none pointer-events-none ambient-particle"
          style={{
            left: `${p.x}%`,
            top: '100%',
            animation: `ambient-float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
            '--p-opacity': p.opacity,
            '--p-tx': `${p.tx}px`,
            '--p-ty': `${p.ty}px`,
            '--p-scale': p.scale,
            '--p-rotation': `${p.rotation}deg`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}

      {/* Burst particles are short-lived, so we can render them with motion.div safely */}
      <AnimatePresence>
        {burstParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              scale: 0.2,
              opacity: p.opacity,
              rotate: 0,
            }}
            animate={{
              x: p.tx,
              y: p.ty,
              scale: p.scale,
              opacity: [p.opacity, p.opacity, 0],
              rotate: p.rotation,
            }}
            transition={{
              duration: p.duration,
              ease: 'easeOut',
            }}
            className="absolute text-xl sm:text-2xl select-none filter drop-shadow-sm pointer-events-none"
            style={{
              transform: 'translate(-50%, -50%)',
              willChange: 'transform, opacity',
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
