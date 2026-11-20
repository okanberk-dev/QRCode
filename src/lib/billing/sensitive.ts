/**
 * Wrapper for values that must never reach a log, a JSON body, an error
 * message or Sentry: PayNKolay card tokens, TranIds and customer keys.
 *
 * `JSON.stringify`, `String()`, template literals, `util.inspect` and our own
 * loggers (`billing/redact.ts`) all see `[redacted]`. The only way out is
 * `.reveal()`, and `tests/billing-client-boundary.test.ts` limits where that
 * call may appear (PayNKolay request builders, the hosted form, vault crypto).
 *
 * It does NOT hide the value from Sentry's LocalVariables integration, which
 * reads locals through the V8 inspector; production therefore runs with
 * `includeLocalVariables: false` (sentry.server.config.ts).
 *
 * Edge-safe: no Node imports.
 */

const INSPECT = Symbol.for('nodejs.util.inspect.custom');
const REDACTED = '[redacted]' as const;

export class Sensitive<T extends string = string> {
  readonly #value: T;

  constructor(value: T) {
    if (typeof value !== 'string') throw new TypeError('Sensitive: value must be a string');
    this.#value = value;
  }

  /** The only way out. Keep call sites few and grep-able. */
  reveal(): T {
    return this.#value;
  }

  toJSON(): typeof REDACTED {
    return REDACTED;
  }

  toString(): typeof REDACTED {
    return REDACTED;
  }

  valueOf(): typeof REDACTED {
    return REDACTED;
  }

  [Symbol.toPrimitive](): typeof REDACTED {
    return REDACTED;
  }

  [INSPECT](): 'Sensitive([redacted])' {
    return 'Sensitive([redacted])';
  }
}

export function sensitive<T extends string>(v: T): Sensitive<T> {
  return new Sensitive(v);
}

export function isSensitive(v: unknown): v is Sensitive {
  return v instanceof Sensitive;
}
