import { env } from '@/env';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();

    // Create a server's supabase client with newly configured cookie,
    // which could be used to maintain user's session
    return createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            // TEMP DIAGNOSTIC: log what the Supabase auth server actually returns,
            // to pin down the intermittent "JSON Parse error: Unexpected EOF".
            global: {
                fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
                    const res = await fetch(input, init);
                    try {
                        const url =
                            typeof input === 'string'
                                ? input
                                : input instanceof URL
                                  ? input.href
                                  : input.url;
                        if (url.includes('/auth/')) {
                            const path = url.split('?')[0]?.split('/auth/')[1];
                            const clone = res.clone();
                            const body = await clone.text();
                            console.log(
                                `[sb-fetch] ${res.status} auth/${path} ` +
                                    `cl=${res.headers.get('content-length')} ` +
                                    `ct=${res.headers.get('content-type')} ` +
                                    `ce=${res.headers.get('content-encoding')} ` +
                                    `bodyLen=${body.length} ` +
                                    (body.length < 300 ? `body=${JSON.stringify(body)}` : ''),
                            );
                        }
                    } catch (e) {
                        console.log('[sb-fetch] log wrapper error:', e);
                    }
                    return res;
                },
            },
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    );
}
