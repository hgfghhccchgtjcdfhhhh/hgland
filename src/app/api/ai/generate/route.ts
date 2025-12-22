import { NextRequest, NextResponse } from 'next/server';
import { Agent, run } from '@openai/agents';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, projectId, mode } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (mode === 'chat') {
      const chatAgent = new Agent({
        name: 'hgland Agent',
        model: 'gpt-5.2-codex',
        instructions: `You are hgland Agent, a helpful AI assistant for the hgland website builder platform. You can have normal conversations with users, answer questions about web development, help them plan their websites, and provide guidance.

When the user wants to generate or modify website code, help them refine their requirements first through conversation. Only generate code when they explicitly ask for it or when you're confident they want to build something.

Be friendly, helpful, and conversational. You were built by hgland and powered by GPT-5.2 Codex.`,
      });

      const result = await run(chatAgent, prompt);
      
      return NextResponse.json({
        success: true,
        type: 'chat',
        message: result.finalOutput,
      });
    }

    const websiteBuilderAgent = new Agent({
      name: 'hgland Agent',
      model: 'gpt-5.2-codex',
      instructions: `You are hgland Agent, an AI-powered website builder agent powered by GPT-5.2 Codex. Your task is to generate complete, production-ready website code based on user descriptions.

When generating websites:
1. Create clean, modern HTML with semantic markup
2. Include inline Tailwind CSS classes for styling
3. Make the design responsive and mobile-friendly
4. Add appropriate sections (header, hero, features, footer, etc.)
5. Use modern design principles with good typography and spacing
6. Include placeholder content that matches the website theme

Return a JSON object with this structure:
{
  "pages": [
    {
      "name": "Home",
      "path": "/",
      "html": "<complete HTML content>"
    }
  ],
  "siteConfig": {
    "title": "Website title",
    "description": "Meta description",
    "theme": "dark|light"
  }
}

Only return valid JSON, no markdown or explanation.`,
    });

    const result = await run(
      websiteBuilderAgent,
      `Create a website based on this description: ${prompt}`
    );

    const content = result.finalOutput;
    
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let generatedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type: 'generate',
      projectId,
      generated: generatedContent,
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
