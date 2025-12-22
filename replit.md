# hgland - AI-Powered Website Builder Platform

## Overview
hgland is an AI-powered website builder platform built around a fully autonomous build agent called **hgland Agent**, powered by **GPT-5.1 Codex Max** via OpenAI API. The platform allows users to create websites through AI generation, drag-and-drop visual editing, or manual code editing.

## Current State
- Full platform UI implemented with Next.js 16
- PostgreSQL database with users, projects, and deployments tables
- User authentication system (signup/login with JWT)
- Dashboard for project management
- Project editor with Visual, Code, and AI tabs
- **AI generation powered by GPT-5.1 Codex Max using OPENAI_API_KEY**
- Development server running on port 5000

## Tech Stack
- **Frontend/Backend**: Next.js 16 with TypeScript (fullstack)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Authentication**: JWT with jose library, bcryptjs for password hashing
- **AI**: OpenAI GPT-5.1 Codex Max via openai npm package
- **Runtime**: Node.js 20

## Project Structure
```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   └── generate/route.ts   # AI generation endpoint
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── signup/route.ts
│   │   │   └── projects/
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── projects/
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx (landing page)
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
- **projects**: id, userId, name, description, status, siteConfig, pages, timestamps
- **deployments**: id, projectId, status, url, buildLog, createdAt

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npx drizzle-kit push` to sync database schema
- The server is configured to accept all hosts for Replit proxy compatibility

## Deployment
- Build: `npm run build`
- Start: `npm run start` (serves on port 5000)
- Deployment target: autoscale

## Environment Variables
- **OPENAI_API_KEY**: Required for AI generation (GPT-5.1 Codex Max)
- **DATABASE_URL**: PostgreSQL connection string (auto-configured)

## Authentication Flow
- Users sign up with email, phone, password, birth date, full name, and username
- Passwords are hashed with bcryptjs (12 rounds)
- JWT tokens are stored in httpOnly cookies
- Sessions expire after 7 days

## Features Implemented
- Landing page with feature overview
- User registration and login
- Dashboard with project list
- New project creation (manual or AI-assisted flow)
- Project editor with three modes:
  - Visual Editor (component palette and canvas with live preview)
  - Code Editor (file tree and code textarea with live preview, save to database)
  - AI Assistant (GPT-5.1 Codex Max powered generation)
- AI website generation from description
- Project save/persistence to database

## AI Agent Capabilities
The hgland Agent (powered by GPT-5.1 Codex Max) can:
- Generate complete website HTML from natural language descriptions
- Create responsive, modern designs with Tailwind CSS
- Build multi-page websites with proper structure
- Generate SEO-friendly content and markup
