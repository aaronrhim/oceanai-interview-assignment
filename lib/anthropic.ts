import Anthropic from "@anthropic-ai/sdk";
import { env, liveAgentsEnabled } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __oceanx_anthropic: Anthropic | undefined;
}

export function getAnthropic(): Anthropic {
  if (!env.anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return (globalThis.__oceanx_anthropic ??= new Anthropic({ apiKey: env.anthropicKey }));
}

export interface RunModelOpts<T> {
  model: string;
  system: string;
  user: string;
  /** Description of the JSON schema for the response. The model is instructed
   *  to return JSON matching this. We then validate with Zod. */
  responseShape: string;
  /** Zod parser. */
  parse: (raw: unknown) => T;
  /** Use prompt caching on the system prompt. */
  cacheSystem?: boolean;
  /** Extended thinking budget (Opus only). 0 disables. */
  thinkingBudgetTokens?: number;
  maxTokens?: number;
  /** Number of retries on JSON parse / schema failures. */
  retries?: number;
}

export interface RunModelResult<T> {
  value: T;
  tokens_in: number;
  tokens_out: number;
  cached: boolean;
  latency_ms: number;
  raw_text: string;
}

/**
 * Single-call structured-output runner. Asks the model to emit a JSON object
 * matching `responseShape`, parses with Zod, retries on shape failure.
 */
export async function runModel<T>(opts: RunModelOpts<T>): Promise<RunModelResult<T>> {
  if (!liveAgentsEnabled()) {
    throw new Error("Live agents disabled (DEMO_MODE=fixtures or no key)");
  }

  const client = getAnthropic();
  const retries = opts.retries ?? 1;
  const max_tokens = opts.maxTokens ?? 1500;

  const systemBlocks = opts.cacheSystem
    ? [
        {
          type: "text" as const,
          text: opts.system,
          cache_control: { type: "ephemeral" as const },
        },
      ]
    : opts.system;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const t0 = performance.now();
    const userPayload = attempt === 0
      ? opts.user
      : `${opts.user}\n\nYour previous response did not match the required JSON schema. Return ONLY valid JSON matching:\n${opts.responseShape}`;

    try {
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: opts.model,
        max_tokens,
        system: systemBlocks as never,
        messages: [{ role: "user", content: userPayload }],
      };
      if (opts.thinkingBudgetTokens && opts.thinkingBudgetTokens > 0) {
        // Extended thinking — only Opus 4.x supports this.
        (params as unknown as { thinking: unknown }).thinking = {
          type: "enabled",
          budget_tokens: opts.thinkingBudgetTokens,
        };
      }

      const resp = await client.messages.create(params);
      const latency_ms = Math.round(performance.now() - t0);

      const textBlock = resp.content.find((b) => b.type === "text");
      const raw_text = textBlock && "text" in textBlock ? textBlock.text : "";

      const json = extractJson(raw_text);
      const value = opts.parse(json);

      const usage = resp.usage as unknown as {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };

      return {
        value,
        tokens_in: usage.input_tokens + (usage.cache_read_input_tokens ?? 0),
        tokens_out: usage.output_tokens,
        cached: (usage.cache_read_input_tokens ?? 0) > 0,
        latency_ms,
        raw_text,
      };
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
    }
  }
  throw lastErr;
}

/** Pull the first JSON object/array out of a possibly-fenced model response. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Prefer fenced code block.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate: string = fence?.[1] ?? trimmed;
  const startObj = candidate.indexOf("{");
  const startArr = candidate.indexOf("[");
  const start =
    startObj === -1
      ? startArr
      : startArr === -1
        ? startObj
        : Math.min(startObj, startArr);
  if (start === -1) throw new Error("no JSON found in model output");
  const endObj = candidate.lastIndexOf("}");
  const endArr = candidate.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (end === -1 || end < start) throw new Error("malformed JSON in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}
