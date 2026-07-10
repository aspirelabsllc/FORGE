'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface Ember {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    flicker: number;
    heat: number; // 0..1, drives colour (1 = white-hot core, 0 = cooling red)
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Custom forge background: a warm glow anchored at the bottom-centre (the mouth of
 * the forge) with embers and the occasional bright spark rising and cooling as they
 * climb. Rendered on a single canvas with additive blending and pre-rendered sprites
 * so it stays smooth. Honours prefers-reduced-motion.
 */
export function ForgeBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Pre-render soft ember sprites in three heat bands (draw once, blit many).
        const makeSprite = (r: number, g: number, b: number) => {
            const s = document.createElement('canvas');
            const S = 64;
            s.width = s.height = S;
            const sctx = s.getContext('2d')!;
            const grad = sctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
            grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
            grad.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, S, S);
            return s;
        };
        const spriteHot = makeSprite(255, 238, 190); // white-amber core
        const spriteMid = makeSprite(255, 140, 42); // orange
        const spriteCool = makeSprite(232, 66, 18); // deep ember red

        let width = 0;
        let height = 0;
        let dpr = 1;
        let target = 0;
        const embers: Ember[] = [];
        let raf = 0;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            target = Math.round(Math.min(170, Math.max(50, width / 11)));
        };

        const spawn = (): Ember => {
            const spark = Math.random() < 0.06;
            // Centre-weighted horizontal origin (roughly a normal distribution).
            const bias = (Math.random() + Math.random() + Math.random()) / 3;
            const speed = spark ? rand(2.4, 4.2) : rand(0.45, 1.5);
            return {
                x: bias * width,
                y: height + rand(0, 30),
                vx: rand(-0.2, 0.2),
                vy: -speed,
                size: spark ? rand(0.9, 1.7) : rand(1.1, 3.0),
                life: 0,
                maxLife: spark ? rand(45, 80) : rand(130, 280),
                flicker: rand(0, Math.PI * 2),
                heat: spark ? 1 : rand(0.55, 0.9),
            };
        };

        const drawGlow = () => {
            // Warm heat pooled at the bottom-centre.
            const gy = height * 1.02;
            const gr = Math.max(width, height) * 0.62;
            const glow = ctx.createRadialGradient(width / 2, gy, 0, width / 2, gy, gr);
            glow.addColorStop(0, 'rgba(255,96,24,0.22)');
            glow.addColorStop(0.4, 'rgba(214,58,12,0.10)');
            glow.addColorStop(1, 'rgba(120,20,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        };

        const drawEmber = (e: Ember) => {
            const t = e.life / e.maxLife;
            // Fade in fast, fade out slow; flicker adds life.
            const envelope = Math.sin(Math.min(1, t * 3.2) * (Math.PI / 2)) * (1 - t);
            const alpha = Math.max(0, envelope * (0.7 + 0.3 * Math.sin(e.flicker)));
            if (alpha <= 0.001) return;
            const heat = e.heat * (1 - t * 0.7);
            const sprite = heat > 0.66 ? spriteHot : heat > 0.34 ? spriteMid : spriteCool;
            const d = e.size * 7;
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, e.x - d / 2, e.y - d / 2, d, d);
        };

        const step = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            drawGlow();

            // Top up the ember pool gradually.
            let toSpawn = Math.min(3, target - embers.length);
            while (toSpawn-- > 0) embers.push(spawn());

            ctx.globalCompositeOperation = 'lighter';
            for (let i = embers.length - 1; i >= 0; i--) {
                const e = embers[i]!;
                e.life++;
                e.flicker += 0.18;
                e.vy += 0.004; // gentle deceleration as it climbs
                e.vx += rand(-0.03, 0.03);
                e.vx = Math.max(-0.9, Math.min(0.9, e.vx));
                e.x += e.vx;
                e.y += e.vy;
                if (e.life >= e.maxLife || e.y < -20) {
                    embers.splice(i, 1);
                    continue;
                }
                drawEmber(e);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(step);
        };

        resize();
        window.addEventListener('resize', resize);

        if (prefersReduced) {
            // Static: glow + a scattering of resting embers, no animation.
            drawGlow();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < target; i++) {
                const e = spawn();
                e.y = rand(0, height);
                e.life = rand(0, e.maxLife * 0.5);
                drawEmber(e);
            }
            ctx.globalCompositeOperation = 'source-over';
        } else {
            raf = requestAnimationFrame(step);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <motion.div
            className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        >
            <canvas ref={canvasRef} className="h-full w-full" />
        </motion.div>
    );
}
