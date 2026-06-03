import React, { useEffect, useState } from 'react';
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
}

interface CuteParticlesProps {
  burstTrigger?: number; // Increment this to fire an explosion
  ambient?: boolean; // Enable gentle floating background particles
  count?: number; // Base count for burst
}

const CUTE_EMOJIS = ['✨', '⭐', '☕', '🍃', '🫧', '🌟', '🫘'];

export default function CuteParticles({ burstTrigger = 0, ambient = false, count = 28 }: CuteParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  // 1. Gentle ambient background particles floating
  useEffect(() => {
    if (!ambient) return;

    // Initialize initial ambient particles
    const initialParticles: Particle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: Math.random() + i,
      x: Math.random() * 100, // percentage x
      y: Math.random() * 100 + 100, // start below or at several heights
      scale: 0.5 + Math.random() * 0.7,
      rotation: Math.random() * 360,
      emoji: CUTE_EMOJIS[Math.floor(Math.random() * CUTE_EMOJIS.length)],
      opacity: 0.2 + Math.random() * 0.5,
      tx: (Math.random() - 0.5) * 50,
      ty: -(300 + Math.random() * 300), // float upwards
      duration: 6 + Math.random() * 8,
    }));
    setParticles(initialParticles);

    // Periodically add new ambient floaters
    const interval = setInterval(() => {
      setParticles((prev) => {
        // Limit total active floaters to avoid memory overhead
        const active = prev.filter((p) => p.y > -50);
        if (active.length > 25) return active;

        const newParticle: Particle = {
          id: Math.random(),
          x: Math.random() * 100,
          y: 110, // start just below the viewport
          scale: 0.5 + Math.random() * 0.6,
          rotation: Math.random() * 360,
          emoji: CUTE_EMOJIS[Math.floor(Math.random() * CUTE_EMOJIS.length)],
          opacity: 0.1 + Math.random() * 0.5,
          tx: (Math.random() - 0.5) * 80,
          ty: -(500 + Math.random() * 400),
          duration: 8 + Math.random() * 10,
        };
        return [...active, newParticle];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [ambient]);

  // 2. High density burst handling
  useEffect(() => {
    if (burstTrigger === 0) return;

    // Generate burst particles originating from center-bottom (such as over a success button)
    const newBurst: Particle[] = Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5; // spread circular
      const distance = 80 + Math.random() * 140; // expand distance
      return {
        id: Math.random() + Date.now() + i,
        x: 50, // Origin X (50% is center)
        y: 75, // Origin Y (75% is near the buttons)
        scale: 0.6 + Math.random() * 1.2,
        rotation: Math.random() * 720 - 360, // rotate multiple times
        emoji: CUTE_EMOJIS[Math.floor(Math.random() * CUTE_EMOJIS.length)],
        opacity: 1,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance - 60, // extra upward puff
        duration: 1.2 + Math.random() * 0.8,
      };
    });

    setParticles((prev) => [...prev, ...newBurst]);

    // Clean up burst particles after they finish animating to keep DOM clean
    const timer = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.duration > 3)); // Only keep the long duration ambient floaters
    }, 2500);

    return () => clearTimeout(timer);
  }, [burstTrigger, count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[400] w-full h-full">
      <AnimatePresence>
        {particles.map((p) => (
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
              ease: p.duration > 3 ? 'linear' : 'easeOut',
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
