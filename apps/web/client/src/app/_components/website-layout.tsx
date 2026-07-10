'use client';

import { TopBar } from './top-bar';

interface WebsiteLayoutProps {
    children: React.ReactNode;
    /** Retained for call-site compatibility; the marketing footer has been removed. */
    showFooter?: boolean;
}

export function WebsiteLayout({ children }: WebsiteLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Fixed TopBar that persists across page transitions */}
            <div className="top-bar fixed top-0 left-0 z-50 h-12 w-full bg-background/40 backdrop-blur-sm">
                <TopBar />
            </div>

            <div>{children}</div>
        </div>
    );
}
