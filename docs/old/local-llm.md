# AI Agents with Local LLMs

testMuBrowser is designed to be the "Body" for your AI Agent "Brain".
Because we expose standard browser automation interfaces, you can plug in **any** LLM provider.

## Using Vercel AI SDK + Ollama

This example shows how to use the industry-standard `ai` package to control the browser with a local Llama 3 model.

### Prerequisites
1.  **Install testMuBrowser**: `npm install testmubrowser`
2.  **Install Vercel AI SDK**: `npm install ai ollama-ai-provider zod`
3.  **Run Ollama**: `ollama run llama3`

### Example Code

See [examples/agent-with-local-llm.ts](../examples/agent-with-local-llm.ts) for the full source.

```typescript
import { testMuBrowser } from 'testmubrowser';
import { generateObject } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { z } from 'zod';

const model = ollama('llama3');

async function run() {
    const client = new testMuBrowser();
    // Launch local Chrome
    const session = await client.sessions.create({ local: true });
    
    // ... connect and scrape ...
    
    // Ask LLM for decision
    const { object } = await generateObject({
        model,
        schema: z.object({ action: z.enum(['click', 'type']), ... }),
        prompt: `Page HTML: ${html}\nGoal: Search for 'Agents'`
    });
    
    // ... execute action ...
}
```

### Why this architecture?
*   **Privacy**: Your screen content never leaves `localhost`.
*   **Cost**: $0 inference costs.
*   **Control**: You define the Agent Loop, the Prompt, and the System Instructions.
