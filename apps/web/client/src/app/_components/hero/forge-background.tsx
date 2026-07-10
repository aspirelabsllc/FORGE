'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface Blob {
    bx: number;
    by: number;
    r: number;
    phase: number;
    driftX: number;
    driftY: number;
    speed: number;
    rPhase: number;
}

interface Bolt {
    paths: [number, number][][]; // main path + branches
    born: number;
    life: number;
    seed: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Subtle molten background: a mostly-black field with slow reddish "lava" pools
 * that drift and breathe. When the cursor moves it drops big, branching red
 * lightning bolts with a white-hot core and heavy bloom; each bolt holds its
 * shape and fades out slowly (so the arc reads as slow, not flickery), and
 * bolts only spawn while the pointer is actually moving. Honours
 * prefers-reduced-motion.
 */
export function ForgeBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let width = 0;
        let height = 0;
        let dpr = 1;
        const startT = performance.now();
        let raf = 0;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        // --- Lava pools -----------------------------------------------------
        const blobs: Blob[] = [];
        for (let i = 0; i < 5; i++) {
            blobs.push({
                bx: rand(0.12, 0.88),
                by: rand(0.4, 1.05),
                r: rand(0.32, 0.6),
                phase: rand(0, Math.PI * 2),
                driftX: rand(0.04, 0.09),
                driftY: rand(0.03, 0.07),
                speed: rand(0.00005, 0.00012),
                rPhase: rand(0, Math.PI * 2),
            });
        }

        const drawLava = (elapsed: number) => {
            const breathe = 0.6 + 0.4 * Math.sin(elapsed / 1100);
            const minDim = Math.min(width, height);
            ctx.globalCompositeOperation = 'lighter';
            for (const b of blobs) {
                const x = (b.bx + Math.sin(elapsed * b.speed + b.phase) * b.driftX) * width;
                const y = (b.by + Math.cos(elapsed * b.speed * 0.8 + b.phase) * b.driftY) * height;
                const r =
                    b.r * minDim * (0.92 + 0.08 * Math.sin(elapsed * 0.0004 + b.rPhase)) *
                    (0.85 + 0.25 * breathe);
                const a = 0.05 + 0.09 * breathe;
                const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, `rgba(168,30,14,${a})`);
                g.addColorStop(0.45, `rgba(96,16,8,${a * 0.5})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        // --- Cursor lightning ----------------------------------------------
        const bolts: Bolt[] = [];
        const pointer = { x: 0, y: 0, has: false };
        const SPAWN_DIST = 62;

        // Fixed jagged path via midpoint displacement (generated once per bolt).
        const boltPath = (x1: number, y1: number, x2: number, y2: number, disp: number) => {
            const pts: [number, number][] = [[x1, y1]];
            const rec = (ax: number, ay: number, bx: number, by: number, d: number) => {
                if (d < 4) {
                    pts.push([bx, by]);
                    return;
                }
                const mx = (ax + bx) / 2 + (Math.random() - 0.5) * d;
                const my = (ay + by) / 2 + (Math.random() - 0.5) * d;
                rec(ax, ay, mx, my, d / 2);
                rec(mx, my, bx, by, d / 2);
            };
            rec(x1, y1, x2, y2, disp);
            return pts;
        };

        const spawnBolt = (x1: number, y1: number, x2: number, y2: number, now: number) => {
            const len = Math.hypot(x2 - x1, y2 - y1);
            const disp = Math.min(80, Math.max(28, len * 0.7));
            const main = boltPath(x1, y1, x2, y2, disp);
            const paths: [number, number][][] = [main];
            const branches = 2 + ((Math.random() * 3) | 0);
            for (let i = 0; i < branches; i++) {
                const k = 1 + ((Math.random() * (main.length - 2)) | 0);
                const [bx, by] = main[k]!;
                const bl = rand(30, 90);
                const ang = rand(0, Math.PI * 2);
                paths.push(boltPath(bx, by, bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl, disp * 0.5));
            }
            bolts.push({ paths, born: now, life: rand(750, 1150), seed: Math.random() });
            if (bolts.length > 16) bolts.shift();
        };

        const strokePts = (pts: [number, number][]) => {
            ctx.beginPath();
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
            ctx.stroke();
        };

        const drawBolts = (now: number) => {
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = bolts.length - 1; i >= 0; i--) {
                const b = bolts[i]!;
                const age = now - b.born;
                if (age >= b.life) {
                    bolts.splice(i, 1);
                    continue;
                }
                const t = age / b.life;
                // Fast rise, slow fall.
                let alpha = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
                alpha *= 0.82 + 0.18 * Math.sin(now * 0.012 + b.seed * 12); // gentle electric flicker
                alpha = Math.max(0, alpha);
                if (alpha <= 0.02) continue;
                for (const path of b.paths) {
                    ctx.strokeStyle = `rgba(255,24,10,${alpha * 0.16})`; // outer bloom
                    ctx.lineWidth = 15;
                    strokePts(path);
                    ctx.strokeStyle = `rgba(255,46,22,${alpha * 0.34})`;
                    ctx.lineWidth = 7.5;
                    strokePts(path);
                    ctx.strokeStyle = `rgba(255,104,64,${alpha * 0.72})`;
                    ctx.lineWidth = 3.2;
                    strokePts(path);
                    ctx.strokeStyle = `rgba(255,224,205,${alpha})`; // white-hot core
                    ctx.lineWidth = 1.5;
                    strokePts(path);
                }
            }
        };

        const step = (now: number) => {
            ctx.clearRect(0, 0, width, height);
            drawLava(now - startT);
            if (!prefersReduced) drawBolts(now);
            ctx.globalCompositeOperation = 'source-over';
            raf = requestAnimationFrame(step);
        };

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (!pointer.has) {
                pointer.x = x;
                pointer.y = y;
                pointer.has = true;
                return;
            }
            if (Math.hypot(x - pointer.x, y - pointer.y) >= SPAWN_DIST) {
                spawnBolt(pointer.x, pointer.y, x, y, performance.now());
                pointer.x = x;
                pointer.y = y;
            }
        };

        resize();
        window.addEventListener('resize', resize);

        if (prefersReduced) {
            drawLava(0);
        } else {
            window.addEventListener('mousemove', onMove);
            raf = requestAnimationFrame(step);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    return (
        <motion.div
            className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        >
            <canvas ref={canvasRef} className="h-full w-full" />
        </motion.div>
    );
}
