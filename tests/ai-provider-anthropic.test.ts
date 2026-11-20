import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatCompletion, hasOpenAIKey } from '../src/lib/openai';

const realFetch = globalThis.fetch;

function withEnv(env: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const saved: Record<string, string | undefined> = {};
    for (const k of Object.keys(env)) {
      saved[k] = process.env[k];
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    try {
      await fn();
    } finally {
      for (const k of Object.keys(saved)) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
      globalThis.fetch = realFetch;
    }
  };
}

test(
  'hasOpenAIKey: true when only ANTHROPIC_API_KEY is set',
  withEnv({ ANTHROPIC_API_KEY: 'sk-ant-test-1234567890', OPENAI_API_KEY: undefined }, async () => {
    assert.equal(hasOpenAIKey(), true);
  }),
);

test(
  'hasOpenAIKey: false when no provider key',
  withEnv({ ANTHROPIC_API_KEY: undefined, OPENAI_API_KEY: undefined }, async () => {
    assert.equal(hasOpenAIKey(), false);
  }),
);

test(
  'chatCompletion: uses Anthropic Messages API, splits system prompt, returns text',
  withEnv({ ANTHROPIC_API_KEY: 'sk-ant-test-1234567890', OPENAI_API_KEY: 'sk-openai-should-not-be-used' }, async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: ' merhaba ' }] }), { status: 200 });
    }) as typeof fetch;

    const out = await chatCompletion(
      [
        { role: 'system', content: 'Sistem talimatı' },
        { role: 'user', content: 'Selam' },
      ],
      { temperature: 1.7, maxTokens: 50 },
    );

    assert.equal(out, 'merhaba');
    assert.ok(captured);
    const c = captured as { url: string; init: RequestInit };
    assert.equal(c.url, 'https://api.anthropic.com/v1/messages');
    const headers = c.init.headers as Record<string, string>;
    assert.equal(headers['x-api-key'], 'sk-ant-test-1234567890');
    assert.equal(headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(String(c.init.body));
    assert.equal(body.system, 'Sistem talimatı');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Selam' }]);
    assert.equal(body.max_tokens, 50);
    // Newer Claude models reject `temperature`; the provider must not send it.
    assert.equal('temperature' in body, false);
    assert.match(body.model, /^claude/);
  }),
);

test(
  'chatCompletion: returns null on non-OK response',
  withEnv({ ANTHROPIC_API_KEY: 'sk-ant-test-1234567890' }, async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { type: 'authentication_error', message: 'bad key' } }), {
        status: 401,
      })) as typeof fetch;
    const out = await chatCompletion([{ role: 'user', content: 'x' }]);
    assert.equal(out, null);
  }),
);
