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
  stepId: string;
}

interface PlanStep {
  id: string;
  description: string;
  action: string;
  toolsNeeded: string[];
  dependencies: string[];
  expectedOutcome: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  actualOutcome?: string;
  retryCount: number;
  toolResults: ToolResult[];
  evaluation?: {
    success: boolean;
    score: number;
    issues: string[];
  };
}

interface ExecutionPlan {
  goal: string;
  analysis: string;
  complexity: 'simple' | 'moderate' | 'complex';
  steps: PlanStep[];
  proactiveEnhancements: string[];
  estimatedTools: number;
}

interface ExecutionState {
  planGenerated: boolean;
  currentStepIndex: number;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  evaluationsPassed: number;
  evaluationsFailed: number;
  overallSuccess: boolean;
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
      description: 'Generate an image using AI based on a text prompt.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate' },
          filename: { type: 'string', description: 'Filename for the generated image' },
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
      description: 'Create a new file with the specified content.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Name of the file to create' },
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
          newFilename: { type: 'string', description: 'New filename if renaming' },
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
      description: 'Execute a terminal command.',
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
          packageName: { type: 'string', description: 'Name of the npm package' },
          version: { type: 'string', description: 'Version of the package' },
          isDev: { type: 'boolean', description: 'Whether dev dependency' },
        },
        required: ['packageName', 'version', 'isDev'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file.',
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
      description: 'List all files in the project.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_step',
      description: 'Signal that the current plan step is complete and ready for evaluation.',
      parameters: {
        type: 'object',
        properties: {
          stepId: { type: 'string', description: 'ID of the step being completed' },
          outcome: { type: 'string', description: 'Description of what was accomplished' },
        },
        required: ['stepId', 'outcome'],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  currentFiles: FileItem[]
): Promise<{ success: boolean; result: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'generate_image': {
        const response = await openaiImageClient.images.generate({
          model: 'gpt-image-1',
          prompt: args.prompt as string,
          size: (args.size as '1024x1024' | '512x512' | '256x256') || '1024x1024',
        });
        const imageData = response.data;
        if (!imageData || imageData.length === 0) {
          return { success: false, result: null, error: 'No image data returned' };
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
        const targetFile = currentFiles.find(f => f.id === args.fileId);
        if (!targetFile) {
          return { success: false, result: null, error: `File with ID ${args.fileId} not found` };
        }
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
          'npm run build': '✓ Compiled successfully\n✓ Build completed',
          'npm run dev': '✓ Ready on http://localhost:3000',
          'npm test': '✓ All tests passed',
        };
        let output = mockOutputs[command];
        if (!output) {
          output = command.startsWith('npm install') ? 'added 1 package in 2.1s' : `Executed: ${command}`;
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
        return { success: false, result: null, error: 'File not found' };
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
      case 'complete_step': {
        return {
          success: true,
          result: {
            action: 'complete_step',
            stepId: args.stepId,
            outcome: args.outcome,
            message: `Step ${args.stepId} marked complete`,
          },
        };
      }
      default:
        return { success: false, result: null, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { success: false, result: null, error: error instanceof Error ? error.message : 'Tool execution failed' };
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
        if (updatedFiles.some(f => f.path === filePath) || createdFilePaths.has(filePath)) break;
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
        if (delIdx !== -1) updatedFiles.splice(delIdx, 1);
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
        if (updatedFiles.some(f => f.path === imagePath)) break;
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

async function generateStrategicPlan(
  goal: string,
  currentFiles: FileItem[],
  memories: string[],
  learnings: string[]
): Promise<ExecutionPlan> {
  const planningPrompt = `You are a strategic planning AI. Analyze this goal and create a detailed execution plan.

GOAL: ${goal}

CURRENT PROJECT FILES:
${currentFiles.length > 0 ? currentFiles.map(f => `- ${f.path} (${f.type})`).join('\n') : 'No files yet'}

PAST MEMORIES:
${memories.length > 0 ? memories.join('\n') : 'None'}

LEARNINGS:
${learnings.length > 0 ? learnings.join('\n') : 'None'}

Create a strategic execution plan. Respond with valid JSON:
{
  "goal": "restate the goal",
  "analysis": "what needs to be done and why",
  "complexity": "simple" | "moderate" | "complex",
  "steps": [
    {
      "id": "step_1",
      "description": "what this step accomplishes",
      "action": "specific action to take",
      "toolsNeeded": ["tool1", "tool2"],
      "dependencies": [],
      "expectedOutcome": "what success looks like",
      "status": "pending",
      "retryCount": 0,
      "toolResults": []
    }
  ],
  "proactiveEnhancements": ["enhancement 1"],
  "estimatedTools": 5
}

Available tools: generate_image, create_file, edit_file, delete_file, run_terminal, install_package, read_file, list_files, complete_step

Break complex goals into 3-10 ordered steps. Add proactive enhancements. Respond ONLY with JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: planningPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const planText = response.choices[0]?.message?.content || '{}';
    const plan = JSON.parse(planText) as ExecutionPlan;
    
    if (!plan.steps || plan.steps.length === 0) {
      return createDefaultPlan(goal);
    }

    plan.steps = plan.steps.map(step => ({
      ...step,
      status: 'pending' as const,
      retryCount: 0,
      toolResults: [],
    }));

    return plan;
  } catch (error) {
    console.error('Planning failed:', error);
    return createDefaultPlan(goal);
  }
}

function createDefaultPlan(goal: string): ExecutionPlan {
  return {
    goal,
    analysis: 'Direct execution',
    complexity: 'simple',
    steps: [{
      id: 'step_1',
      description: goal,
      action: 'Execute the requested task',
      toolsNeeded: ['create_file'],
      dependencies: [],
      expectedOutcome: 'Task completed',
      status: 'pending',
      retryCount: 0,
      toolResults: [],
    }],
    proactiveEnhancements: [],
    estimatedTools: 1,
  };
}

function evaluateStep(step: PlanStep): { success: boolean; score: number; issues: string[] } {
  if (step.toolResults.length === 0) {
    return { success: false, score: 0, issues: ['No tool executions for this step'] };
  }

  const successCount = step.toolResults.filter(r => r.success).length;
  const failCount = step.toolResults.filter(r => !r.success).length;
  const score = Math.round((successCount / step.toolResults.length) * 100);
  
  const issues: string[] = [];
  for (const result of step.toolResults) {
    if (!result.success) {
      const errorResult = result.result as Record<string, unknown>;
      issues.push(`${result.tool} failed: ${errorResult?.error || 'Unknown error'}`);
    }
  }

  const success = failCount === 0 && successCount > 0;
  
  return { success, score, issues };
}

async function evaluateOverallOutcome(
  plan: ExecutionPlan,
  currentFiles: FileItem[],
  originalGoal: string
): Promise<{ goalAchieved: boolean; completeness: number; gaps: string[]; suggestions: string[] }> {
  const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
  const totalSteps = plan.steps.length;
  const basicCompleteness = Math.round((completedSteps / totalSteps) * 100);

  const evaluationPrompt = `Evaluate if this goal was achieved.

GOAL: ${originalGoal}

PLAN EXECUTED:
${plan.steps.map(s => `- ${s.id}: ${s.description} [${s.status}]`).join('\n')}

FILES CREATED:
${currentFiles.map(f => `- ${f.path}`).join('\n')}

Respond with JSON:
{
  "goalAchieved": true/false,
  "completeness": 0-100,
  "gaps": ["gap 1"],
  "suggestions": ["suggestion 1"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: evaluationPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const evalText = response.choices[0]?.message?.content || '{}';
    return JSON.parse(evalText);
  } catch {
    return {
      goalAchieved: completedSteps === totalSteps,
      completeness: basicCompleteness,
      gaps: plan.steps.filter(s => s.status === 'failed').map(s => s.description),
      suggestions: [],
    };
  }
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

async function createExecutionRecord(projectId: string, userGoal: string, plan: ExecutionPlan): Promise<string | null> {
  try {
    const result = await db.insert(agentExecutions).values({
      projectId,
      userGoal,
      plan: plan as unknown as Record<string, unknown>,
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
      summaryPoints.push(`- "${currentTopic}..." → ${msg.content.slice(0, 150)}...`);
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

    const memories = projectId ? await retrieveRelevantMemories(projectId) : [];
    const learnings = projectId ? await retrieveRelevantLearnings(projectId) : [];

    const plan = await generateStrategicPlan(prompt, files, memories, learnings);
    
    const executionId = projectId ? await createExecutionRecord(projectId, prompt, plan) : null;

    const executionState: ExecutionState = {
      planGenerated: true,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      evaluationsPassed: 0,
      evaluationsFailed: 0,
      overallSuccess: false,
    };

    const compactedHistory = compactContext(conversationHistory);
    
    const fullFilesContext = files.length > 0 
      ? `\n\n## CURRENT PROJECT FILES:\n${files.map((f: FileItem) => {
          if (f.type === 'folder') return `📁 ${f.path}`;
          const isImage = f.content?.startsWith('data:image');
          return `📄 ${f.path} (id: ${f.id})${isImage ? ' [IMAGE]' : ''}:\n\`\`\`\n${isImage ? '[base64 image data]' : (f.content || '[empty]')}\n\`\`\``;
        }).join('\n\n')}`
      : '\n\n## CURRENT PROJECT FILES: None yet';

    const memoryContext = memories.length > 0 ? `\n\n## MEMORIES:\n${memories.join('\n')}` : '';
    const learningsContext = learnings.length > 0 ? `\n\n## LEARNINGS:\n${learnings.join('\n')}` : '';

    let currentFiles = [...files];
    const allToolResults: ToolResult[] = [];
    let finalResponse = '';
    let totalIterations = 0;
    const maxRetries = 2;
    const maxIterationsPerStep = 5;

    const responsesTools = tools.map(t => {
      const fn = t.type === 'function' ? t.function : null;
      if (!fn) return null;
      return {
        type: 'function' as const,
        name: fn.name,
        description: fn.description,
        parameters: { ...fn.parameters, additionalProperties: false },
        strict: true,
      };
    }).filter(Boolean) as Array<{type: 'function'; name: string; description?: string; parameters: Record<string, unknown>; strict: boolean}>;

    for (let stepIndex = 0; stepIndex < plan.steps.length; stepIndex++) {
      const currentStep = plan.steps[stepIndex];
      executionState.currentStepIndex = stepIndex;
      currentStep.status = 'in_progress';

      const dependenciesMet = currentStep.dependencies.every(depId => 
        plan.steps.find(s => s.id === depId)?.status === 'completed'
      );

      if (!dependenciesMet) {
        currentStep.status = 'skipped';
        executionState.skippedSteps.push(currentStep.id);
        continue;
      }

      let stepCompleted = false;
      let stepIterations = 0;
      const stepAttemptHistory: Array<{attempt: number; results: ToolResult[]; success: boolean}> = [];

      while (!stepCompleted && stepIterations < maxIterationsPerStep && currentStep.retryCount <= maxRetries) {
        stepIterations++;
        totalIterations++;

        currentStep.toolResults = [];

        const stepExecutionPrompt = `You are hgland Agent executing a strategic plan.

## CURRENT STEP TO EXECUTE
Step ${stepIndex + 1} of ${plan.steps.length}:
- ID: ${currentStep.id}
- Description: ${currentStep.description}
- Action: ${currentStep.action}
- Tools needed: ${currentStep.toolsNeeded.join(', ')}
- Expected outcome: ${currentStep.expectedOutcome}

## FULL PLAN CONTEXT
Goal: ${plan.goal}
Analysis: ${plan.analysis}
Proactive Enhancements: ${plan.proactiveEnhancements.join(', ')}

## PROJECT STATE
${fullFilesContext}
${memoryContext}
${learningsContext}

## PREVIOUS STEPS COMPLETED
${plan.steps.slice(0, stepIndex).filter(s => s.status === 'completed').map(s => `✓ ${s.description}`).join('\n') || 'None yet'}

## INSTRUCTIONS
1. Execute ONLY the current step using the required tools
2. Create complete, production-ready code with Tailwind CSS
3. When step is complete, call complete_step with the stepId and outcome
4. If you encounter an error, try a different approach

Execute step "${currentStep.id}" now.`;

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: stepExecutionPrompt },
          ...compactedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: `Execute step: ${currentStep.description}` },
        ];

        const response = await openai.responses.create({
          model: 'gpt-5.1-codex-max',
          instructions: stepExecutionPrompt,
          input: messages.map(m => {
            if (m.role === 'system') return { role: 'user' as const, content: m.content as string };
            if (m.role === 'tool') return { role: 'user' as const, content: `Tool result: ${m.content}` };
            return { role: m.role as 'user' | 'assistant', content: m.content as string };
          }),
          tools: responsesTools,
        });

        let stepSignaledComplete = false;

        for (const item of response.output) {
          if (item.type === 'function_call') {
            const args = JSON.parse(item.arguments);
            const result = await executeToolCall(item.name, args, currentFiles);

            const toolResult: ToolResult = {
              tool: item.name,
              success: result.success,
              result: result.result,
              stepId: currentStep.id,
            };

            currentStep.toolResults.push(toolResult);

            if (result.success) {
              const processedResult = processToolResults([toolResult], currentFiles);
              currentFiles = processedResult.files;
            }

            if (item.name === 'complete_step' && result.success) {
              const completeResult = result.result as Record<string, unknown>;
              currentStep.actualOutcome = completeResult.outcome as string;
              stepSignaledComplete = true;
            }
          } else if (item.type === 'message' && item.content) {
            for (const content of item.content) {
              if (content.type === 'output_text') {
                finalResponse += content.text;
              }
            }
          }
        }

        if (stepSignaledComplete || currentStep.toolResults.length > 0) {
          const evaluation = evaluateStep(currentStep);
          currentStep.evaluation = evaluation;

          stepAttemptHistory.push({
            attempt: stepIterations,
            results: [...currentStep.toolResults],
            success: evaluation.success,
          });

          allToolResults.push(...currentStep.toolResults);

          if (evaluation.success) {
            currentStep.status = 'completed';
            executionState.completedSteps.push(currentStep.id);
            executionState.evaluationsPassed++;
            stepCompleted = true;
          } else {
            currentStep.retryCount++;
            if (currentStep.retryCount > maxRetries) {
              currentStep.status = 'failed';
              executionState.failedSteps.push(currentStep.id);
              executionState.evaluationsFailed++;
              stepCompleted = true;
            }
          }
        }
      }

      currentStep.toolResults = stepAttemptHistory.flatMap(h => h.results);

      if (!stepCompleted) {
        currentStep.status = 'failed';
        executionState.failedSteps.push(currentStep.id);
        executionState.evaluationsFailed++;
      }
    }

    const overallEvaluation = await evaluateOverallOutcome(plan, currentFiles, prompt);
    executionState.overallSuccess = overallEvaluation.goalAchieved;

    const processedResults = processToolResults(allToolResults, files);

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

        await storeMemory(
          projectId,
          'execution_summary',
          `Goal: ${prompt}\nComplexity: ${plan.complexity}\nSteps: ${plan.steps.length}\nCompleted: ${executionState.completedSteps.length}\nFailed: ${executionState.failedSteps.length}\nSuccess: ${executionState.overallSuccess}`,
          { 
            plan: { goal: plan.goal, complexity: plan.complexity, stepsCount: plan.steps.length },
            evaluation: overallEvaluation,
            proactiveEnhancements: plan.proactiveEnhancements,
          }
        );

        if (plan.proactiveEnhancements.length > 0) {
          await storeMemory(
            projectId,
            'proactive_enhancement',
            `Enhancements: ${plan.proactiveEnhancements.join(', ')}`,
            { enhancements: plan.proactiveEnhancements }
          );
        }

        if (executionId) {
          await updateExecutionRecord(executionId, {
            plan: plan as unknown as Record<string, unknown>,
            executionSteps: plan.steps.map(s => ({
              id: s.id,
              description: s.description,
              status: s.status,
              retryCount: s.retryCount,
              toolResultsCount: s.toolResults.length,
              evaluation: s.evaluation,
            })),
            evaluationResults: overallEvaluation,
            finalOutcome: executionState.overallSuccess ? 'completed' : 'partial',
            totalIterations: totalIterations.toString(),
            lessonsLearned: {
              failedSteps: executionState.failedSteps,
              skippedSteps: executionState.skippedSteps,
              gaps: overallEvaluation.gaps,
              suggestions: overallEvaluation.suggestions,
            },
          });

          if (executionState.failedSteps.length > 0) {
            await storeLearning(
              projectId,
              executionId,
              'failure_pattern',
              `Failed steps: ${executionState.failedSteps.join(', ')}`,
              `Steps that failed: ${plan.steps.filter(s => s.status === 'failed').map(s => s.description).join('; ')}`
            );
          }

          if (executionState.overallSuccess) {
            await storeLearning(
              projectId,
              executionId,
              'success_pattern',
              `${plan.complexity} complexity, ${plan.steps.length} steps`,
              `Successful execution pattern for "${prompt.slice(0, 50)}..."`
            );
          }
        }
      } catch (persistError) {
        console.error('Failed to persist:', persistError);
      }
    }

    const executionReport = `
## Execution Complete

**Goal:** ${plan.goal}

**Plan Analysis:** ${plan.analysis}

**Complexity:** ${plan.complexity}

### Steps Executed:
${plan.steps.map((s, i) => {
  const statusIcon = s.status === 'completed' ? '✓' : s.status === 'failed' ? '✗' : '○';
  return `${i + 1}. ${statusIcon} ${s.description} [${s.status}]${s.retryCount > 0 ? ` (${s.retryCount} retries)` : ''}`;
}).join('\n')}

### Evaluation:
- Goal Achieved: ${overallEvaluation.goalAchieved ? 'Yes' : 'No'}
- Completeness: ${overallEvaluation.completeness}%
${overallEvaluation.gaps.length > 0 ? `- Gaps: ${overallEvaluation.gaps.join(', ')}` : ''}
${overallEvaluation.suggestions.length > 0 ? `- Suggestions: ${overallEvaluation.suggestions.join(', ')}` : ''}

### Proactive Enhancements:
${plan.proactiveEnhancements.length > 0 ? plan.proactiveEnhancements.map(e => `- ${e}`).join('\n') : 'None'}

${finalResponse}
`;

    return NextResponse.json({
      success: true,
      type: 'fully_autonomous',
      message: executionReport,
      projectId,
      executionId,
      plan: {
        goal: plan.goal,
        analysis: plan.analysis,
        complexity: plan.complexity,
        steps: plan.steps.map(s => ({
          id: s.id,
          description: s.description,
          status: s.status,
          retryCount: s.retryCount,
          evaluation: s.evaluation,
        })),
        proactiveEnhancements: plan.proactiveEnhancements,
      },
      execution: {
        completedSteps: executionState.completedSteps,
        failedSteps: executionState.failedSteps,
        skippedSteps: executionState.skippedSteps,
        totalIterations,
        evaluationsPassed: executionState.evaluationsPassed,
        evaluationsFailed: executionState.evaluationsFailed,
      },
      evaluation: overallEvaluation,
      toolResults: allToolResults,
      updatedFiles: processedResults.files,
      newPackages: processedResults.packages,
      terminalOutput: processedResults.terminalOutput,
      generatedImages: processedResults.generatedImages,
      contextCompacted: conversationHistory.length > 20,
      agentMetrics: {
        planComplexity: plan.complexity,
        totalSteps: plan.steps.length,
        completedSteps: executionState.completedSteps.length,
        failedSteps: executionState.failedSteps.length,
        skippedSteps: executionState.skippedSteps.length,
        toolsExecuted: allToolResults.length,
        successfulTools: allToolResults.filter(t => t.success).length,
        failedTools: allToolResults.filter(t => !t.success).length,
        totalIterations,
        goalAchieved: overallEvaluation.goalAchieved,
        completeness: overallEvaluation.completeness,
        proactiveEnhancements: plan.proactiveEnhancements.length,
      },
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
