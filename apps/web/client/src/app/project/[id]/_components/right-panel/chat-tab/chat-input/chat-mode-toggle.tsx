import { Hotkey } from '@/components/hotkey';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { HoverOnlyTooltip } from '../../../editor-bar/hover-tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

interface ChatModeToggleProps {
    chatMode: ChatType;
    onChatModeChange: (mode: ChatType) => void;
    disabled?: boolean;
}

export const ChatModeToggle = observer(({ chatMode, onChatModeChange, disabled = false }: ChatModeToggleProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpenMenu = () => {
            setIsOpen(true);
        };

        window.addEventListener('open-chat-mode-menu', handleOpenMenu);
        return () => window.removeEventListener('open-chat-mode-menu', handleOpenMenu);
    }, []);

        const getCurrentModeIcon = () => {
            if (chatMode === ChatType.EDIT) return Icons.Build;
            if (chatMode === ChatType.FORGE_PROPOSE) return Icons.Sparkles;
            if (chatMode === ChatType.FORGE_INTAKE) return Icons.Brand;
            return Icons.Ask;
        };

        const getCurrentModeLabel = () => {
            if (chatMode === ChatType.EDIT) return 'Build';
            if (chatMode === ChatType.FORGE_PROPOSE) return 'Forge';
            if (chatMode === ChatType.FORGE_INTAKE) return 'Brand setup';
            return 'Ask';
        };

        const Icon = getCurrentModeIcon();

        return (
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <HoverOnlyTooltip 
                    className='mb-1'
                    content={
                        <span>
                            Open mode menu
                        </span>
                    }
                    side="top"
                    hideArrow
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className={cn(
                                'h-8 px-2 text-foreground-onlook group flex items-center gap-1.5',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <Icon 
                                className={cn(
                                    'w-4 h-4',
                                    disabled 
                                        ? 'text-foreground-tertiary' 
                                        : chatMode === ChatType.ASK
                                            ? 'text-blue-200'
                                            : 'text-foreground-secondary group-hover:text-foreground'
                                )} 
                            />
                            <span className={cn(
                                "text-xs font-medium",
                                chatMode === ChatType.ASK && "text-blue-200"
                            )}>
                                {getCurrentModeLabel()}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                    onClick={() => onChatModeChange(ChatType.FORGE_INTAKE)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        chatMode === ChatType.FORGE_INTAKE && 'bg-background-onlook'
                    )}
                >
                    <Icons.Brand className="w-4 h-4" />
                    <span>Brand setup</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onChatModeChange(ChatType.FORGE_PROPOSE)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        chatMode === ChatType.FORGE_PROPOSE && 'bg-background-onlook'
                    )}
                >
                    <Icons.Sparkles className="w-4 h-4" />
                    <span>Forge</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}); 