'use client';

import { useActionState, useState } from 'react';
import { motion } from 'motion/react';

import { emailAuth, type EmailAuthState } from '../../login/email-actions';

const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white ' +
    'placeholder:text-white/35 outline-none transition-colors ' +
    'focus:border-orange-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/30';

export function ForgeAuthCard() {
    const [mode, setMode] = useState<'signin' | 'signup'>('signup');
    const [state, action, pending] = useActionState<EmailAuthState, FormData>(emailAuth, {});
    const isSignup = mode === 'signup';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 p-7 shadow-2xl backdrop-blur-md"
        >
            <h2 className="text-xl font-normal text-white">
                {isSignup ? 'Step up to the anvil' : 'Welcome back'}
            </h2>
            <p className="mt-1 mb-6 text-sm text-white/50">
                {isSignup
                    ? 'Create your account to start forging.'
                    : 'Sign in to pick up where you left off.'}
            </p>

            <form action={action} className="flex flex-col gap-3">
                <input type="hidden" name="mode" value={mode} />
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-xs text-white/60">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@company.com"
                        className={inputClass}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-xs text-white/60">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        className={inputClass}
                    />
                </div>

                {state?.error && (
                    <p className="text-sm text-red-400" role="alert">
                        {state.error}
                    </p>
                )}
                {state?.needsConfirmation && (
                    <p className="text-sm text-orange-300" role="status">
                        Check your inbox to confirm your email, then sign in.
                    </p>
                )}

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-1 w-full rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-6px_rgba(255,110,20,0.7)] transition-all hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {pending ? 'Forging…' : isSignup ? 'Forge your account' : 'Sign in'}
                </button>
            </form>

            <p className="mt-5 text-center text-sm text-white/50">
                {isSignup ? 'Already have an account?' : 'New here?'}{' '}
                <button
                    type="button"
                    onClick={() => setMode(isSignup ? 'signin' : 'signup')}
                    className="text-orange-400 underline-offset-4 transition-colors hover:text-orange-300 hover:underline"
                >
                    {isSignup ? 'Sign in' : 'Create an account'}
                </button>
            </p>
        </motion.div>
    );
}
