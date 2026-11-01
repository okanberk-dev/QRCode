/**
 * Profanity filter for text that a business sends to its customers through
 * Buaze (reply e-mails, Google review replies). Deterministic, no network:
 * runs before the AI moderation call in `moderateReplyContent`, and still
 * works when OPENAI_API_KEY is missing.
 *
 * Languages: Turkish, English, German, French, Spanish, Italian, Portuguese,
 * Russian (Cyrillic) and Arabic (script + common Latin spellings). Other
 * languages are covered by the OpenAI moderation layer.
 *
 * False positives block a legitimate reply with no override, so every entry
 * is either a whole word or a stem that has no common innocent meaning.
 * Turkish "sik-" is matched only in unambiguous forms because "sık" (often),
 * "sıkı" (tight) and "sıkıntı" are everyday words — especially when typed
 * without Turkish characters.
 */

// Letter-aware word boundaries (\b does not understand ç, ş, ı, ğ, ö, ü,
// Cyrillic or Arabic letters).
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';

/** Whole word, optionally followed by any letters (stem match). */
const stem = (s: string) => `${B}${s}\\p{L}*${E}`;
/** Exact whole word. */
const word = (s: string) => `${B}${s}${E}`;

const PATTERNS: string[] = [
  // ── Turkish ───────────────────────────────────────────────────────────
  stem('orospu'),
  stem('orosbu'),
  word('amk'),
  word('aq'),
  word('amq'),
  // "Amina" is a first name: the ASCII spelling only counts with a verb.
  stem('amına'),
  stem('amina\\s*(?:koy|kod|sok)'),
  word('amc[ıi]k'),
  stem('amc[ıi]ğ'),
  stem('siktir'),
  stem('sikerim'),
  stem('sikeyim'),
  stem('siktiğim'),
  stem('sikiş'),
  word('sikik'),
  stem('yarra[kğg]'),
  stem('dalyara[kğg]'),
  stem('yavşa[kğg]'),
  stem('yavsa[kğg]'),
  word('piç'),
  stem('piçler'),
  stem('kahpe'),
  stem('pezeven[kğg]'),
  stem('puşt'),
  stem('ibne'),
  stem('gavat'),
  stem('kaltak'),
  stem('sürtü[kğ]'),
  stem('şerefsiz'),
  stem('serefsiz'),
  stem('göt(?:ün|ünü|veren|oş|lek)'),
  word('göt'),
  stem('ananı\\s*s[iı]k'),
  stem('anan[ıi]\\s*s[iı]k'),
  // ── English ───────────────────────────────────────────────────────────
  stem('fuck'),
  stem('motherfuck'),
  stem('fck'),
  word('wtf'),
  stem('shit'),
  stem('bullshit'),
  stem('bitch'),
  stem('bastard'),
  stem('asshole'),
  word('arsehole'),
  word('dick'),
  stem('dickhead'),
  stem('cunt'),
  stem('whore'),
  stem('slut'),
  stem('wanker'),
  word('twat'),
  word('prick'),
  stem('jackass'),
  // ── German ────────────────────────────────────────────────────────────
  stem('scheiß'),
  stem('scheiss'),
  stem('arschloch'),
  stem('wichser'),
  stem('fotze'),
  stem('hurensohn'),
  stem('ficken'),
  word('fick'),
  // ── French ────────────────────────────────────────────────────────────
  word('putain'),
  word('merde'),
  stem('connard'),
  stem('connasse'),
  stem('salope'),
  stem('encul[ée]'),
  word('nique'),
  word('fils de pute'),
  // ── Spanish / Portuguese / Italian ────────────────────────────────────
  word('puta'),
  word('puto'),
  word('putas'),
  stem('hijo de puta'),
  word('mierda'),
  stem('cabr[óo]n'),
  stem('gilipollas'),
  word('coño'),
  word('joder'),
  stem('pendejo'),
  word('caralho'),
  word('porra'),
  stem('filho da puta'),
  word('merda'),
  stem('cazzo'),
  stem('vaffanculo'),
  stem('stronz[oa]'),
  stem('puttan[ae]'),
  // ── Russian ───────────────────────────────────────────────────────────
  stem('бля'),
  stem('сука'),
  word('суки'),
  stem('хуй'),
  stem('хуе'),
  stem('пизд'),
  stem('еба'),
  stem('ёба'),
  stem('ебл'),
  stem('мудак'),
  // ── Arabic ────────────────────────────────────────────────────────────
  stem('شرموط'),
  stem('منيوك'),
  word('كس'),
  stem('كسمك'),
  stem('sharmout'),
  stem('sharmut'),
  word('kos omak'),
  stem('kuss? ?ummak'),
];

const PROFANITY_RE = new RegExp(PATTERNS.join('|'), 'iu');

// Look-alike characters people use to slip past filters.
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

function variants(text: string): string[] {
  const lower = text.normalize('NFC').toLowerCase();
  // Turkish-aware lowering keeps İ → i; plain lowering turns it into i̇.
  const trLower = text.normalize('NFC').toLocaleLowerCase('tr-TR');
  const deLeet = lower.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  // "fuuuuck", "siiiiktir": collapse runs of 3+ identical letters.
  const collapsed = deLeet.replace(/(\p{L})\1{2,}/gu, '$1');
  // "f.u.c.k" / "s-i-k-t-i-r": drop separators between single letters.
  const joined = collapsed.replace(/(?<=\p{L})[.\-_*](?=\p{L})/gu, '');
  return Array.from(new Set([lower, trLower, deLeet, collapsed, joined]));
}

/** True when the text contains a swear word in any supported language. */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false;
  return variants(text).some((v) => PROFANITY_RE.test(v));
}
