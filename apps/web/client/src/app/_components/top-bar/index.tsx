'use client';

import { Routes } from '@/utils/constants';
import { wordmarkFont } from '../../fonts';

export const TopBar = () => {
    return (
        <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6 select-none">
            <a
                href={Routes.HOME}
                className="flex items-center transition-opacity hover:opacity-90"
                aria-label="Forge"
            >
                <span
                    className={`${wordmarkFont.className} pl-[0.3em] text-base font-semibold uppercase leading-none tracking-[0.3em] text-white`}
                >
                    F
                    <span className="text-orange-500 [text-shadow:0_0_12px_rgba(255,130,40,0.9),0_0_22px_rgba(255,90,20,0.5)]">
                        O
                    </span>
                    RGE
                </span>
            </a>
        </div>
    );
};
