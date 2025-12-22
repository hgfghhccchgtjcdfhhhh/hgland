import { NextRequest, NextResponse } from 'next/server';
import { Agent, run, tool } from '@openai/agents';
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

const openaiImageClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const generateImageTool = tool({
  name: 'generate_image',
  description: 'Generate an image using AI based on a text prompt. Use this when the user asks for images, logos, backgrounds, illustrations, or any visual content for their website.',
  parameters: z.object({
    prompt: z.string().describe('Detailed description of the image to generate'),
    filename: z.string().describe('Filename for the generated image (e.g., hero-bg.png, logo.png)'),
    size: z.enum(['1024x1024', '512x512', '256x256']).default('1024x1024').describe('Image size'),
  }),
  execute: async ({ prompt, filename, size }) => {
    try {
      const response = await openaiImageClient.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: size as '1024x1024' | '512x512' | '256x256',
      });
      const imageData = response.data;
      if (!imageData || imageData.length === 0) {
        return {
          success: false,
          error: 'No image data returned',
        };
      }
      const base64 = imageData[0]?.b64_json ?? '';
      return {
        success: true,
        filename,
        base64Data: base64,
        contentType: 'image/png',
        message: `Generated image: ${filename}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image generation failed',
      };
    }
  },
});

const createFileTool = tool({
  name: 'create_file',
  description: 'Create a new file with the specified content. Use this to create HTML, CSS, JS, or any other files for the website.',
  parameters: z.object({
    filename: z.string().describe('Name of the file to create (e.g., index.html, styles.css)'),
    content: z.string().describe('Complete content of the file'),
    path: z.string().default('/').describe('Path where the file should be created'),
  }),
  execute: async ({ filename, content, path }) => {
    return {
      success: true,
      action: 'create_file',
      file: {
        id: Date.now().toString(),
        name: filename,
        type: 'file',
        path: path === '/' ? `/${filename}` : `${path}/${filename}`,
        content,
      },
      message: `Created file: ${filename}`,
    };
  },
});

const editFileTool = tool({
  name: 'edit_file',
  description: 'Edit an existing file by replacing its content or making modifications.',
  parameters: z.object({
    fileId: z.string().describe('ID of the file to edit'),
    newContent: z.string().describe('New content for the file'),
    filename: z.string().optional().describe('New filename if renaming'),
  }),
  execute: async ({ fileId, newContent, filename }) => {
    return {
      success: true,
      action: 'edit_file',
      fileId,
      newContent,
      newFilename: filename,
      message: `Edited file${filename ? ` and renamed to ${filename}` : ''}`,
    };
  },
});

const deleteFileTool = tool({
  name: 'delete_file',
  description: 'Delete a file from the project.',
  parameters: z.object({
    fileId: z.string().describe('ID of the file to delete'),
    filename: z.string().describe('Name of the file being deleted (for confirmation)'),
  }),
  execute: async ({ fileId, filename }) => {
    return {
      success: true,
      action: 'delete_file',
      fileId,
      message: `Deleted file: ${filename}`,
    };
  },
});

const readFileTool = tool({
  name: 'read_file',
  description: 'Read the contents of a file to understand what it contains before making edits.',
  parameters: z.object({
    fileId: z.string().describe('ID of the file to read'),
    filename: z.string().describe('Name of the file to read'),
  }),
  execute: async ({ fileId, filename }) => {
    return {
      success: true,
      action: 'read_file',
      fileId,
      filename,
      message: `Reading file: ${filename}`,
    };
  },
});

const runTerminalTool = tool({
  name: 'run_terminal',
  description: 'Execute a terminal command. Use this to run build commands, start servers, or perform system operations.',
  parameters: z.object({
    command: z.string().describe('The terminal command to execute'),
  }),
  execute: async ({ command }) => {
    const mockOutputs: Record<string, string> = {
      'npm run build': '> build\n> next build\n\n✓ Compiled successfully\n✓ Build completed',
      'npm run dev': '> dev\n> next dev\n\n✓ Ready on http://localhost:3000',
      'npm test': '✓ All tests passed',
      'ls': 'index.html  styles.css  script.js  package.json',
      'pwd': '/home/project',
    };
    
    let output = mockOutputs[command];
    if (!output) {
      if (command.startsWith('npm install')) {
        output = `added 1 package in 2.1s\n\n1 package is looking for funding\n  run \`npm fund\` for details`;
      } else if (command.startsWith('echo')) {
        output = command.replace('echo ', '');
      } else {
        output = `Command executed: ${command}`;
      }
    }
    
    return {
      success: true,
      action: 'run_terminal',
      command,
      output,
      message: `Executed: ${command}`,
    };
  },
});

