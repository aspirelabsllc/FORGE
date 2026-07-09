import { eq } from "drizzle-orm";
import { type Frame, branches, canvases, frames, projects, userProjects, type DrizzleDb } from "@onlook/db";

/** Type representing a db instance or transaction that has query capabilities */
type DbOrTx = Pick<DrizzleDb, 'query'>;

export function extractCsbPort(frames: Frame[]): number | null {
    if (!frames || frames.length === 0) return null;

    for (const frame of frames) {
        if (frame.url) {
            // Match CSB preview URL pattern: https://sandboxId-port.csb.app
            const match = frame.url.match(/https:\/\/[^-]+-(\d+)\.csb\.app/);
            if (match && match[1]) {
                const port = parseInt(match[1], 10);
                if (!isNaN(port)) {
                    return port;
                }
            }
        }
    }
    return null;
}

/**
 * Verifies that a user has access to a project by checking the userProjects table.
 * @throws Error if the user does not have access to the project or if it doesn't exist
 *
 * Note: This function intentionally returns the same error message whether the project
 * doesn't exist or the user lacks access to prevent information disclosure about
 * project existence.
 *
 * Accepts either a db instance or a transaction to support atomic authorization checks.
 */
export async function verifyProjectAccess(
    db: DbOrTx,
    userId: string,
    projectId: string,
): Promise<void> {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: {
            userProjects: {
                where: eq(userProjects.userId, userId),
            },
        },
    });

    if (!project || project.userProjects.length === 0) {
        throw new Error('Unauthorized or not found');
    }
}

/**
 * Verifies that a user has access to a branch by resolving its parent project
 * and delegating to verifyProjectAccess.
 * @throws Error if the branch does not exist or the user does not have access to its project
 */
export async function verifyBranchAccess(
    db: DbOrTx,
    userId: string,
    branchId: string,
): Promise<void> {
    const branch = await db.query.branches.findFirst({ where: eq(branches.id, branchId) });
    if (!branch) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, branch.projectId);
}

/**
 * Verifies that a user has access to a frame by resolving its parent canvas/project
 * and delegating to verifyProjectAccess.
 * @throws Error if the frame does not exist or the user does not have access to its project
 */
export async function verifyFrameAccess(
    db: DbOrTx,
    userId: string,
    frameId: string,
): Promise<void> {
    const frame = await db.query.frames.findFirst({ where: eq(frames.id, frameId) });
    if (!frame) {
        throw new Error('Unauthorized or not found');
    }
    const canvas = await db.query.canvases.findFirst({ where: eq(canvases.id, frame.canvasId) });
    if (!canvas) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, canvas.projectId);
}

/**
 * Verifies that a user has access to a sandbox by resolving the branch that owns it
 * (branches.sandboxId) and delegating to verifyProjectAccess.
 * @throws Error if no branch owns this sandbox or the user does not have access to its project
 */
export async function verifySandboxAccess(
    db: DbOrTx,
    userId: string,
    sandboxId: string,
): Promise<void> {
    const branch = await db.query.branches.findFirst({ where: eq(branches.sandboxId, sandboxId) });
    if (!branch) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, branch.projectId);
}
