# 📚 Project Dependencies & Best Practices

This document provides a comprehensive guide to the core dependencies used in `testMuBrowser`. It effectively serves as `Connect 7` for our engineering team—a central hub for connecting with the tools that power our agentic capabilities.

## 🏗 Core Infrastructure

### 1. Puppeteer Core (`puppeteer-core`)
**Role:** The "Hands" of the Agent.
**Why Core?** We use `puppeteer-core` instead of `puppeteer` to decouple the library from the browser binary. This is critical for connecting to remote grids (like generic LambdaTest, Steel.dev, etc.) or using a locally installed Chrome.

#### 🌟 Best Practices
- **Explicit Connection:** Always use `browser.connect()` with a WebSocket Endpoint (WSE) rather than `launch()`. This ensures portability.
- **Context Isolation:** Use `browser.createBrowserContext()` (or `useEffect`-like cleanup) to ensure session data (cookies, cache) acts like an incognito window unless persistence is explicitly required.
- **Selector Resilience:** Avoid brittle selectors like `div > div:nth-child(3)`. Prefer semantic selectors (`aria-label`, `role`) or text-based robust matching.

```typescript
// FANG-Style Pattern: Resilient Click
async function safeClick(page: Page, selector: string) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    await page.click(selector);
  } catch (e) {
    throw new Error(`Element ${selector} not interactive: ${e.message}`);
  }
}
```

### 2. Puppeteer Extra & Stealth (`puppeteer-extra-plugin-stealth`)
**Role:** The "Camouflage".
**Usage:** Standard Puppeteer leaks tell-tale signs of automation (e.g., `navigator.webdriver = true`). The stealth plugin patches these leaks.

#### ⚠️ Gotchas
- **Order Matters:** Plugins must be applied *before* the browser is launched or connected.
- **Remote vs. Local:** When running on some remote grids, advanced stealth might already be applied at the infrastructure level. Double-patching can sometimes cause conflicts.

---

## 🧠 Intelligence Layer

### 3. Vercel AI SDK (`ai`)
**Role:** The "Brain".
**description:** A unified interface for interacting with Large Language Models (LLMs). It abstracts away the differences between OpenAI, Anthropic, and Local models.

#### 🌟 Best Practices
- **Structured Outputs:** NEVER parse raw string JSON from an LLM. Always use `generateObject` with a Zod schema.
- **System Prompts:** Define the "persona" strongly in the system prompt. Agents forget who they are if not reminded.
- **Temperature Control:** Use low temperature (`0.0` - `0.2`) for actions (clicking, scraping) to ensure deterministic behavior. Use higher temperature (`0.7`) only for creative text generation.

```typescript
// Pattern: Type-Safe Decision Making
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    nextAction: z.enum(['click', 'scroll', 'done']),
    reasoning: z.string(),
  }),
  prompt: "Analyze the page state...",
});
```

### 4. Zod (`zod`)
**Role:** The "Guardrails".
**Usage:** Runtime validation for static types. We use it to strictly validate Environment Variables, API responses, and LLM decisions.

#### 🌟 FANG Standard
"Trust, but verify."
- **Config Validation:** Fail startup immediately if `OPENAI_API_KEY` is missing. Don't fail 20 minutes into a job.
- **Schema Reusability:** Define schemas in a shared `types.ts` or `schemas.ts` to share between the "Brain" (LLM) and the "Body" (Runtime).

---

## 🛠 Local Development Support

### 5. Ollama Provider (`ollama-ai-provider`)
**Role:** Free, local intelligence.
**Usage:** Allows developers to build and test agents without burning API credits.
**Tip:** Use `llama3` or `mistral` for local dev; they are fast and "smart enough" for basic DOM navigation validation.

---

## 📈 Testing & Quality

### 6. Jest (`jest`) & Ts-Jest (`ts-jest`)
**Role:** Assurance.
**Usage:** Unit testing for utility functions.
**Recommendation:** For browser agents, unit tests are limited. Focus on **Integration Tests** that run against a real site (like `examples/enterprise-agent`).

---

## 🔗 "Connect 7" Mental Model

When building a new feature, cycle through these 7 checks:
1.  **Type Safety:** Is every data interface typed with Zod?
2.  **Resilience:** Does the browser interaction handle network flakes?
3.  **Observability:** Are we logging *why* an agent made a decision?
4.  **Security:** Are secrets safely managed (env vars)?
5.  **Stealth:** Is the bot detected by simple blockers?
6.  **Cleanup:** Are resources (pages, browser adapters) closed in `finally` blocks?
7.  **User Value:** Does this action actually solve the user's intent?

---

*Verified by Antigravity Engineering*
