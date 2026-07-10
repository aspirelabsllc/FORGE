'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface Ember {
    x: number;
    y: number;
    px: number; // previous position (for spark trails)
    py: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    flicker: number;
    heat: number; // 0..1 → colour (1 = white-hot, 0 = cooling red)
    spark: boolean; // bright, fast, trailed
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Interactive forge background. A warm glow anchored at the bottom-centre with
 * embers rising and cooling; the pointer "stokes" the forge (scattering nearby
 * embers and throwing sparks), and a hammer strikes the anvil on a rhythm,
 * bursting sparks with a glow-pulse. Single canvas, additive blending,
 * pre-rendered sprites — smooth. Honours prefers-reduced-motion.
 */
export function ForgeBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        const spriteHot = makeSprite(255, 240, 200);
        const spriteMid = makeSprite(255, 140, 42);
        const spriteCool = makeSprite(232, 66, 18);

        let width = 0;
        let height = 0;
        let dpr = 1;
        let target = 0;
        const embers: Ember[] = [];
        const pointer = { x: 0, y: 0, active: false };
        let flash = 0; // transient glow boost from a strike
        let nextStrike = 900; // ms until first hammer strike
        let last = performance.now();
        let raf = 0;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            target = Math.round(Math.min(180, Math.max(50, width / 11)));
        };

        const makeEmber = (
            x: number,
            y: number,
            spark: boolean,
            vx?: number,
            vy?: number,
        ): Ember => {
            const speed = spark ? rand(2.4, 4.4) : rand(0.45, 1.5);
            return {
                x,
                y,
                px: x,
                py: y,
                vx: vx ?? rand(-0.2, 0.2),
                vy: vy ?? -speed,
                size: spark ? rand(0.9, 1.7) : rand(1.1, 3.0),
                life: 0,
                maxLife: spark ? rand(38, 75) : rand(130, 280),
                flicker: rand(0, Math.PI * 2),
                heat: spark ? 1 : rand(0.55, 0.9),
                spark,
            };
        };

        const spawnRising = (): Ember => {
            const spark = Math.random() < 0.06;
            const bias = (Math.random() + Math.random() + Math.random()) / 3;
            return makeEmber(bias * width, height + rand(0, 30), spark);
        };

        // Hammer strikes the anvil: a burst of sparks radiating up-and-out.
        const strike = () => {
            const sx = width * rand(0.4, 0.6);
            const sy = height * rand(0.82, 0.95);
            const count = Math.round(rand(16, 30));
            for (let i = 0; i < count; i++) {
                const ang = -Math.PI / 2 + rand(-1.15, 1.15); // fan upward
                const sp = rand(2.5, 6.5);
                embers.push(makeEmber(sx, sy, true, Math.cos(ang) * sp, Math.sin(ang) * sp));
            }
            flash = 1;
        };

        const drawGlow = () => {
            const gy = height * 1.02;
            const gr = Math.max(width, height) * 0.62;
            const boost = flash * 0.18;
            const glow = ctx.createRadialGradient(width / 2, gy, 0, width / 2, gy, gr);
            glow.addColorStop(0, `rgba(255,96,24,${0.22 + boost})`);
            glow.addColorStop(0.4, `rgba(214,58,12,${0.1 + boost * 0.5})`);
            glow.addColorStop(1, 'rgba(120,20,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        };

        const drawEmber = (e: Ember) => {
            const t = e.life / e.maxLife;
            const envelope = Math.sin(Math.min(1, t * 3.2) * (Math.PI / 2)) * (1 - t);
            const alpha = Math.max(0, envelope * (0.7 + 0.3 * Math.sin(e.flicker)));
            if (alpha <= 0.001) return;
            const heat = e.heat * (1 - t * 0.7);
            const sprite = heat > 0.66 ? spriteHot : heat > 0.34 ? spriteMid : spriteCool;

            // Streak for fast sparks.
            if (e.spark) {
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = 'rgba(255,180,90,1)';
                ctx.lineWidth = e.size * 0.9;
                ctx.beginPath();
                ctx.moveTo(e.px, e.py);
                ctx.lineTo(e.x, e.y);
                ctx.stroke();
            }
            const d = e.size * 7;
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, e.x - d / 2, e.y - d / 2, d, d);
        };

        const step = (now: number) => {
            const dt = Math.min(50, now - last);
            last = now;
            if (flash > 0) flash = Math.max(0, flash - dt / 320);

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            drawGlow();

            // Hammer rhythm.
            nextStrike -= dt;
            if (nextStrike <= 0) {
                strike();
                nextStrike = rand(2600, 4800);
            }

            let toSpawn = Math.min(3, target - embers.length);
            while (toSpawn-- > 0) embers.push(spawnRising());

            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            for (let i = embers.length - 1; i >= 0; i--) {
                const e = embers[i]!;
                e.px = e.x;
                e.py = e.y;
                e.life++;
                e.flicker += 0.18;
                e.vy += 0.004;
                e.vx += rand(-0.03, 0.03);

                // Pointer stokes the forge: repel + brighten nearby embers.
                if (pointer.active) {
                    const dx = e.x - pointer.x;
                    const dy = e.y - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    const R = 150;
                    if (d2 < R * R) {
                        const d = Math.sqrt(d2) || 1;
                        const f = (1 - d / R) * 0.9;
                        e.vx += (dx / d) * f;
                        e.vy += (dy / d) * f - 0.15; // also lift
                        e.heat = Math.min(1, e.heat + f * 0.12);
                    }
                }

                e.vx = Math.max(-1.4, Math.min(1.4, e.vx));
                e.x += e.vx;
                e.y += e.vy;
                if (e.life >= e.maxLife || e.y < -20 || e.x < -30 || e.x > width + 30) {
                    embers.splice(i, 1);
                    continue;
                }
                drawEmber(e);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(step);
        };

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
            pointer.active = true;
            // Occasionally throw a spark off the cursor as it moves.
            if (Math.random() < 0.25) {
                embers.push(
                    makeEmber(pointer.x, pointer.y, true, rand(-1.2, 1.2), rand(-2.4, -0.4)),
                );
            }
        };
        const onLeave = () => {
            pointer.active = false;
        };

        resize();
        window.addEventListener('resize', resize);

        if (prefersReduced) {
            drawGlow();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < target; i++) {
                const e = spawnRising();
                e.y = rand(0, height);
                e.life = rand(0, e.maxLife * 0.5);
                drawEmber(e);
            }
            ctx.globalCompositeOperation = 'source-over';
        } else {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseleave', onLeave);
            raf = requestAnimationFrame(step);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseleave', onLeave);
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
