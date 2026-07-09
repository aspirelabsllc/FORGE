import { useEditorEngine } from '@/components/store/editor';
import { ChatType, type ChatMessage } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useChat } from '../../../../_hooks/use-chat';
import { useIntakeChat } from '../../../../_hooks/use-intake-chat';
import { ChatInput } from '../chat-input';
import { ChatMessages } from '../chat-messages';
import { ErrorSection } from '../error';
import { IntakeProgress } from './intake-progress';

interface ChatTabContentProps {
    conversationId: string;
    projectId: string;
    initialMessages: ChatMessage[];
}

export const ChatTabContent = observer(({
    conversationId,
    projectId,
    initialMessages,
}: ChatTabContentProps) => {
    const editorEngine = useEditorEngine();
    const chat = useChat({ conversationId, projectId, initialMessages });
    // Intake shares the same message store as useChat so the transcript and its
    // rendering/persistence are unified; only the send path differs by mode.
    const intake = useIntakeChat({
        conversationId,
        projectId,
        messages: chat.messages,
        setMessages: chat.setMessages,
    });

    const isIntake = editorEngine.state.chatMode === ChatType.FORGE_INTAKE;
    const active = isIntake ? intake : chat;

    return (
        <div className="flex flex-col h-full justify-end gap-2 pt-2">
            <ChatMessages
                messages={chat.messages}
                isStreaming={active.isStreaming}
                error={active.error}
                onEditMessage={active.editMessage}
            />
            <ErrorSection isStreaming={active.isStreaming} onSendMessage={active.sendMessage} />
            {isIntake && (
                <IntakeProgress
                    draft={intake.draft}
                    onStart={() => {
                        editorEngine.state.chatMode = ChatType.FORGE_PROPOSE;
                    }}
                    onIngest={intake.ingestDoc}
                    isIngesting={intake.isIngesting}
                />
            )}
            <ChatInput
                messages={chat.messages}
                isStreaming={active.isStreaming}
                onStop={active.stop}
                onSendMessage={active.sendMessage}
                queuedMessages={active.queuedMessages}
                removeFromQueue={active.removeFromQueue}
            />
        </div>
    );
});
