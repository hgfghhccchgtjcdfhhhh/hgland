# hgland - AI-Powered Website Builder Platform

## Overview
hgland is an AI-powered website builder platform built around a fully autonomous build agent. The platform allows users to create websites through AI generation, drag-and-drop visual editing, or manual code editing.

## Current State
- Initial project setup with Next.js 16
- PostgreSQL database configured
- Development server running on port 5000

## Tech Stack
- **Frontend/Backend**: Next.js with TypeScript (fullstack)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Replit built-in)
- **Runtime**: Node.js 20

## Project Structure
```
/
├── src/
│   └── app/
│       ├── layout.tsx     # Root layout
│       ├── page.tsx       # Home page
│       ├── globals.css    # Global styles
│       └── favicon.ico
├── public/                # Static assets
├── next.config.ts         # Next.js configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.ts     # Tailwind configuration
```

## Development
- Run `npm run dev` to start the development server on port 5000
- The server is configured to accept all hosts for Replit proxy compatibility

## Deployment
- Build: `npm run build`
- Start: `npm run start` (serves on port 5000)

## Database
PostgreSQL database is available via environment variables:
- DATABASE_URL
- PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

## Planned Features (from AGENTPROMPT.txt)
- Full AI generation with autonomous agent
- Drag-and-drop visual editor
- Manual code editing with live preview
- SEO tooling (meta tags, sitemap, robots.txt)
- One-click deployment
- User authentication (Email, Phone, Password, Birth Date, Full name, Username)
