import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import RB2BLoader from '@/components/rb2b-loader';
import { TelemetryProvider } from '@/components/telemetry-provider';
import { env } from '@/env';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';
import { TRPCReactProvider } from '@/trpc/react';
import { Toaster } from '@onlook/ui/sonner';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { AuthModal } from './_components/auth-modal';
import { ThemeProvider } from './_components/theme';
import { AuthProvider } from './auth/auth-context';

const isProduction = env.NODE_ENV === 'production';

export const metadata: Metadata = {
    title: 'Forge',
    description: 'Shape raw ideas into shipped software — in the heat of the build.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
    openGraph: {
        url: env.NEXT_PUBLIC_SITE_URL,
        type: 'website',
        siteName: 'Forge',
        title: 'Forge',
        description: 'Shape raw ideas into shipped software — in the heat of the build.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Forge',
        description: 'Shape raw ideas into shipped software — in the heat of the build.',
    },
};

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={inter.variable} suppressHydrationWarning>
            <head>
                <meta name="robots" content="noindex, nofollow" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>
                <TRPCReactProvider>
                    <FeatureFlagsProvider>
                        <TelemetryProvider>
                            <ThemeProvider
                                attribute="class"
                                forcedTheme="dark"
                                enableSystem
                                disableTransitionOnChange
                            >
                                <AuthProvider>
                                    <NextIntlClientProvider>
                                        {children}
                                        <AuthModal />
                                        <Toaster />
                                    </NextIntlClientProvider>
                                </AuthProvider>
                            </ThemeProvider>
                        </TelemetryProvider>
                    </FeatureFlagsProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
