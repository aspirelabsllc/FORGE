import { z } from 'zod';

/**
 * W3C Design Tokens Community Group (DTCG) format, 2025.10 draft.
 * https://tr.designtokens.org/format/
 *
 * We model tokens generically (recursive groups of $value/$type leaves) so the
 * tree can be handed directly to Style Dictionary or any other DTCG consumer
 * without a translation step.
 */
export const DTCG_TOKEN_TYPES = [
    'color',
    'dimension',
    'fontFamily',
    'fontWeight',
    'typography',
    'shadow',
    'duration',
] as const;

export const dtcgTokenType = z.enum(DTCG_TOKEN_TYPES);
export type DtcgTokenType = z.infer<typeof dtcgTokenType>;

const compositeTypographyValue = z.object({
    fontFamily: z.string(),
    fontSize: z.string(),
    fontWeight: z.union([z.string(), z.number()]),
    lineHeight: z.union([z.string(), z.number()]).optional(),
    letterSpacing: z.string().optional(),
});

const compositeShadowValue = z.object({
    color: z.string(),
    offsetX: z.string(),
    offsetY: z.string(),
    blur: z.string(),
    spread: z.string().optional(),
});

const dtcgTokenValue = z.union([
    z.string(),
    z.number(),
    compositeTypographyValue,
    compositeShadowValue,
]);

export const dtcgToken = z.object({
    $value: dtcgTokenValue,
    $type: dtcgTokenType,
    $description: z.string().optional(),
});
export type DtcgToken = z.infer<typeof dtcgToken>;

export type DesignTokenGroup = {
    [key: string]: DtcgToken | DesignTokenGroup;
};

export const designTokenGroup: z.ZodType<DesignTokenGroup> = z.lazy(() =>
    z.record(z.string(), z.union([dtcgToken, designTokenGroup])),
);

/**
 * The subset of the token tree Forge treats as "must be filled before intake
 * is complete" — colors and typography define enough of a visual identity to
 * start proposing designs. Everything else (spacing scales, shadows, etc.) is
 * optional polish Forge can fill in with sensible defaults.
 */
export const brandIdentityTokens = z.object({
    color: designTokenGroup,
    typography: designTokenGroup,
    spacing: designTokenGroup.optional(),
    shadow: designTokenGroup.optional(),
});
export type BrandIdentityTokens = z.infer<typeof brandIdentityTokens>;

export const isTokenGroupEmpty = (group: DesignTokenGroup | undefined): boolean => {
    if (!group) return true;
    return Object.keys(group).length === 0;
};

export interface ColorSwatch {
    /** Dot-joined path from the group root, e.g. "brand.primary". */
    name: string;
    value: string;
}

const isDtcgToken = (value: DtcgToken | DesignTokenGroup): value is DtcgToken =>
    typeof value === 'object' && value !== null && '$value' in value && '$type' in value;

/**
 * Flattens a (possibly nested) color token group into a flat list of named
 * swatches - used by the GUI's style panel to constrain its color picker to
 * on-brand values instead of an open color wheel. Only `$type: 'color'`
 * leaves with a string `$value` are included; composite/non-color tokens are
 * skipped rather than rendered as garbage swatches.
 */
export const flattenColorTokens = (
    group: DesignTokenGroup | undefined,
    prefix = '',
): ColorSwatch[] => {
    if (!group) return [];
    return Object.entries(group).flatMap(([key, value]) => {
        const name = prefix ? `${prefix}.${key}` : key;
        if (isDtcgToken(value)) {
            if (value.$type === 'color' && typeof value.$value === 'string') {
                return [{ name, value: value.$value }];
            }
            return [];
        }
        return flattenColorTokens(value, name);
    });
};
