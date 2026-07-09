import { createClient as createTRPCClient } from '@/trpc/request-server';
import type { BrandKitDraft } from '@onlook/brand-schema';
import { type NextRequest } from 'next/server';

export const getBrandKitForProject = async (
    req: NextRequest,
    projectId: string,
): Promise<BrandKitDraft | undefined> => {
    try {
        const { api } = await createTRPCClient(req);
        const brandKit = await api.brandKit.getForProject({ projectId });
        return brandKit ?? undefined;
    } catch (error) {
        console.error('Error fetching brand kit for project', error);
        return undefined;
    }
};
