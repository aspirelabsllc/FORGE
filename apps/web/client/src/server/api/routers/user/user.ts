import { trackEvent } from '@/utils/analytics/server';
import { callUserWebhook } from '@/utils/n8n/webhook';
import { authUsers, fromDbUser, userInsertSchema, users, type User } from '@onlook/db';
import { extractNames } from '@onlook/utility';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { userSettingsRouter } from './user-settings';

export const userRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const authUser = ctx.user;
        let user = await ctx.db.query.users.findFirst({
            where: eq(users.id, authUser.id),
        });

        const { displayName, firstName, lastName } = getUserName(authUser);

        // Self-heal: a valid auth session with no profile row (e.g. an interrupted
        // sign-up where `user.upsert` never ran) otherwise reads as "logged out"
        // across the app, silently breaking project creation. Create the row so an
        // authenticated caller is always treated as one. Idempotent + race-safe.
        if (!user) {
            const [created] = await ctx.db
                .insert(users)
                .values({
                    id: authUser.id,
                    firstName,
                    lastName,
                    displayName,
                    email: authUser.email,
                    avatarUrl: authUser.user_metadata.avatarUrl,
                })
                .onConflictDoNothing()
                .returning();
            user = created ?? await ctx.db.query.users.findFirst({
                where: eq(users.id, authUser.id),
            });
        }

        if (!user) {
            return null;
        }

        return fromDbUser({
            ...user,
            firstName: user.firstName ?? firstName,
            lastName: user.lastName ?? lastName,
            displayName: user.displayName ?? displayName,
            email: user.email ?? authUser.email,
            avatarUrl: user.avatarUrl ?? authUser.user_metadata.avatarUrl,
        });
    }),
    getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
        // This currently only supports looking up the caller's own record -
        // it must never be used to leak another user's profile or project list.
        if (input !== ctx.user.id) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Cannot view another user\'s data',
            });
        }
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, input),
            with: {
                userProjects: {
                    with: {
                        project: true,
                    },
                },
            },
        });
        return user;
    }),
    upsert: protectedProcedure
        .input(userInsertSchema)
        .mutation(async ({ ctx, input }): Promise<User | null> => {
            const authUser = ctx.user;

            // A user may only upsert their own record. Without this check any
            // authenticated caller could pass another user's id and overwrite
            // that user's profile (name, email, avatar) - a cross-user IDOR.
            if (input.id !== authUser.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot modify another user\'s data',
                });
            }

            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, input.id),
            });

            const { firstName, lastName, displayName } = getUserName(authUser);

            const userData = {
                id: input.id,
                firstName: input.firstName ?? firstName,
                lastName: input.lastName ?? lastName,
                displayName: input.displayName ?? displayName,
                email: input.email ?? authUser.email,
                avatarUrl: input.avatarUrl ?? authUser.user_metadata.avatarUrl,
            };

            const [user] = await ctx.db
                .insert(users)
                .values(userData)
                .onConflictDoUpdate({
                    target: [users.id],
                    set: {
                        ...userData,
                        updatedAt: new Date(),
                    },
                }).returning();

            if (!existingUser) {
                await trackEvent({
                    distinctId: input.id,
                    event: 'user_first_signup',
                    properties: {
                        email: userData.email,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        displayName: userData.displayName,
                        source: 'web beta',
                    },
                });

                await callUserWebhook({
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    source: 'web beta',
                    subscribed: false,
                });
            }

            return user ?? null;
        }),
    settings: userSettingsRouter,
    delete: protectedProcedure.mutation(async ({ ctx }) => {
        await ctx.db.delete(authUsers).where(eq(authUsers.id, ctx.user.id));
    }),
});

function getUserName(authUser: SupabaseUser) {
    const displayName: string | undefined = authUser.user_metadata.name ?? authUser.user_metadata.display_name ?? authUser.user_metadata.full_name ?? authUser.user_metadata.first_name ?? authUser.user_metadata.last_name ?? authUser.user_metadata.given_name ?? authUser.user_metadata.family_name;
    const { firstName, lastName } = extractNames(displayName ?? '');
    return {
        displayName: displayName ?? '',
        firstName,
        lastName,
    };
}
