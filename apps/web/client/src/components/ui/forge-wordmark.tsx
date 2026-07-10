'use client';

import { wordmarkFont } from '@/app/fonts';
import { cn } from '@onlook/ui/utils';

/**
 * The Forge wordmark: wide Audiowide caps with a glowing red "O", used in place
 * of the Onlook logo inside the app.
 */
export const ForgeWordmark = ({ className }: { className?: string }) => (
    <span
        className={cn(
            wordmarkFont.className,
            'text-base uppercase leading-none tracking-[0.14em] text-foreground-primary select-none',
            className,
        )}
    >
        F
        <span className="text-foreground-brand [text-shadow:0_0_10px_rgba(240,40,60,0.85),0_0_20px_rgba(220,30,40,0.5)]">
            O
        </span>
        RGE
    </span>
);
