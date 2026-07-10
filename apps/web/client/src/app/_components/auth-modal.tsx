'use client';

import { Dialog, DialogContent, DialogTitle } from '@onlook/ui/dialog';
import { useAuthContext } from '../auth/auth-context';
import { ForgeAuthCard } from './hero/forge-auth-card';

/**
 * Global sign-in prompt. Opened via `setIsAuthModalOpen(true)` from any flow that
 * requires a signed-in user (create, import, templates). Renders Forge's own
 * email/password card so it matches the landing gate rather than offering OAuth
 * providers that Forge doesn't use.
 */
export function AuthModal() {
    const { setIsAuthModalOpen, isAuthModalOpen } = useAuthContext();

    return (
        <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
            <DialogContent className="w-auto max-w-fit border-none bg-transparent p-0 shadow-none">
                <DialogTitle className="sr-only">Sign in to Forge</DialogTitle>
                <ForgeAuthCard />
            </DialogContent>
        </Dialog>
    );
}
