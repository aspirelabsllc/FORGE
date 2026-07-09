'use client';

import { computeIntakeChecklist, type BrandKitDraft } from '@onlook/brand-schema';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';

interface IntakeProgressProps {
    draft: BrandKitDraft | undefined;
    /** Flip the chat into Forge (propose) mode once the kit has enough. */
    onStart: () => void;
    /** Extract structured brand info from a pasted document into the draft. */
    onIngest: (text: string) => Promise<void>;
    isIngesting: boolean;
}

/**
 * Compact header for brand intake: an "Import brand doc" affordance (paste a
 * brief and Forge lifts positioning/voice/objections out of it), the required
 * checklist with a live count, and - once complete - the "Start building"
 * handoff into Forge's propose mode. The count uses the same pure
 * `computeIntakeChecklist` that gates `runIntakeTurn`, so it always matches when
 * Forge stops asking questions.
 */
export const IntakeProgress = ({ draft, onStart, onIngest, isIngesting }: IntakeProgressProps) => {
    const [importOpen, setImportOpen] = useState(false);
    const [docText, setDocText] = useState('');

    const items = draft ? computeIntakeChecklist(draft) : [];
    const done = items.filter((item) => item.complete).length;
    const ready = items.length > 0 && done === items.length;

    const submitImport = async () => {
        const text = docText.trim();
        if (!text) {
            return;
        }
        await onIngest(text);
        setDocText('');
        setImportOpen(false);
    };

    return (
        <div className="mx-2 flex flex-col gap-2 rounded-md border bg-background-onlook px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
                <span className="text-foreground-secondary font-medium">
                    {draft ? `Brand setup · ${done}/${items.length}` : 'Brand setup'}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-foreground-tertiary hover:text-foreground-secondary"
                        onClick={() => setImportOpen((open) => !open)}
                    >
                        {importOpen ? 'Cancel' : 'Import brand doc'}
                    </Button>
                    {ready && (
                        <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={onStart}>
                            Start building →
                        </Button>
                    )}
                </div>
            </div>

            {importOpen && (
                <div className="flex flex-col gap-1.5">
                    <Textarea
                        value={docText}
                        onChange={(e) => setDocText(e.target.value)}
                        placeholder="Paste your brand strategy or brief here and I'll pull out what I can..."
                        className="h-24 resize-none text-xs"
                        disabled={isIngesting}
                    />
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-2 text-xs"
                            disabled={isIngesting || !docText.trim()}
                            onClick={submitImport}
                        >
                            {isIngesting ? 'Importing…' : 'Import'}
                        </Button>
                    </div>
                </div>
            )}

            {items.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {items.map((item) => (
                        <span
                            key={item.fieldPath}
                            className={cn(
                                'flex items-center gap-1.5',
                                item.complete ? 'text-foreground-secondary' : 'text-foreground-tertiary',
                            )}
                        >
                            <span
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    item.complete ? 'bg-green-500' : 'bg-foreground-tertiary/40',
                                )}
                            />
                            {item.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
