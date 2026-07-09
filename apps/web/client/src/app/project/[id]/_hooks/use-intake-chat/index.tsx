'use client';

import { api } from '@/trpc/client';
import type { BrandKitDraft } from '@onlook/brand-schema';
import { ChatType, type ChatMessage, type QueuedMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { EditMessage, SendMessage } from '../use-chat';
import { getUserChatMessageFromString } from '../use-chat/utils';

interface UseIntakeChatProps {
    conversationId: string;
    projectId: string;
    /** The shared useChat message store - intake writes into the same array. */
    messages: ChatMessage[];
    setMessages: (messages: ChatMessage[]) => void;
}

const getAssistantMessage = (text: string, conversationId: string): ChatMessage => ({
    id: uuidv4(),
    role: 'assistant',
    parts: [{ type: 'text', text }],
    metadata: {
        context: [],
        checkpoints: [],
        createdAt: new Date(),
        conversationId,
    },
});

const toIntakeHistory = (messages: ChatMessage[]) => {
    const mapped = messages
        .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } =>
            m.role === 'user' || m.role === 'assistant',
        )
        .map((m) => ({
            role: m.role,
            content: m.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
        }))
        .filter((m) => m.content.trim().length > 0);
    // Providers require the first turn to be a user message; if the user
    // switched into intake mid-conversation, drop any leading assistant turns.
    const firstUser = mapped.findIndex((m) => m.role === 'user');
    return firstUser <= 0 ? mapped : mapped.slice(firstUser);
};

/**
 * Turn-loop hook for Forge's brand-intake conversation. Unlike the streaming
 * chat modes (useAiChat -> /api/chat), intake is a discrete tRPC turn: send the
 * running transcript to `brandKit.runIntakeTurn`, which returns one structured
 * outcome (a question, an idea, or "ready"). It reuses the *same* message store
 * as useChat (passed in via `messages`/`setMessages`) so rendering and eventual
 * persistence are shared and switching modes keeps the bubbles on screen.
 *
 * The durable artifact is the brand kit draft - `runIntakeTurn` persists it
 * server-side every turn - so a mid-intake reload keeps progress (the checklist)
 * even though the in-memory transcript resets until a later streaming turn
 * persists it via the conversation.
 */
export function useIntakeChat({ conversationId, projectId, messages, setMessages }: UseIntakeChatProps) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [draft, setDraft] = useState<BrandKitDraft | undefined>(undefined);

    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const brandKitIdRef = useRef<string | null>(null);

    // Read-only: reflect an existing kit's progress in the checklist without
    // creating one (creation is lazy, on first send).
    useEffect(() => {
        let cancelled = false;
        void api.brandKit.getForProject
            .query({ projectId })
            .then((kit) => {
                if (!cancelled && kit) {
                    brandKitIdRef.current = kit.id;
                    setDraft(kit);
                }
            })
            .catch(() => {
                /* no kit linked yet - fine, one is created on first send */
            });
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    const ensureBrandKitId = useCallback(async (): Promise<string> => {
        if (brandKitIdRef.current) {
            return brandKitIdRef.current;
        }
        const existing = await api.brandKit.getForProject.query({ projectId });
        if (existing) {
            brandKitIdRef.current = existing.id;
            setDraft(existing);
            return existing.id;
        }
        const created = await api.brandKit.create.mutate({});
        await api.brandKit.linkToProject.mutate({ projectId, brandKitId: created.id });
        brandKitIdRef.current = created.id;
        setDraft(created);
        return created.id;
    }, [projectId]);

    const sendMessage: SendMessage = useCallback(
        async (content: string): Promise<ChatMessage> => {
            const userMessage = getUserChatMessageFromString(content, [], conversationId);
            const withUser = [...messagesRef.current, userMessage];
            setMessages(jsonClone(withUser));
            setIsStreaming(true);
            setError(undefined);

            try {
                const brandKitId = await ensureBrandKitId();
                const result = await api.brandKit.runIntakeTurn.mutate({
                    brandKitId,
                    history: toIntakeHistory(withUser),
                });
                setDraft(result.draft);

                const outcome = result.outcome;
                let text: string;
                if (outcome.type === 'question') {
                    text = outcome.question;
                } else if (outcome.type === 'suggestion') {
                    text = outcome.rationale ? `${outcome.idea}\n\n${outcome.rationale}` : outcome.idea;
                    if (outcome.needsAsset) {
                        text += `\n\n${outcome.assetDescription ?? 'Could you share a relevant image so I can work it in?'}`;
                    }
                } else {
                    text = outcome.message;
                }

                setMessages(jsonClone([...withUser, getAssistantMessage(text, conversationId)]));
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setIsStreaming(false);
            }

            return userMessage;
        },
        [conversationId, setMessages, ensureBrandKitId],
    );

    const ingestDoc = useCallback(
        async (text: string): Promise<void> => {
            setIsIngesting(true);
            setIsStreaming(true);
            setError(undefined);
            try {
                const brandKitId = await ensureBrandKitId();
                const result = await api.brandKit.ingestDoc.mutate({ brandKitId, text });
                setDraft(result.draft);
                setMessages(
                    jsonClone([
                        ...messagesRef.current,
                        getAssistantMessage(`${result.summary} What would you like to refine or add?`, conversationId),
                    ]),
                );
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setIsIngesting(false);
                setIsStreaming(false);
            }
        },
        [conversationId, setMessages, ensureBrandKitId],
    );

    // Intake is a discrete request/response turn - there is nothing to abort,
    // no send queue, and prior turns aren't editable in this MVP.
    const stop = useCallback(async () => {
        /* no-op: a tRPC turn cannot be aborted mid-flight */
    }, []);
    const editMessage: EditMessage = useCallback(
        async (_messageId: string, newContent: string) =>
            getUserChatMessageFromString(newContent, [], conversationId),
        [conversationId],
    );
    const removeFromQueue = useCallback((_id: string) => {
        /* intake has no send queue */
    }, []);

    return {
        isStreaming,
        error,
        sendMessage,
        editMessage,
        stop,
        queuedMessages: [] as QueuedMessage[],
        removeFromQueue,
        draft,
        ingestDoc,
        isIngesting,
    };
}
