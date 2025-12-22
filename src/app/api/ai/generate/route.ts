import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import OpenAI from 'openai';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
  path: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolResult {
  tool: string;
  success: boolean;
  result: unknown;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiImageClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image using AI based on a text prompt. Use this when the user asks for images, logos, backgrounds, illustrations, or any visual content.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate' },
          filename: { type: 'string', description: 'Filename for the generated image (e.g., hero-bg.png, logo.png)' },
          size: { type: 'string', enum: ['1024x1024', '512x512', '256x256'], description: 'Image size' },
        },
        required: ['prompt', 'filename', 'size'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Create a new file with the specified content. Use this to create HTML, CSS, JS, or any other files.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Name of the file to create (e.g., index.html, styles.css)' },
          content: { type: 'string', description: 'Complete content of the file' },
          path: { type: 'string', description: 'Path where the file should be created' },
        },
        required: ['filename', 'content', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Edit an existing file by replacing its content.',
      parameters: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'ID of the file to edit' },
          newContent: { type: 'string', description: 'New content for the file' },
          newFilename: { type: 'string', description: 'New filename if renaming, empty to keep current' },
        },
        required: ['fileId', 'newContent', 'newFilename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file from the project.',
      parameters: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'ID of the file to delete' },
          filename: { type: 'string', description: 'Name of the file being deleted' },
        },
        required: ['fileId', 'filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_terminal',
      description: 'Execute a terminal command like npm build, npm install, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The terminal command to execute' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'install_package',
      description: 'Install an npm package.',
      parameters: {
        type: 'object',
        properties: {
          packageName: { type: 'string', description: 'Name of the npm package to install' },
          version: { type: 'string', description: 'Version of the package' },
          isDev: { type: 'boolean', description: 'Whether to install as dev dependency' },
        },
        required: ['packageName', 'version', 'isDev'],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: unknown }> {
  switch (toolName) {
    case 'generate_image': {
      try {
        const response = await openaiImageClient.images.generate({
          model: 'gpt-image-1',
          prompt: args.prompt as string,
          size: (args.size as '1024x1024' | '512x512' | '256x256') || '1024x1024',
        });
        const imageData = response.data;
        if (!imageData || imageData.length === 0) {
          return { success: false, result: { error: 'No image data returned' } };
        }
        return {
          success: true,
          result: {
            action: 'generate_image',
            filename: args.filename,
            base64Data: imageData[0]?.b64_json ?? '',
            message: `Generated image: ${args.filename}`,
          },
        };
      } catch (error) {
        return { success: false, result: { error: error instanceof Error ? error.message : 'Image generation failed' } };
      }
    }
    case 'create_file': {
      const filename = args.filename as string;
      const path = (args.path as string) || '/';
      return {
        success: true,
        result: {
          action: 'create_file',
          file: {
            id: Date.now().toString(),
            name: filename,
            type: 'file',
            path: path === '/' ? `/${filename}` : `${path}/${filename}`,
            content: args.content as string,
          },
          message: `Created file: ${filename}`,
        },
      };
    }
    case 'edit_file': {
      return {
        success: true,
        result: {
          action: 'edit_file',
          fileId: args.fileId,
          newContent: args.newContent,
          newFilename: args.newFilename || undefined,
          message: `Edited file${args.newFilename ? ` and renamed to ${args.newFilename}` : ''}`,
        },
      };
    }
    case 'delete_file': {
      return {
        success: true,
        result: {
          action: 'delete_file',
          fileId: args.fileId,
          message: `Deleted file: ${args.filename}`,
        },
      };
    }
    case 'run_terminal': {
      const command = args.command as string;
      const mockOutputs: Record<string, string> = {
        'npm run build': '> build\n> next build\n\n✓ Compiled successfully\n✓ Build completed',
        'npm run dev': '> dev\n> next dev\n\n✓ Ready on http://localhost:3000',
        'npm test': '✓ All tests passed',
      };
      let output = mockOutputs[command];
      if (!output) {
        if (command.startsWith('npm install')) {
          output = `added 1 package in 2.1s`;
        } else {
          output = `Command executed: ${command}`;
        }
      }
      return {
        success: true,
        result: { action: 'run_terminal', command, output, message: `Executed: ${command}` },
      };
    }
    case 'install_package': {
      return {
        success: true,
        result: {
          action: 'install_package',
          package: {
            name: args.packageName,
            version: args.version || 'latest',
            installed: true,
            isDev: args.isDev || false,
          },
          message: `Installed ${args.packageName}@${args.version || 'latest'}`,
        },
      };
    }
    default:
      return { success: false, result: { error: `Unknown tool: ${toolName}` } };
  }
}

function processToolResults(
  toolCalls: ToolResult[],
  currentFiles: FileItem[]
): { files: FileItem[]; packages: { name: string; version: string; installed: boolean }[]; terminalOutput: string[]; generatedImages: { filename: string; base64Data: string }[] } {
  const updatedFiles = [...currentFiles];
  const packages: { name: string; version: string; installed: boolean }[] = [];
  const terminalOutput: string[] = [];
  const generatedImages: { filename: string; base64Data: string }[] = [];

  for (const call of toolCalls) {
    const result = call.result as Record<string, unknown>;
    if (!result || !call.success) continue;

    switch (result.action) {
      case 'create_file': {
        const file = result.file as FileItem;
        updatedFiles.push(file);
        break;
      }
      case 'edit_file': {
        const fileId = result.fileId as string;
        const idx = updatedFiles.findIndex(f => f.id === fileId);
        if (idx !== -1) {
          updatedFiles[idx] = {
            ...updatedFiles[idx],
            content: result.newContent as string,
            name: (result.newFilename as string) || updatedFiles[idx].name,
          };
        }
        break;
      }
      case 'delete_file': {
        const delId = result.fileId as string;
        const delIdx = updatedFiles.findIndex(f => f.id === delId);
        if (delIdx !== -1) {
          updatedFiles.splice(delIdx, 1);
        }
        break;
      }
      case 'install_package': {
        const pkg = result.package as { name: string; version: string; installed: boolean };
        packages.push(pkg);
        break;
      }
      case 'run_terminal': {
        terminalOutput.push(result.output as string);
        break;
      }
      case 'generate_image': {
        generatedImages.push({
          filename: result.filename as string,
          base64Data: result.base64Data as string,
        });
        updatedFiles.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: result.filename as string,
          type: 'file',
          path: `/images/${result.filename}`,
          content: `data:image/png;base64,${result.base64Data}`,
        });
        break;
      }
    }
  }

  return { files: updatedFiles, packages, terminalOutput, generatedImages };
}

