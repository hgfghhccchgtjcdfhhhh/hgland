import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, projectId } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are hgland Agent, an AI-powered website builder agent powered by GPT-5.1 Codex Max. Your task is to generate complete, production-ready website code based on user descriptions.

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

Only return valid JSON, no markdown or explanation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-codex-max',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a website based on this description: ${prompt}` },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const generatedContent = JSON.parse(content);

    return NextResponse.json({
      success: true,
      projectId,
      generated: generatedContent,
    });
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
