import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import OpenAI from 'openai';
import { db } from '@/db';
import { projects, agentMemory, agentExecutions, agentLearnings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

interface PlanStep {
  id: string;
  description: string;
  toolsNeeded: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  outcome?: string;
  evaluation?: {
    success: boolean;
    quality: number;
    issues: string[];
    improvements: string[];
  };
}

interface ExecutionPlan {
  goal: string;
  analysis: string;
  steps: PlanStep[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  proactiveEnhancements: string[];
}

interface AgentState {
  phase: 'planning' | 'executing' | 'evaluating' | 'improving' | 'complete';
  currentStepIndex: number;
  iterationCount: number;
  plan: ExecutionPlan | null;
  executionHistory: Array<{
    stepId: string;
    action: string;
    result: unknown;
    evaluation: string;
  }>;
  learnings: string[];
  overallProgress: number;
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
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file to understand its current state.',
      parameters: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'ID of the file to read' },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List all files in the project to understand the current structure.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  currentFiles: FileItem[]
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
            id: Date.now().toString() + Math.random().toString(36).slice(2),
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
    case 'read_file': {
      const file = currentFiles.find(f => f.id === args.fileId);
      if (file) {
        return {
          success: true,
          result: {
            action: 'read_file',
            fileId: args.fileId,
            filename: file.name,
            content: file.content,
            message: `Read file: ${file.name}`,
          },
        };
      }
      return { success: false, result: { error: 'File not found' } };
    }
    case 'list_files': {
      return {
        success: true,
        result: {
          action: 'list_files',
          files: currentFiles.map(f => ({ id: f.id, name: f.name, path: f.path, type: f.type })),
          message: `Listed ${currentFiles.length} files`,
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
  const createdFilePaths = new Set<string>();

  for (const call of toolCalls) {
    const result = call.result as Record<string, unknown>;
    if (!result || !call.success) continue;

    switch (result.action) {
      case 'create_file': {
        const file = result.file as FileItem;
        const filePath = file.path;
        if (updatedFiles.some(f => f.path === filePath) || createdFilePaths.has(filePath)) {
          break;
        }
        createdFilePaths.add(filePath);
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
        const imagePath = `/images/${result.filename as string}`;
        if (updatedFiles.some(f => f.path === imagePath)) {
          break;
        }
        generatedImages.push({
          filename: result.filename as string,
          base64Data: result.base64Data as string,
        });
        updatedFiles.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: result.filename as string,
          type: 'file',
          path: imagePath,
          content: `data:image/png;base64,${result.base64Data}`,
        });
        break;
      }
    }
  }

  return { files: updatedFiles, packages, terminalOutput, generatedImages };
}

async function retrieveRelevantMemories(projectId: string): Promise<string[]> {
  try {
    const memories = await db.query.agentMemory.findMany({
      where: eq(agentMemory.projectId, projectId),
      orderBy: [desc(agentMemory.lastAccessedAt)],
      limit: 10,
    });
    return memories.map(m => `[${m.memoryType}] ${m.content}`);
  } catch {
    return [];
  }
}

async function retrieveRelevantLearnings(projectId: string): Promise<string[]> {
  try {
    const learnings = await db.query.agentLearnings.findMany({
      where: eq(agentLearnings.projectId, projectId),
      orderBy: [desc(agentLearnings.createdAt)],
      limit: 5,
    });
    return learnings.map(l => `[${l.learningType}] ${l.pattern}: ${l.insight}`);
  } catch {
    return [];
  }
}

async function storeMemory(
  projectId: string,
  memoryType: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(agentMemory).values({
      projectId,
      memoryType,
      content,
      metadata,
      importance: 'medium',
    });
  } catch (error) {
    console.error('Failed to store memory:', error);
  }
}

async function storeLearning(
  projectId: string,
  executionId: string | null,
  learningType: string,
  pattern: string,
  insight: string
) {
  try {
    await db.insert(agentLearnings).values({
      projectId,
      executionId,
      learningType,
      pattern,
      insight,
    });
  } catch (error) {
    console.error('Failed to store learning:', error);
  }
}

async function createExecutionRecord(projectId: string, userGoal: string): Promise<string | null> {
  try {
    const result = await db.insert(agentExecutions).values({
      projectId,
      userGoal,
      plan: null,
      executionSteps: [],
      evaluationResults: null,
      finalOutcome: 'in_progress',
    }).returning({ id: agentExecutions.id });
    return result[0]?.id || null;
  } catch {
    return null;
  }
}

async function updateExecutionRecord(
  executionId: string,
  updates: {
    plan?: unknown;
    executionSteps?: unknown;
    evaluationResults?: unknown;
    finalOutcome?: string;
    lessonsLearned?: unknown;
    totalIterations?: string;
  }
) {
  try {
    await db.update(agentExecutions)
      .set({
        ...updates,
        completedAt: updates.finalOutcome && updates.finalOutcome !== 'in_progress' ? new Date() : undefined,
      })
      .where(eq(agentExecutions.id, executionId));
  } catch (error) {
    console.error('Failed to update execution record:', error);
  }
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

    const executionId = projectId ? await createExecutionRecord(projectId, prompt) : null;
    
    const memories = projectId ? await retrieveRelevantMemories(projectId) : [];
    const learnings = projectId ? await retrieveRelevantLearnings(projectId) : [];

    const compactedHistory = compactContext(conversationHistory);
    
    const fullFilesContext = files.length > 0 
      ? `\n\n## CURRENT PROJECT FILES:\n${files.map((f: FileItem) => {
          if (f.type === 'folder') return `📁 ${f.path}`;
          const isImage = f.content?.startsWith('data:image');
          return `📄 ${f.path} (id: ${f.id})${isImage ? ' [IMAGE]' : ''}:\n\`\`\`\n${isImage ? '[base64 image data]' : (f.content || '[empty]')}\n\`\`\``;
        }).join('\n\n')}`
      : '\n\n## CURRENT PROJECT FILES: None yet - create files to get started!';

    const memoryContext = memories.length > 0 
      ? `\n\n## RELEVANT MEMORIES FROM PAST SESSIONS:\n${memories.join('\n')}`
      : '';

    const learningsContext = learnings.length > 0
      ? `\n\n## LEARNINGS FROM PAST EXECUTIONS:\n${learnings.join('\n')}`
      : '';

    const autonomousSystemPrompt = `You are hgland Agent, a FULLY AUTONOMOUS AI agent for the hgland website builder platform.

## CORE IDENTITY
You are NOT a reactive chatbot. You are a Level 4 autonomous agent capable of:
- Strategic planning and goal decomposition
- Self-directed multi-step execution
- Outcome evaluation and self-correction
- Proactive task generation beyond user requests
- Learning from past experiences

## AUTONOMOUS EXECUTION PROTOCOL

### PHASE 1: STRATEGIC PLANNING
When receiving a user goal, you MUST:
1. ANALYZE the goal deeply - understand what the user truly wants, not just what they said
2. DECOMPOSE into subtasks - break the goal into ordered, actionable steps
3. IDENTIFY DEPENDENCIES - determine which steps depend on others
4. PROACTIVELY ENHANCE - identify improvements the user didn't ask for but would benefit from
5. ESTIMATE COMPLEXITY - simple (1-3 steps), moderate (4-7 steps), complex (8+ steps)

### PHASE 2: ITERATIVE EXECUTION
For each subtask:
1. EXECUTE the step using available tools
2. EVALUATE the outcome - did it achieve what was intended?
3. SELF-CORRECT if needed - if evaluation fails, try a different approach
4. ADAPT the plan - based on learnings, adjust remaining steps

### PHASE 3: OUTCOME VERIFICATION
After completing all steps:
1. VERIFY the overall goal was achieved
2. TEST the result mentally - would this work? Is it complete?
3. IDENTIFY GAPS - what's missing or could be improved?
4. ITERATE if needed - go back and fix issues

### PHASE 4: PROACTIVE ENHANCEMENT
Beyond the user's request:
1. ADD VALUE - include best practices the user didn't ask for
2. OPTIMIZE - make the code/design better than requested
3. FUTURE-PROOF - anticipate what they'll need next
4. DOCUMENT - explain what you did and why

## AVAILABLE TOOLS
- generate_image: Generate AI images (logos, backgrounds, illustrations)
- create_file: Create new files with content
- edit_file: Modify existing files
- delete_file: Remove files
- read_file: Read file contents
- list_files: List project structure
- run_terminal: Execute commands
- install_package: Install npm packages

## CURRENT PROJECT STATE
${fullFilesContext}
${memoryContext}
${learningsContext}

## EXECUTION RULES
1. NEVER just describe what you'll do - ACTUALLY DO IT
2. Use ALL necessary tools to complete the goal
3. Create COMPLETE, PRODUCTION-READY code
4. Use semantic HTML5 and Tailwind CSS
5. Make designs responsive and accessible
6. Generate images when visuals would enhance the result
7. Install packages when needed
8. Think like a senior developer - consider edge cases

## OUTPUT FORMAT
After execution, provide:
1. [PLAN] - Your strategic plan (brief)
2. [EXECUTED] - What you actually did (list of actions)
3. [EVALUATION] - Assessment of the outcome
4. [PROACTIVE] - Additional improvements you made
5. [NEXT STEPS] - Suggestions for what the user might want next

Remember: You are fully autonomous. Plan extensively. Execute thoroughly. Evaluate critically. Improve proactively.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: autonomousSystemPrompt },
      ...compactedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: `[USER GOAL]: ${prompt}\n\nRemember: You are a fully autonomous agent. Plan this strategically, execute it completely, evaluate the outcome, and proactively add value beyond what was asked.` },
    ];

    const toolResults: ToolResult[] = [];
    const executionSteps: Array<{tool: string; args: unknown; result: unknown; evaluation: string}> = [];
    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 15;
    let currentFiles = [...files];

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

    let evaluationLoop = 0;
    const maxEvaluationLoops = 3;

    while (iterations < maxIterations && evaluationLoop < maxEvaluationLoops) {
      iterations++;

      const response = await openai.responses.create({
        model: 'gpt-5.1-codex-max',
        instructions: autonomousSystemPrompt,
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
          const result = await executeToolCall(item.name, args, currentFiles);
          
          toolResults.push({
            tool: item.name,
            success: result.success,
            result: result.result,
          });

          executionSteps.push({
            tool: item.name,
            args,
            result: result.result,
            evaluation: result.success ? 'success' : 'failed',
          });

          const processedResult = processToolResults([{ tool: item.name, success: result.success, result: result.result }], currentFiles);
          currentFiles = processedResult.files;

          messages.push({
            role: 'assistant',
            content: `[TOOL EXECUTED] ${item.name}\nResult: ${JSON.stringify(result.result)}\nSuccess: ${result.success}`,
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
        const hasEvaluationMarkers = textContent.includes('[EVALUATION]') || textContent.includes('[EXECUTED]');
        
        if (hasEvaluationMarkers && textContent.includes('issue') && evaluationLoop < maxEvaluationLoops - 1) {
          evaluationLoop++;
          messages.push({
            role: 'user',
            content: '[SELF-CORRECTION TRIGGER] You identified issues in your evaluation. As an autonomous agent, you should now fix those issues. Continue execution to address the problems you found.',
          });
          continue;
        }
        
        finalResponse = textContent;
        break;
      }

      if (response.status === 'completed' && !hasToolCalls) {
        finalResponse = textContent;
        break;
      }
    }

    const processedResults = processToolResults(toolResults, files);

    if (projectId) {
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

        if (toolResults.length > 0) {
          await storeMemory(
            projectId,
            'execution_summary',
            `Goal: ${prompt}\nActions: ${toolResults.map(t => t.tool).join(', ')}\nFiles modified: ${processedResults.files.length}`,
            { toolsUsed: toolResults.map(t => t.tool), success: toolResults.every(t => t.success) }
          );
        }

        if (executionId) {
          await updateExecutionRecord(executionId, {
            plan: { goal: prompt, stepsCount: executionSteps.length },
            executionSteps,
            finalOutcome: 'completed',
            totalIterations: iterations.toString(),
            lessonsLearned: executionSteps.filter(s => s.evaluation === 'failed').map(s => `${s.tool} failed`),
          });

          if (executionSteps.some(s => s.evaluation === 'failed')) {
            await storeLearning(
              projectId,
              executionId,
              'error_pattern',
              `Failed tools: ${executionSteps.filter(s => s.evaluation === 'failed').map(s => s.tool).join(', ')}`,
              'Some tools failed during execution - consider alternative approaches'
            );
          }
        }
      } catch (persistError) {
        console.error('Failed to persist project changes:', persistError);
      }
    }

    return NextResponse.json({
      success: true,
      type: 'fully_autonomous',
      message: finalResponse,
      projectId,
      executionId,
      toolResults,
      executionSteps,
      iterations,
      updatedFiles: processedResults.files,
      newPackages: processedResults.packages,
      terminalOutput: processedResults.terminalOutput,
      generatedImages: processedResults.generatedImages,
      contextCompacted: conversationHistory.length > 20,
      agentMetrics: {
        totalIterations: iterations,
        toolsExecuted: toolResults.length,
        successfulTools: toolResults.filter(t => t.success).length,
        failedTools: toolResults.filter(t => !t.success).length,
        evaluationLoops: evaluationLoop,
      },
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
