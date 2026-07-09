import { usageRecords } from '@onlook/db';
import { USAGE_LIMITS } from '@onlook/constants';
import { UsageType, type UsageResult } from '@onlook/models';
import { sub } from 'date-fns/sub';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const usageRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }): Promise<UsageResult> => {
        const user = ctx.user;
        return ctx.db.transaction(async (tx) => {
            const now = new Date();
            return getFreePlanUsage(tx, user.id, now);
        });
    }),

    increment: protectedProcedure.input(z.object({
        type: z.enum(UsageType),
        traceId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        // running a transaction helps with concurrency issues and ensures that
        // the usage is incremented atomically
        return ctx.db.transaction(async (tx) => {
            const usageRecord = await tx.insert(usageRecords).values({
                userId: user.id,
                type: input.type,
                timestamp: new Date(),
                traceId: input.traceId,
            }).onConflictDoNothing().returning({ id: usageRecords.id });

            return { usageRecordId: usageRecord?.[0]?.id };
        });
    }),

    revertIncrement: protectedProcedure.input(z.object({
        usageRecordId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
        return ctx.db.transaction(async (tx) => {
            if (input.usageRecordId) {
                await tx.delete(usageRecords).where(and(
                    eq(usageRecords.id, input.usageRecordId),
                    eq(usageRecords.userId, ctx.user.id),
                ));
            }

            return { usageRecordId: input.usageRecordId };
        });
    }),
});

export const getFreePlanUsage = async (
    tx: PgTransaction<any, any, any>,
    userId: string,
    now: Date,
): Promise<UsageResult> => {
    // Previous day
    const dayEnd = now;
    const dayStart = sub(now, { days: 1 });

    // Previous month
    const monthEnd = now;
    const monthStart = sub(now, { months: 1 });

    // Count records from previous day
    const lastDayCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, userId),
                gte(usageRecords.timestamp, dayStart),
                lt(usageRecords.timestamp, dayEnd),
            )
        );

    // Count records from previous month
    const lastMonthCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, userId),
                gte(usageRecords.timestamp, monthStart),
                lt(usageRecords.timestamp, monthEnd),
            )
        );

    return {
        daily: {
            period: 'day',
            usageCount: lastDayCount[0]?.count || 0,
            limitCount: USAGE_LIMITS.dailyLimit,
        },
        monthly: {
            period: 'month',
            usageCount: lastMonthCount[0]?.count || 0,
            limitCount: USAGE_LIMITS.monthlyLimit,
        },
    };
}
