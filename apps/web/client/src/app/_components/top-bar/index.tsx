'use client';

import { Routes } from '@/utils/constants';

export const TopBar = () => {
    return (
        <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6 text-sm select-none">
            <a
                href={Routes.HOME}
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
                aria-label="Forge"
            >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_1px_rgba(255,110,20,0.85)]" />
                <span className="text-base font-semibold tracking-tight text-white">Forge</span>
            </a>
        </div>
    );
};
