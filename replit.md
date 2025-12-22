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
- Advanced project editor with 8 tabs (Code, Visual, AI, Packages, Terminal, SEO, Resources, Integrations)
- **AI generation and chat powered by GPT-5.1 Codex Max via Responses API using OPENAI_API_KEY**
- **Auto-persistence for packages, resources, SEO, and integrations**
- **Interrupted message recovery on reload**
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
- **projects**: id, userId, name, description, status, siteConfig, pages, files, packages, seoSettings, resources, integrations, terminalHistory, timestamps
- **deployments**: id, projectId, status, url, buildLog, createdAt
- **chatMessages**: id, projectId, role, content, createdAt

## Features Implemented

### Core Features
- Landing page with feature overview
- User registration and login
- Dashboard with project list
- New project creation (manual or AI-assisted flow)

### Project Editor (8 Tabs)
1. **Code Editor**: File tree with multiple files/folders, code editing with live preview
2. **Visual Editor**: Component palette (drag-and-drop coming soon)
3. **AI Assistant**: Chat with GPT-5.2 Codex, conversation history saves
4. **Package Manager**: Install/uninstall npm packages
5. **Terminal**: Run shell commands
6. **SEO Settings**: Title, description, keywords, OG image, robots
7. **Resources**: RAM (up to 128GB), CPU cores (up to 16), GPU (A100, H100, RTX 4090, T4)
8. **Integrations**: Google Analytics, Stripe, Auth0, Cloudinary, SendGrid, Twilio, Firebase, Supabase

### AI Agent Capabilities (Fully Autonomous)
The hgland Agent (powered by GPT-5.1 Codex Max) is a fully autonomous agent with 6 tools:

**Tools Available:**
1. **generate_image**: Generate images using gpt-image-1 via Replit AI Integrations
2. **create_file**: Create new files with content
3. **edit_file**: Edit existing file content
4. **delete_file**: Delete files from the project
5. **read_file**: Read file contents
6. **run_terminal**: Execute terminal commands
7. **install_package**: Install npm packages
8. **list_files**: List project files

**Key Features:**
- **Context Compaction**: Automatically summarizes older messages when >20 messages, enabling indefinite sessions
- **Autonomous Execution**: Plans and executes multi-step tasks without user intervention
- **Image Generation**: Uses Replit AI Integrations (AI_INTEGRATIONS_OPENAI_BASE_URL/API_KEY) - charges to Replit credits
- **Virtual Filesystem**: Files stored in PostgreSQL database as JSON, not on disk

**Capabilities:**
- Have natural conversations with users
- Generate complete websites with images from natural language
- Create responsive designs with Tailwind CSS
- Build multi-page websites with proper structure
- Generate and manage images for websites
- Install packages and run build commands

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
