# Salesforce Opportunity Assistant - Frontend

React TypeScript application for the Salesforce Opportunity Assistant AI agent.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 19** - Latest React with TypeScript
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 📝 **ESLint + Prettier** - Code linting and formatting
- 🔧 **Absolute Imports** - Clean import paths with `@` aliases
- 🌍 **Environment Variables** - Centralized configuration

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Chat/           # Chat interface components
│   ├── Dashboard/      # Dashboard components
│   └── common/         # Common/shared components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API services and external integrations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions and constants
```

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SALESFORCE_CLIENT_ID` - Salesforce Connected App client ID
- `VITE_APP_NAME` - Application name

## Import Aliases

Use these aliases for clean imports:

- `@/` - src root
- `@components/` - components directory
- `@services/` - services directory
- `@types/` - types directory
- `@utils/` - utils directory
- `@hooks/` - hooks directory
- `@contexts/` - contexts directory
- `@pages/` - pages directory