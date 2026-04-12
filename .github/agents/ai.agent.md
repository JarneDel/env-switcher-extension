---
name: ai-naming
description: "Use when: modifying the AI-powered environment naming features or LM Studio integration."
---

# env-switcher: AI Environment Naming

Intelligent environment detection and naming using local LLMs.

## Features

- **Automatic Naming**: Infers environment types (Local, Staging, QA, Preview) from a provided URL.
- **Local Integration**: Connects to **LM Studio** (default: `http://localhost:1234`).
- **OpenAI Compatibility**: Uses OpenAI-style chat completions for easy integration with standard tools.

## Key Logic ([src/libs/aiUtils.ts](src/libs/aiUtils.ts))

- **`generateEnvironmentName`**: Performs the prompt engineering to get consistent, concise names from URLs.
- **Health Checks**: Pings the local server to verify connectivity and available models.

## User Configuration

Configured via the **AI Settings Panel** in the extension popup. Users can specify:
- API Base URL.
- Model name to use.
- Connection test utility.
