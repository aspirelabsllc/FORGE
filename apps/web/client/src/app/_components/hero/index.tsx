'use client';

import { motion } from 'motion/react';

import { vujahdayScript } from '../../fonts';
import { ForgeAuthCard } from './forge-auth-card';
import { ForgeBackground } from './forge-background';

export function Hero() {
    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <ForgeBackground />

            <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
                {/* Statement */}
                <motion.div
                    className="max-w-xl text-center lg:text-left"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    <h1 className="text-5xl font-light leading-[1.03] tracking-tight text-white lg:text-[3.75rem]">
                        Great products
                        <br />
                        aren&apos;t built.
                        <br />
                        They&apos;re{' '}
                        <span
                            className={`${vujahdayScript.className} text-6xl italic text-orange-400 lg:text-7xl`}
                        >
                            forged.
                        </span>
                    </h1>
                    <motion.p
                        className="mx-auto mt-6 max-w-md text-balance text-lg text-white/55 lg:mx-0"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
                    >
                        Shape raw ideas into shipped software &mdash; in the heat of the build.
                    </motion.p>
                </motion.div>

                {/* Sign-up */}
                <div className="w-full max-w-sm shrink-0">
                    <ForgeAuthCard />
                </div>
            </div>
        </div>
    );
}
