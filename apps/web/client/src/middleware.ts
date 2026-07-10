import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';

/**
 * Refreshes the Supabase auth session on every request and writes the rotated
 * cookies onto the response.
 *
 * Server Components cannot set cookies, so without this middleware the access
 * token is never refreshed and sessions silently expire — the very case the
 * `catch {}` in `utils/supabase/server.ts` defers to "middleware refreshing user
 * sessions". Route protection itself lives in the individual layouts (which use
 * `getUser()`); this only keeps the session fresh and clears dead ones.
 */
export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // Do not run code between creating the client and getUser(): getUser() is
    // what triggers the token refresh + cookie rotation captured by setAll above.
    await supabase.auth.getUser();

    return response;
}

export const config = {
    matcher: [
        /*
         * Run on every request except Next.js internals and static image assets,
         * so the session is refreshed on real navigations and API calls.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