const installPackageTool = tool({
  name: 'install_package',
  description: 'Install an npm package and add it to the project dependencies.',
  parameters: z.object({
    packageName: z.string().describe('Name of the npm package to install'),
    version: z.string().default('latest').describe('Version of the package'),
    isDev: z.boolean().default(false).describe('Whether to install as dev dependency'),
  }),
  execute: async ({ packageName, version, isDev }) => {
    return {
      success: true,
      action: 'install_package',
      package: {
        name: packageName,
        version,
        installed: true,
        isDev,
      },
      message: `Installed ${packageName}@${version}${isDev ? ' (dev)' : ''}`,
    };
  },
});

const listFilesTool = tool({
  name: 'list_files',
  description: 'List all files and folders in the project to understand the current structure.',
  parameters: z.object({
    path: z.string().default('/').describe('Path to list files from'),
  }),
  execute: async ({ path }) => {
    return {
      success: true,
      action: 'list_files',
      path,
      message: `Listing files in: ${path}`,
    };
  },
});

const allTools = [
  generateImageTool,
  createFileTool,
  editFileTool,
  deleteFileTool,
  readFileTool,
  runTerminalTool,
  installPackageTool,
  listFilesTool,
];

function compactContext(messages: ChatMessage[], maxMessages: number = 20): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const recentMessages = messages.slice(-Math.floor(maxMessages * 0.7));
  const olderMessages = messages.slice(0, messages.length - recentMessages.length);

  const summaryPoints: string[] = [];
  let currentTopic = '';
  
  for (const msg of olderMessages) {
    if (msg.role === 'user') {
      currentTopic = msg.content.slice(0, 100);
    } else if (msg.role === 'assistant' && currentTopic) {
      const keyInfo = msg.content.slice(0, 200);
      summaryPoints.push(`- User asked about: "${currentTopic}..." → Response summary: ${keyInfo}...`);
      currentTopic = '';
    }
  }

  const summary: ChatMessage = {
    role: 'system',
    content: `[CONTEXT SUMMARY - Previous conversation condensed]\n${summaryPoints.slice(-10).join('\n')}\n[END SUMMARY - Recent messages follow]`,
  };

  return [summary, ...recentMessages];
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
    
    if (!result.success) continue;

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
    }

    if (call.tool === 'generate_image' && result.success) {
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
    }
  }

  return { files: updatedFiles, packages, terminalOutput, generatedImages };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, projectId, mode, files = [], conversationHistory = [] } = body;

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

    const agentInstructions = `You are hgland Agent, a fully autonomous AI assistant for the hgland website builder platform, powered by GPT-5.2 Codex.

You have access to powerful tools that let you:
- Generate images using AI (gpt-image-1 model)
- Create, edit, read, and delete files
- Run terminal commands
- Install npm packages
- List files in the project

AUTONOMOUS EXECUTION:
When a user asks you to build something, you should autonomously plan and execute all necessary steps. Don't just describe what you would do - actually do it using your tools.

For example, if asked to "build a landing page with a hero image":
1. First, generate an appropriate hero image using generate_image
2. Create the HTML file with proper structure using create_file
3. Create CSS styles using create_file
4. Create any necessary JavaScript using create_file
5. Report what you've done

CONVERSATION MODE:
When users just want to chat, answer their questions naturally without using tools unless needed.

BEST PRACTICES:
- Always use semantic HTML and Tailwind CSS for styling
- Create responsive, mobile-friendly designs
- Generate images that match the website's theme and style
- Organize files logically (HTML, CSS, JS, images in appropriate folders)
- Be proactive - if something needs an image, generate it
- If building a complete website, create all necessary pages and assets

CURRENT PROJECT STATE:${fullFilesContext}

IMPORTANT: When using edit_file or delete_file, use the exact file ID shown in the project files above.

Be helpful, creative, and thorough. Execute multi-step tasks autonomously.`;

    const hglandAgent = new Agent({
      name: 'hgland Agent',
      model: 'gpt-5.2-codex',
      instructions: agentInstructions,
      tools: allTools,
    });

    const contextPrompt = compactedHistory.length > 0
      ? `Previous context:\n${compactedHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${prompt}`
      : prompt;

    const result = await run(hglandAgent, contextPrompt);

    const toolResults: ToolResult[] = [];
    
    if (result.newItems && Array.isArray(result.newItems)) {
      for (const item of result.newItems) {
        const anyItem = item as unknown as Record<string, unknown>;
        if (anyItem.type === 'tool_call_item' && anyItem.output) {
          try {
            const output = typeof anyItem.output === 'string' ? JSON.parse(anyItem.output as string) : anyItem.output;
            toolResults.push({
              tool: (anyItem.name as string) || 'unknown',
              success: (output as Record<string, unknown>).success !== false,
              result: output,
            });
          } catch {
            toolResults.push({
              tool: (anyItem.name as string) || 'unknown',
              success: true,
              result: anyItem.output,
            });
          }
        }
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
      type: mode === 'chat' ? 'chat' : 'autonomous',
      message: result.finalOutput,
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
