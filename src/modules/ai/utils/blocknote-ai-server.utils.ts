import { tool, jsonSchema } from 'ai';

/**
 * Ported from @blocknote/xl-ai/server to avoid browser-only dependencies in the backend.
 */

export interface BlockNoteDocumentState {
  selection: boolean;
  blocks: unknown[];
  selectedBlocks?: unknown[];
  isEmptyDocument: boolean;
}

// Defining our own message interfaces since the exported ones are not found
export interface BlockNoteMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content?: string;
  metadata?: {
    documentState?: BlockNoteDocumentState;
  };
  id?: string;
  toolCalls?: unknown[];
}

export const aiDocumentFormats = {
  html: {
    systemPrompt:
      'You\'re manipulating a text document using HTML blocks. \nMake sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). \nList items are 1 block with 1 list item each, so block content `<ul><li>item1</li></ul>` is valid, but `<ul><li>item1</li><li>item2</li></ul>` is invalid. We\'ll merge them automatically.\nFor code blocks, you can use the `data-language` attribute on a <code> block (wrapped with <pre>) to specify the language.\n\nIf the user requests updates to the document, use the "applyDocumentOperations" tool to update the document.\n---\nIF there is no selection active in the latest state, first, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.\n  EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. \n  EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need `referenceId` to point to the block before the cursor with position `after` (or block below and `before`\n---\n ',
  },
  json: {
    systemPrompt:
      'You\'re manipulating a text document using JSON blocks. \nMake sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). \n\nIf the user requests updates to the document, use the "applyDocumentOperations" tool to update the document.\n---\nIF there is no selection active in the latest state, first, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.\n  EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. \n  EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need `referenceId` to point to the block before the cursor with position `after` (or block below and `before`\n---\n ',
  },
  markdown: {
    systemPrompt:
      'You\'re manipulating a text document using Markdown blocks. \nMake sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). \nList items are 1 block with 1 list item each, so block content `- item1` is valid, but `- item1\n- item2` is invalid. We\'ll merge them automatically.\n\nIf the user requests updates to the document, use the "applyDocumentOperations" tool to update the document.\n---\nIF there is no selection active in the latest state, first, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.\n  EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. \n  EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need `referenceId` to point to the block before the cursor with position `after` (or block below and `before`\n---\n ',
  },
};

export function injectDocumentStateMessages(
  messages: BlockNoteMessage[],
): BlockNoteMessage[] {
  return messages.flatMap((message) => {
    if (message.role === 'user' && message.metadata?.documentState) {
      const t = message.metadata.documentState;
      const stateMessages: BlockNoteMessage[] = [
        {
          role: 'assistant',
          id: 'assistant-document-state-' + (message.id || 'new'),
          content: t.selection
            ? `This is the latest state of the selection (ignore previous selections, you MUST issue operations against this latest version of the selection):
${JSON.stringify(t.selectedBlocks)}
This is the latest state of the entire document (INCLUDING the selected text), 
you can use this to find the selected text to understand the context (but you MUST NOT issue operations against this document, you MUST issue operations against the selection):
${JSON.stringify(t.blocks)}`
            : `There is no active selection. This is the latest state of the document (ignore previous documents, you MUST issue operations against this latest version of the document). 
The cursor is BETWEEN two blocks as indicated by cursor: true.
${
  t.isEmptyDocument
    ? 'Because the document is empty, YOU MUST first update the empty block before adding new blocks.'
    : "Prefer updating existing blocks over removing and adding (but this also depends on the user's question)."
}
${JSON.stringify(t.blocks)}`,
        },
        message,
      ];
      return stateMessages;
    }
    return [message];
  });
}

export interface ToolDefinition {
  description: string;
  inputSchema: unknown;
}

export function toolDefinitionsToToolSet(
  toolDefinitions: Record<string, ToolDefinition>,
) {
  return Object.fromEntries(
    Object.entries(toolDefinitions).map(([name, definition]) => [
      name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      tool({
        description: definition.description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        parameters: jsonSchema(definition.inputSchema as any),
      } as any),
    ]),
  );
}
