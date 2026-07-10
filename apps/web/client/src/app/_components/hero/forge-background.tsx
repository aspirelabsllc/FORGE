'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface Blob {
    bx: number; // base x (fraction of width)
    by: number; // base y (fraction of height)
    r: number; // radius (fraction of min dimension)
    phase: number;
    driftX: number;
    driftY: number;
    speed: number;
    rPhase: number;
}

interface TrailPt {
    x: number;
    y: number;
    t: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Subtle molten background: a mostly-black field with slow reddish "lava" pools
 * that drift and breathe (a gentle global pulse). The cursor drags a reddish,
 * flickering lightning trail behind it. Single canvas, additive blending —
 * smooth. Honours prefers-reduced-motion.
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
        const start = performance.now();
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
            // Gentle global breathing (~7s period).
            const breathe = 0.6 + 0.4 * Math.sin(elapsed / 1100);
            const minDim = Math.min(width, height);
            ctx.globalCompositeOperation = 'lighter';
            for (const b of blobs) {
                const x = (b.bx + Math.sin(elapsed * b.speed + b.phase) * b.driftX) * width;
                const y = (b.by + Math.cos(elapsed * b.speed * 0.8 + b.phase) * b.driftY) * height;
                const r =
                    b.r * minDim * (0.92 + 0.08 * Math.sin(elapsed * 0.0004 + b.rPhase)) *
                    (0.85 + 0.25 * breathe);
                const a = 0.05 + 0.09 * breathe; // subtle; mostly black
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
        const trail: TrailPt[] = [];
        const TRAIL_MS = 240;

        // Fractal (midpoint-displacement) jagged path between two points.
        const bolt = (x1: number, y1: number, x2: number, y2: number, disp: number) => {
            const pts: [number, number][] = [[x1, y1]];
            const rec = (ax: number, ay: number, bx: number, by: number, d: number) => {
                if (d < 2.5) {
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

        const strokePts = (pts: [number, number][]) => {
            ctx.beginPath();
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
            ctx.stroke();
        };

        const drawLightning = (now: number) => {
            while (trail.length && now - trail[0]!.t > TRAIL_MS) trail.shift();
            if (trail.length < 2) return;
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = 1; i < trail.length; i++) {
                const p0 = trail[i - 1]!;
                const p1 = trail[i]!;
                const alpha = Math.max(0, 1 - (now - p1.t) / TRAIL_MS);
                if (alpha <= 0.02) continue;
                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const seg = Math.hypot(dx, dy);
                const pts = bolt(p0.x, p0.y, p1.x, p1.y, Math.min(18, 6 + seg * 0.5));
                // outer red glow
                ctx.strokeStyle = `rgba(255,44,22,${alpha * 0.45})`;
                ctx.lineWidth = 4.5;
                strokePts(pts);
                // bright core
                ctx.strokeStyle = `rgba(255,180,150,${alpha})`;
                ctx.lineWidth = 1.4;
                strokePts(pts);
                // occasional fork
                if (Math.random() < 0.15 && pts.length > 2) {
                    const k = (Math.random() * (pts.length - 1)) | 0;
                    const bx = pts[k]![0] + rand(-24, 24);
                    const by = pts[k]![1] + rand(-24, 24);
                    const fork = bolt(pts[k]![0], pts[k]![1], bx, by, 12);
                    ctx.strokeStyle = `rgba(255,90,50,${alpha * 0.6})`;
                    ctx.lineWidth = 1;
                    strokePts(fork);
                }
            }
        };

        const step = (now: number) => {
            ctx.clearRect(0, 0, width, height);
            drawLava(now - start);
            if (!prefersReduced) drawLightning(now);
            ctx.globalCompositeOperation = 'source-over';
            raf = requestAnimationFrame(step);
        };

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            trail.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() });
            if (trail.length > 40) trail.shift();
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