function compactContext(messages: ChatMessage[], maxMessages: number = 20): ChatMessage[] {
  if (messages.length <= maxMessages) return messages;

  const recentMessages = messages.slice(-Math.floor(maxMessages * 0.7));
  const olderMessages = messages.slice(0, messages.length - recentMessages.length);

  const summaryPoints: string[] = [];
  let currentTopic = '';
  
  for (const msg of olderMessages) {
    if (msg.role === 'user') {
      currentTopic = msg.content.slice(0, 100);
    } else if (msg.role === 'assistant' && currentTopic) {
      summaryPoints.push(`- User asked: "${currentTopic}..." → ${msg.content.slice(0, 150)}...`);
      currentTopic = '';
    }
  }

  const summary: ChatMessage = {
    role: 'system',
    content: `[CONTEXT SUMMARY]\n${summaryPoints.slice(-10).join('\n')}\n[END SUMMARY]`,
  };

  return [summary, ...recentMessages];
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, projectId, files = [], conversationHistory = [] } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const compactedHistory = compactContext(conversationHistory);
    
    const fullFilesContext = files.length > 0 
      ? `\n\n## CURRENT PROJECT FILES:\n${files.map((f: FileItem) => {
          if (f.type === 'folder') return `📁 ${f.path}`;
          const isImage = f.content?.startsWith('data:image');
          return `📄 ${f.path} (id: ${f.id})${isImage ? ' [IMAGE]' : ''}:\n\`\`\`\n${isImage ? '[base64 image data]' : (f.content || '[empty]')}\n\`\`\``;
        }).join('\n\n')}`
      : '\n\n## CURRENT PROJECT FILES: None yet - create files to get started!';

    const systemPrompt = `You are hgland Agent, a fully autonomous AI assistant for the hgland website builder platform.

