import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertToModelMessages, streamText } from 'ai';
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
  BlockNoteMessage,
  ToolDefinition,
} from './utils/blocknote-ai-server.utils';
import type { Response, Request } from 'express';
import { Public } from '../auth/public.decorator';

interface ChatRequestBody {
  messages: BlockNoteMessage[];
  toolDefinitions: Record<string, ToolDefinition>;
}

@Public()
@Controller('ai')
export class AiController {
  @Public()
  @Post('chat')
  async chat(
    @Body() body: ChatRequestBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const { messages, toolDefinitions } = body;

    try {
      // Robust history scrubbing: Remove all tool calls and tool results.
      // This is safe because we inject the latest document state anyway.
      const rawMessages = injectDocumentStateMessages(messages);

      const scrubbedMessages = rawMessages
        .filter((msg) => msg.role !== 'tool') // Remove tool result messages
        .map((msg) => {
          if (msg.role === 'assistant') {
            // Create a clean assistant message without toolCalls
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
            const { toolCalls, ...rest } = msg as any;
            // Note: toolCalls is removed to prevent MissingToolResultsError in Vercel AI SDK
            return rest as BlockNoteMessage;
          }
          return msg;
        });

      const processedMessages = await convertToModelMessages(
        scrubbedMessages as any,
      );

      const result = streamText({
        model: google('gemini-1.5-flash'),
        system: aiDocumentFormats.html.systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        messages: processedMessages as any,
        tools: toolDefinitionsToToolSet(toolDefinitions),
        toolChoice: 'required',
      });

      // Use the AI SDK's built-in method to stream the response
      const webResponse = result.toUIMessageStreamResponse();

      // Forward status and headers
      res.status(webResponse.status);
      webResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      // Pipe the ReadableStream body to the Express response
      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        const pump = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          return pump();
        };
        await pump();
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Error in AI Chat:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process AI request' });
      }
    }
  }
}
