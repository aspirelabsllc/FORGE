import { z } from 'zod';

export const LOGO_VARIANTS = ['primary', 'mark', 'wordmark', 'favicon'] as const;
export const logoVariant = z.enum(LOGO_VARIANTS);
export type LogoVariant = z.infer<typeof logoVariant>;

export const logoAsset = z.object({
    url: z.string(),
    variant: logoVariant,
});
export type LogoAsset = z.infer<typeof logoAsset>;

export const imageAsset = z.object({
    url: z.string(),
    tag: z.string().optional(),
    /** Free-text note on how/where this asset should be used, e.g. "hero product shot". */
    usageHint: z.string().optional(),
});
export type ImageAsset = z.infer<typeof imageAsset>;

export const brandAssets = z.object({
    logos: z.array(logoAsset).default([]),
    images: z.array(imageAsset).default([]),
});
export type BrandAssets = z.infer<typeof brandAssets>;
