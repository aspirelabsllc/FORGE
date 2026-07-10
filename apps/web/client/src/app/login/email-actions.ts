'use server';

import { env } from '@/env';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { api } from '~/trpc/server';

export interface EmailAuthState {
    error?: string;
    /** Set when Supabase email confirmation is enabled and the user must verify before a session exists. */
    needsConfirmation?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email + password sign-up / sign-in for internal Forge users. Mirrors the OAuth
 * callback: once a session exists, it creates the public User row via `user.upsert`
 * (guarded to the authenticated id) and hands off to the app.
 *
 * Used with React's `useActionState`, so the signature is (prevState, formData).
 */
export async function emailAuth(
    _prev: EmailAuthState,
    formData: FormData,
): Promise<EmailAuthState> {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const mode = String(formData.get('mode') ?? 'signin');

    if (!EMAIL_RE.test(email)) {
        return { error: 'Enter a valid email address.' };
    }
    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' };
    }

    const supabase = await createClient();

    if (mode === 'signup') {
        // Send the confirmation link to the callback route (which exchanges the
        // code for a session + creates the user), NOT the Site URL root.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}${Routes.AUTH_CALLBACK}` },
        });
        if (error) {
            return { error: error.message };
        }
        // With email confirmation enabled, no session is returned until the user verifies.
        if (!data.session || !data.user) {
            return { needsConfirmation: true };
        }
        const user = await api.user.upsert({ id: data.user.id });
        if (!user) {
            return { error: 'Could not create your account. Please try again.' };
        }
    } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return { error: error.message };
        }
        await api.user.upsert({ id: data.user.id });
    }

    // redirect() throws NEXT_REDIRECT to navigate — must be outside try/catch.
    redirect(Routes.AUTH_REDIRECT);
}