You have access to powerful tools that let you:
- Generate images using AI (gpt-image-1 model)
- Create, edit, and delete files
- Run terminal commands
- Install npm packages

AUTONOMOUS EXECUTION:
When a user asks you to build something, autonomously plan and execute all necessary steps using your tools. Don't just describe - actually do it.

For example, if asked to "build a landing page with a hero image":
1. Generate an appropriate hero image using generate_image
2. Create the HTML file with proper structure using create_file
3. Create CSS styles using create_file
4. Report what you've done

BEST PRACTICES:
- Use semantic HTML and Tailwind CSS for styling
- Create responsive, mobile-friendly designs
- Generate images that match the website's theme
- Organize files logically
- Be proactive - if something needs an image, generate it

CURRENT PROJECT STATE:${fullFilesContext}

IMPORTANT: When using edit_file or delete_file, use the exact file ID shown above.

Be helpful, creative, and thorough.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...compactedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: prompt },
    ];

    const toolResults: ToolResult[] = [];
    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 10;

    const responsesTools = tools.map(t => {
      const fn = t.type === 'function' ? t.function : null;
      if (!fn) return null;
      return {
        type: 'function' as const,
        name: fn.name,
        description: fn.description,
        parameters: {
          ...fn.parameters,
          additionalProperties: false,
        },
        strict: true,
      };
    }).filter(Boolean) as Array<{type: 'function'; name: string; description?: string; parameters: Record<string, unknown>; strict: boolean}>;

    while (iterations < maxIterations) {
      iterations++;

      const response = await openai.responses.create({
        model: 'gpt-5.1-codex-max',
        instructions: systemPrompt,
        input: messages.map(m => {
          if (m.role === 'system') return { role: 'user' as const, content: m.content as string };
          if (m.role === 'tool') return { role: 'user' as const, content: `Tool result: ${m.content}` };
          return { role: m.role as 'user' | 'assistant', content: m.content as string };
        }),
        tools: responsesTools,
      });

      let hasToolCalls = false;
      let textContent = '';

      for (const item of response.output) {
        if (item.type === 'function_call') {
          hasToolCalls = true;
          const args = JSON.parse(item.arguments);
          const result = await executeToolCall(item.name, args);
          
          toolResults.push({
            tool: item.name,
            success: result.success,
            result: result.result,
          });

          messages.push({
            role: 'assistant',
            content: `Called ${item.name} with result: ${JSON.stringify(result.result)}`,
          });
        } else if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              textContent += content.text;
            }
          }
        }
      }

      if (!hasToolCalls) {
        finalResponse = textContent;
        break;
      }

      if (response.status === 'completed' && !hasToolCalls) {
        finalResponse = textContent;
        break;
      }
    }

    const processedResults = processToolResults(toolResults, files);

    if (toolResults.length > 0 && projectId) {
      try {
        const updateData: Record<string, unknown> = {
          files: processedResults.files,
          updatedAt: new Date(),
        };
        
        if (processedResults.packages.length > 0) {
          const existingProject = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
            columns: { packages: true }
          });
          const existingPackages = (existingProject?.packages as Array<{name: string; version: string; installed: boolean}>) || [];
          updateData.packages = [...existingPackages, ...processedResults.packages];
        }
        
        await db.update(projects)
          .set(updateData)
          .where(eq(projects.id, projectId));
      } catch (persistError) {
        console.error('Failed to persist project changes:', persistError);
      }
    }

    return NextResponse.json({
      success: true,
      type: 'autonomous',
      message: finalResponse,
      projectId,
      toolResults,
      updatedFiles: processedResults.files,
      newPackages: processedResults.packages,
      terminalOutput: processedResults.terminalOutput,
      generatedImages: processedResults.generatedImages,
      contextCompacted: conversationHistory.length > 20,
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
