/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import './src/env';

const nextConfig: NextConfig = {
    devIndicators: false,
    ...(process.env.STANDALONE_BUILD === 'true' && { output: 'standalone' }),
    eslint: {
        // Don't run ESLint during builds - handle it separately in CI
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Don't fail the build on type errors - handle typecheck separately (bun run typecheck).
        // The next-intl typed-messages feature conflicts with the transKeys path-string helper
        // across ~65 call sites; those calls are correct at runtime.
        ignoreBuildErrors: true,
    },
};

if (process.env.NODE_ENV === 'development') {
    nextConfig.outputFileTracingRoot = path.join(__dirname, '../../..');
}

const withNextIntl = createNextIntlPlugin({
    experimental: {
        createMessagesDeclaration: './messages/en.json'
    }
});
export default withNextIntl(nextConfig);
