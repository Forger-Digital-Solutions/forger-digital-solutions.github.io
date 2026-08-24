# Kayla Copilot - Phase 2

## Overview

Phase 2 transforms Kayla Copilot from a static/local knowledge assistant into a real conversational AI assistant with:

- Secure server-side AI execution architecture
- Provider abstraction for multiple AI providers
- RAG (Retrieval-Augmented Generation) using the existing FDS knowledge system
- Improved fuzzy/typo-tolerant retrieval
- Streaming response support
- Bounded conversation memory
- Page-aware context
- Source grounding
- Prompt-injection defense
- Rate limiting
- Request validation
- Provider failure fallback

## Architecture

### AI Request Flow

```
User asks question
        ↓
Browser sends POST to /api/kayla/chat
        ↓
Server-side Kayla handler:
  1. Rate limit check
  2. Request validation
  3. Prompt injection detection
  4. FDS knowledge retrieval (RAG)
  5. AI provider configured and healthy?
        ├── YES → grounded AI response
        └── NO  → local Phase 1 response
        ↓
Response with sources and safe actions
```

### Provider System

The provider abstraction in `src/lib/kayla/provider.ts` supports:

- **Mock Provider**: For testing without API keys
- **OpenRouter Provider**: Free tier models available (e.g., `google/gemini-2.0-flash-001`)
- **Local Fallback**: Always available when no provider is configured

### No-Surprise-Cost Policy

- Kayla only uses AI when explicitly configured with `KAYLA_ENABLED=true` and a valid provider
- Free/mock providers can be used for testing
- No automatic billable fallback - if the provider fails, local fallback is used
- API keys are NEVER exposed to the client

## File Structure

```
src/
├── data/kayla/
│   ├── types.ts          # All Kayla TypeScript interfaces
│   ├── index.ts          # Main exports, LocalKaylaProvider
│   ├── retrieval.ts      # Fuzzy knowledge retrieval system
│   ├── apps/             # App-specific knowledge
│   ├── company/          # Company and founder knowledge
│   ├── ecosystem/        # Forged ecosystem knowledge
│   ├── roadmap.ts        # Roadmap data
│   ├── community.ts      # Community initiatives
│   ├── downloads.ts      # Download registry
│   └── support.ts        # Support info and FAQs
├── lib/kayla/
│   ├── config.ts         # Environment variable configuration
│   ├── provider.ts       # AI provider abstraction
│   ├── handler.ts        # Server-side chat handler
│   ├── validate.ts       # Request validation and injection detection
│   ├── rateLimit.ts      # Rate limiting
│   ├── systemPrompt.ts   # System prompt and RAG prompt builder
│   ├── context.ts        # Page context detection
│   ├── actions.ts        # Safe structured actions
│   └── requestUtils.ts   # Request utilities
├── server/kayla/
│   └── chat.endpoint.ts  # API endpoint (for server deployment)
└── components/
    ├── KaylaCopilot.astro # UI component
    └── KaylaCopilot.ts    # Client-side logic
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Enable AI features
KAYLA_ENABLED=true

# Provider: 'mock' for testing, 'openrouter' for real AI
KAYLA_PROVIDER=mock

# Model (OpenRouter)
KAYLA_MODEL=google/gemini-2.0-flash-001

# API key (never commit real keys)
KAYLA_API_KEY=your_key_here
```

See `.env.example` for all available options.

## Security Features

### Prompt Injection Protection

Detected and blocked:
- "Ignore previous instructions" attempts
- System prompt requests
- Credential/key requests
- Environment file requests
- Developer impersonation attempts
- JavaScript/script injection

### Rate Limiting

- Per-IP rate limiting (configurable, default: 10 requests/minute)
- Sliding window implementation
- Returns 429 status with retry-after information

### Request Validation

- Message length limits
- History size limits
- Payload size limits
- Input sanitization

### Safe Actions

Only allowlisted action types are permitted. Actions never execute arbitrary code or navigate to untrusted URLs.

## Retrieval Improvements

### Fuzzy Matching

The retrieval system handles typos and variations:
- "FogerEMS" → ForgerEMS
- "Kyrablox" → KyraBlox
- "Farmstand finder" → FarmStand Finder
- "WeThePeple" → We The People

### Scoring

Results are scored by:
- Exact title matches (highest weight)
- Tag/category matches
- Text content matches
- Page context boost (when viewing a specific page)
- Fuzzy typo-tolerant matches

## Deployment Notes

### Static Deployment (GitHub Pages)

For static-only deployments:
1. The API endpoint is not included in the build
2. Kayla automatically falls back to local knowledge mode
3. All AI features are server-side only

### Server Deployment

To enable AI features:
1. Install a server adapter (e.g., `@astrojs/node`)
2. Move `src/server/kayla/chat.endpoint.ts` to `src/pages/api/kayla/chat.ts`
3. Configure environment variables
4. Deploy to your server platform

## Testing

```bash
# Run all tests
npm test

# Run validation (content + types + build)
npm run validate

# Build for production
npm run build
```

### Test Coverage

- Provider abstraction and fallback behavior
- Fuzzy retrieval and typo tolerance
- Prompt injection detection
- Rate limiting
- Request validation
- Security boundaries (API keys, system prompts, credentials)
- All five app knowledge grounding
- ForgerEMS version grounding
- Conversation context continuity
- Page context awareness

## How to Run Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:4321` and click the Kayla Copilot launcher.

## How to Enable Real AI

1. Copy `.env.example` to `.env`
2. Set `KAYLA_ENABLED=true`
3. Set `KAYLA_PROVIDER=mock` for testing or `KAYla_PROVIDER=openrouter` for real AI
4. If using OpenRouter, set `KAYLA_API_KEY=your_key`
5. Restart the dev server

## How to Verify Fallback Mode

1. Ensure `KAYLA_ENABLED=false` or leave `KAYLA_PROVIDER` empty
2. Use Kayla Copilot
3. Status should show "Knowledge Mode"
4. Answers come from local FDS knowledge base
