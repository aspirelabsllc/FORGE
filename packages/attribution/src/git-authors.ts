export interface GitAuthor {
    name: string;
    email: string;
}

/**
 * Used for commits made during a Forge PROPOSE/REVISE turn, so `git log`
 * (and packages/git's `getCommits()`, which already surfaces `author`)
 * distinguishes Forge's commits from the user's without any new
 * infrastructure - see apps/web/client's GitManager.commit, which now
 * accepts an inline `-c user.name=/-c user.email=` override per commit
 * instead of relying on the repo's persistent git config.
 */
export const FORGE_GIT_AUTHOR: GitAuthor = {
    name: 'Forge',
    email: 'forge@onlook.internal',
};

export const buildUserGitAuthor = (user: { displayName?: string | null; email?: string | null }): GitAuthor => ({
    name: user.displayName?.trim() || 'Onlook User',
    email: user.email?.trim() || 'user@onlook.internal',
});
