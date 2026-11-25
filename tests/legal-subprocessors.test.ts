import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SUBPROCESSORS, subprocessorTable, subprocessorLegalVars, transferList, DATA_COPY } from '../src/lib/legal/subprocessors';
import { getLegalTemplateDefault } from '../src/lib/legal/templates';

describe('sub-processor list', () => {
  it('matches the real infrastructure', () => {
    const names = SUBPROCESSORS.map((s) => s.name).join(' ');
    for (const n of ['Vultr', 'Anthropic', 'OpenAI', 'Resend', 'Sentry', 'Firebase', 'Google APIs', 'reCAPTCHA', 'Google Analytics', 'Yandex', 'PayNKolay']) {
      assert.ok(names.includes(n), n);
    }
    assert.ok(!/Supabase|Upstash|Vercel/.test(names));
  });

  it('builds TR and EN tables; the transition note ends after the rollback date', () => {
    const tr = subprocessorTable('tr', new Date('2026-11-30'));
    assert.ok(tr.startsWith('| Alt yüklenici |') && tr.includes('Frankfurt, Almanya') && tr.includes('Geçiş dönemi'));
    const en = subprocessorTable('en', new Date('2027-01-01'));
    assert.ok(en.startsWith('| Sub-processor |') && !en.includes('Transition'));
    assert.ok(!transferList().includes('Vultr'));
  });

  it('the DPA template uses the placeholders and no old provider', () => {
    for (const lang of ['tr', 'en'] as const) {
      const c = getLegalTemplateDefault('veri-isleyici-sozlesmesi', lang).content;
      assert.ok(c.includes('{{SUBPROCESSOR_TABLE}}') && c.includes('{{SUBPROCESSOR_TRANSFER_LIST}}'));
      assert.ok(!/Supabase|Upstash|Vercel/.test(c));
      assert.ok(subprocessorLegalVars(lang).SUBPROCESSOR_TABLE.includes('Vultr'));
    }
  });

  it('marketing copy names the hosting and both AI providers', () => {
    assert.ok(DATA_COPY.hosting.tr.includes('Vultr') && DATA_COPY.hosting.en.includes('Frankfurt'));
    assert.ok(DATA_COPY.aiProvider.tr.includes('Anthropic') && DATA_COPY.aiProvider.tr.includes('OpenAI'));
  });
});
