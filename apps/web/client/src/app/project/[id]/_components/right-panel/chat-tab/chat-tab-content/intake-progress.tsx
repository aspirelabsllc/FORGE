'use client';

import { computeIntakeChecklist, type BrandKitDraft } from '@onlook/brand-schema';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { IngestDocInput } from '../../../../_hooks/use-intake-chat';

interface IntakeProgressProps {
    draft: BrandKitDraft | undefined;
    /** Flip the chat into Forge (propose) mode once the kit has enough. */
    onStart: () => void;
    /** Extract structured brand info from a pasted or uploaded document into the draft. */
    onIngest: (doc: IngestDocInput) => Promise<void>;
    isIngesting: boolean;
}

/** Max upload size. PDFs are sent to Claude as a document; keep it sane. */
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Read a File as base64 (strips the `data:...;base64,` prefix). */
const readAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

/**
 * Compact header for brand intake: an "Import brand doc" affordance (upload a
 * PDF/text file or paste a brief and Forge lifts positioning/voice/objections
 * out of it), the required checklist with a live count, and - once complete -
 * the "Start building" handoff into Forge's propose mode. The count uses the
 * same pure `computeIntakeChecklist` that gates `runIntakeTurn`, so it always
 * matches when Forge stops asking questions.
 */
export const IntakeProgress = ({ draft, onStart, onIngest, isIngesting }: IntakeProgressProps) => {
    const [importOpen, setImportOpen] = useState(false);
    const [docText, setDocText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const items = draft ? computeIntakeChecklist(draft) : [];
    const done = items.filter((item) => item.complete).length;
    const ready = items.length > 0 && done === items.length;

    const submitPaste = async () => {
        const text = docText.trim();
        if (!text) {
            return;
        }
        await onIngest({ kind: 'text', text });
        setDocText('');
        setImportOpen(false);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-picking the same file
        if (!file) {
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            toast.error('That file is too large (max 15MB).');
            return;
        }
        const lower = file.name.toLowerCase();
        try {
            if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
                const dataBase64 = await readAsBase64(file);
                await onIngest({ kind: 'pdf', dataBase64, filename: file.name });
            } else if (/\.(txt|text|html?|md|markdown)$/.test(lower) || file.type.startsWith('text/')) {
                const text = await file.text();
                if (!text.trim()) {
                    toast.error('That file appears to be empty.');
                    return;
                }
                await onIngest({ kind: 'text', text, filename: file.name });
            } else if (/\.docx?$/.test(lower)) {
                toast.error("Word docs can't be read directly — please export it as a PDF.");
                return;
            } else {
                toast.error('Unsupported file. Use PDF, TXT, HTML, or Markdown.');
                return;
            }
            setImportOpen(false);
        } catch {
            toast.error('Could not read that file.');
        }
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
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.text,.html,.htm,.md,.markdown,application/pdf,text/plain,text/html,text/markdown"
                        className="hidden"
                        onChange={handleFile}
                        disabled={isIngesting}
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            disabled={isIngesting}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isIngesting ? 'Importing…' : 'Upload file'}
                        </Button>
                        <span className="text-foreground-tertiary">PDF, TXT, HTML, or MD — or paste below</span>
                    </div>
                    <Textarea
                        value={docText}
                        onChange={(e) => setDocText(e.target.value)}
                        placeholder="Paste your brand strategy or brief here and I'll pull out what I can..."
                        className="h-24 resize-none text-xs"
                        disabled={isIngesting}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-foreground-tertiary">
                            Word docs: export as PDF first.
                        </span>
                        <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-2 text-xs"
                            disabled={isIngesting || !docText.trim()}
                            onClick={submitPaste}
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
