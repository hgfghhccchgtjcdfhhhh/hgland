# hgland - AI-Powered Website Builder Platform

## Overview
hgland is an AI-powered website builder platform built around a fully autonomous build agent called **hgland Agent**, powered by **GPT-5.1 Codex Max** via OpenAI Responses API. The platform allows users to create websites through AI generation, drag-and-drop visual editing, or manual code editing.

## Design Theme
The UI is styled after **Tidal Wave** - a Geometry Dash Extreme Demon level:
- **Verified by**: Zoink (former Top 1 Extreme Demon, held position for 15 months)
- **Created by**: OniLink
- **Style**: Tropical ocean wave aesthetic with cyan/teal/emerald gradients
- **Colors**: Cyan (#06b6d4), Teal (#14b8a6), Emerald (#10b981) gradients on dark backgrounds

## Current State
- Full platform UI implemented with Next.js 16
- PostgreSQL database with users, projects, deployments, and chat messages tables
- User authentication system (signup/login with JWT)
- Dashboard for project management
- Advanced project editor with 9 tabs (Code, Visual, AI, Languages, Packages, Terminal, SEO, Deploy, Integrations)
- **AI generation and chat powered by GPT-5.1 Codex Max via Responses API using OPENAI_API_KEY**
- **Auto-persistence for packages, SEO, deployment config, and integrations**
- **Real Replit deployment configuration with actual compute units and VM options**
- **Interrupted message recovery on reload**
- **Preview renders all files together (HTML + CSS + JavaScript)**
- Development server running on port 5000

## Tech Stack
- **Frontend/Backend**: Next.js 16 with TypeScript (fullstack)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Authentication**: JWT with jose library, bcryptjs for password hashing
- **AI**: OpenAI GPT-5.1 Codex Max via Responses API
- **Runtime**: Node.js 20

## Project Structure
```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   └── generate/route.ts
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── signup/route.ts
│   │   │   └── projects/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts
│   │   │           └── messages/route.ts
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── projects/
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   └── lib/
│       └── auth.ts
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Database Schema
- **users**: id, email, phone, passwordHash, fullName, username, birthDate, timestamps
- **projects**: id, userId, name, description, status, siteConfig, pages, files, packages, seoSettings, deploymentConfig, integrations, terminalHistory, timestamps
- **deployments**: id, projectId, status, url, buildLog, createdAt
- **chatMessages**: id, projectId, role, content, createdAt
- **agentMemory**: id, projectId, memoryType, category, content, metadata, importance, timestamps (stores agent memories for context)
- **agentExecutions**: id, projectId, userGoal, plan, executionSteps, evaluationResults, finalOutcome, lessonsLearned, totalIterations, timestamps (tracks autonomous executions)
- **agentLearnings**: id, projectId, executionId, learningType, pattern, insight, successRate, applicableContexts, createdAt (stores learned patterns)

## Features Implemented

### Core Features
- Landing page with feature overview
- User registration and login
- Dashboard with project list
- New project creation (manual or AI-assisted flow)

### Project Editor (9 Tabs)
1. **Code Editor**: Monaco Editor with syntax highlighting, IntelliSense, 40+ language support, 1-second debounced auto-save, WebContainer backend preview with Run/Stop controls
2. **Visual Editor**: Component palette (drag-and-drop coming soon)
3. **AI Assistant**: Chat with GPT-5.1 Codex Max, conversation history saves
4. **Languages**: 30+ programming language selections for code generation
5. **Package Manager**: Real npm package validation and installation
6. **Terminal**: Run shell commands (mock output during dev)
7. **SEO Settings**: Title, description, keywords, OG image, robots
8. **Deployment Config**: Real Replit deployment options (Autoscale, VM, Static, Scheduled) with CPU/RAM configurations
9. **Integrations**: 50+ integrations (Google Analytics, Stripe, Auth0, Firebase, Supabase, Telegram, Twilio, SendGrid, etc.)

### AI Agent Capabilities (Level 4 Fully Autonomous)
The hgland Agent (powered by GPT-5.1 Codex Max) is a **Level 4 Fully Autonomous Agent** with strategic planning, iterative execution, self-evaluation, and learning capabilities.

**Autonomous Execution Architecture:**
1. **Strategic Planning Phase**: Separate LLM call (GPT-4o) generates structured ExecutionPlan with:
   - Goal decomposition into ordered subtasks
   - Dependency tracking between steps
   - Complexity estimation (simple/moderate/complex)
   - Proactive enhancements beyond user request

2. **Iterative Execution Engine**: Step-by-step execution with:
   - Per-step tool tracking with stepId association
   - Retry logic (up to 2 retries per failed step)
   - toolResults cleared between retry attempts for accurate evaluation
   - Dependency checking before each step

3. **Per-Step Self-Evaluation**: After each step:
   - evaluateStep() assesses success/failure based on tool results
   - Score calculation (0-100) based on successful vs failed tools
   - Issues collection for failed operations

4. **Outcome Verification**: Separate LLM call evaluates:
   - Overall goal achievement
   - Completeness percentage
   - Gaps and suggestions for improvement

5. **Memory System**: Persists to database:
   - Execution summaries with plan details
   - Proactive enhancements applied
   - Context from past sessions retrieved for future runs

6. **Learning System**: Stores patterns for future:
   - Success patterns (what worked)
   - Failure patterns (what to avoid)
   - Insights derived from executions

**Tools Available:**
1. **generate_image**: Generate images using gpt-image-1 via Replit AI Integrations
2. **create_file**: Create new files with content
3. **edit_file**: Edit existing file content
4. **delete_file**: Delete files from the project
5. **read_file**: Read file contents
6. **run_terminal**: Execute terminal commands
7. **install_package**: Install npm packages
8. **list_files**: List project files
9. **complete_step**: Signal step completion for evaluation

**Key Features:**
- **Context Compaction**: Automatically summarizes older messages when >20 messages
- **Step-by-Step Execution**: Each plan step executed and evaluated independently
- **Retry with Recovery**: Failed steps retry up to 2 times with fresh evaluation
- **Image Generation**: Uses Replit AI Integrations (charges to Replit credits)
- **Virtual Filesystem**: Files stored in PostgreSQL database as JSON

**Capabilities:**
- Strategic planning before execution
- Self-evaluation and self-correction
- Learning from past successes and failures
- Proactive enhancement beyond user requests
- Generate complete websites with images from natural language
- Create responsive designs with Tailwind CSS
- Build multi-page websites with proper structure

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npx drizzle-kit push` to sync database schema
- The server is configured to accept all hosts for Replit proxy compatibility

## Deployment
- Build: `npm run build`
- Start: `npm run start` (serves on port 5000)
- Deployment target: autoscale

## Environment Variables
- **OPENAI_API_KEY**: Required for AI generation (GPT-5.2 Codex)
- **DATABASE_URL**: PostgreSQL connection string (auto-configured)
