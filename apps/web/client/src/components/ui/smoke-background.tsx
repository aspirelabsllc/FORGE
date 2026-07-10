'use client';

import { motion } from 'motion/react';

// Fractal-noise grain, inlined so it needs no asset.
const NOISE =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * A cloudy, smoky backdrop: pure-black base with soft grey smoke pools, two
 * slowly drifting blurred clouds, and a faint grain overlay for texture.
 */
export const SmokeBackground = () => (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
        {/* soft smoke pools */}
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(60% 50% at 24% 30%, rgba(150,150,160,0.10), transparent 70%),' +
                    'radial-gradient(55% 60% at 80% 66%, rgba(120,122,135,0.09), transparent 72%),' +
                    'radial-gradient(45% 45% at 55% 90%, rgba(130,130,145,0.07), transparent 70%)',
            }}
        />
        {/* drifting clouds */}
        <motion.div
            className="absolute top-[12%] left-[8%] h-[60vh] w-[60vw] rounded-full bg-neutral-400/[0.06] blur-[110px]"
            animate={{ x: [0, 70, -30, 0], y: [0, -40, 25, 0] }}
            transition={{ duration: 46, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
            className="absolute right-[6%] bottom-[8%] h-[55vh] w-[55vw] rounded-full bg-neutral-300/[0.05] blur-[120px]"
            animate={{ x: [0, -60, 35, 0], y: [0, 30, -20, 0] }}
            transition={{ duration: 58, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* grain texture */}
        <div
            className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
            style={{ backgroundImage: NOISE }}
        />
    </div>
);
