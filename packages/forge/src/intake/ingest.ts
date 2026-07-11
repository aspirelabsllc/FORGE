import { initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateText } from 'ai';

/**
 * A brand document to ingest. Text formats (txt/html/markdown/pasted) arrive as
 * plain text; PDFs are handed to the model as a native document (base64) so
 * Claude reads them directly without us running a PDF parser. Word docs are not
 * supported here - Claude can't read .docx natively - so the UI asks users to
 * export those as PDF.
 */
export type IngestDocInput =
    | { kind: 'text'; text: string; filename?: string }
    | { kind: 'pdf'; dataBase64: string; filename: string };

const PDF_TRANSCRIBE_SYSTEM = `You transcribe a document to clean plain text. Reproduce the document's full textual content faithfully - headings, body copy, lists, and tables rendered as readable text. Do not summarize, omit, or add commentary. Output only the document's text.`;

/**
 * Turns an uploaded document into plain text to store on the brand kit and feed
 * to the intake agent. Text formats pass through unchanged - no cropping, no
 * lossy field extraction. PDFs are read natively by Claude and transcribed to
 * text (Claude reads the PDF itself; we don't run a parser). The stored content
 * is what the intake agent reads and converses over, so it stays whole.
 */
export const prepareDocContent = async (
    doc: IngestDocInput,
): Promise<{ content: string; ref: string }> => {
    if (doc.kind === 'text') {
        return { content: doc.text, ref: doc.filename ?? 'pasted-document' };
    }

    // Sonnet is plenty for a mechanical transcription; keep Opus for the
    // conversational intake agent.
    const { model, providerOptions } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.SONNET_5,
    });
    const { text } = await generateText({
        model,
        providerOptions,
        system: PDF_TRANSCRIBE_SYSTEM,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Transcribe this document to text.' },
                    {
                        type: 'file',
                        data: doc.dataBase64,
                        mediaType: 'application/pdf',
                        filename: doc.filename,
                    },
                ],
            },
        ],
    });
    return { content: text, ref: doc.filename };
};
