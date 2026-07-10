'use client';

import { Routes } from '@/utils/constants';
import { wordmarkFont } from '../../fonts';

export const TopBar = () => {
    return (
        <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6 select-none">
            <a
                href={Routes.HOME}
                className="group flex items-center gap-2 transition-opacity hover:opacity-90"
                aria-label="Forge"
            >
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_2px_rgba(255,120,30,0.85)] transition-shadow group-hover:shadow-[0_0_14px_3px_rgba(255,120,30,0.95)]" />
                <span
                    className={`${wordmarkFont.className} text-[1.35rem] font-semibold lowercase leading-none tracking-tight text-white`}
                >
                    forge
                </span>
            </a>
        </div>
    );
};
