/**
 * Profanity filter for text that a business sends to its customers through
 * Buaze (reply e-mails, Google review replies). Deterministic, no network:
 * runs before the AI moderation call in `moderateReplyContent`, and still
 * works when OPENAI_API_KEY is missing.
 *
 * Languages: Turkish, Azerbaijani, Kurdish, English, German, French, Dutch,
 * Spanish, Italian, Portuguese, Romanian, Polish, Czech, Slovak, Hungarian,
 * Serbian / Croatian / Bosnian, Bulgarian, Ukrainian, Russian, Greek,
 * Albanian, Swedish / Norwegian / Danish, Arabic, Persian, Hebrew, Hindi /
 * Urdu, Indonesian / Malay, Tagalog, Korean, Chinese and Japanese (script and
 * common Latin spellings). Anything else is left to the OpenAI moderation
 * layer.
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
  stem('hassiktir'),
  stem('hasiktir'),
  word('sktr'),
  word('siktr'),
  word('oç'),
  stem('orspu'),
  stem('kodumun'),
  stem('ta[şs]{1,2}a[kğ]'),
  word('yarak'),
  stem('yarağ'),
  // "Bok" is Turkish for shit; "bok choy" is a vegetable.
  `${B}bok(?:tan|u|a|lu|luk|un)?${E}(?!\\s*choy)`,
  stem('fahişe'),
  stem('fahise'),
  stem('kevaşe'),
  stem('kevase'),
  stem('kancı[kğ]'),
  stem('kancik'),
  stem('şıllı[kğ]'),
  stem('sillik'),
  stem('dallama'),
  stem('deyyus'),
  word('pezo'),
  stem('yarram'),
  word('sikim'),
  stem('sikiyim'),
  stem('sikecem'),
  stem('sikeceğim'),
  stem('sikecegim'),
  stem('sikmek'),
  stem('sikerler'),
  // "anasını / bacını / avradını ... sik-", "anana koyayım".
  `${B}(?:anan[ıi]|anas[ıi]n[ıi]|bac[ıi]n[ıi]|avrad[ıi]n[ıi]|ebeni|s[üu]laleni)\\s+s[iı]k\\p{L}*`,
  `${B}anan[ıia]\\s*koy\\p{L}*`,
  `${B}a[ğg]z[ıi]na\\s+s[ıi]ç\\p{L}*`,
  `${B}a[ğg]z[ıi]na\\s+sic\\p{L}*`,
  stem('sıçayım'),
  stem('sıçarım'),
  stem('sıçtığım'),
  stem('sicayim'),
  stem('sicarim'),
  stem('götveren'),
  stem('gotveren'),
  stem('ibine'),
  stem('ipne'),
  // ── English ───────────────────────────────────────────────────────────
  stem('fuck'),
  stem('motherfuck'),
  stem('fck'),
  word('wtf'),
  // "Shitake" is a common misspelling of shiitake.
  `${B}shit(?!t?ake)\\p{L}*${E}`,
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
  word('stfu'),
  word('gtfo'),
  // Compounds that hide the swear word inside ("dipshit", "clusterfuck").
  `\\p{L}*fuck\\p{L}*`,
  stem('(?:dip|horse|ape|bat|chicken|dog|jack|holy)shit'),
  stem('shithead'),
  stem('shithole'),
  stem('phuck'),
  stem('fvck'),
  word('fuk'),
  word('fuking'),
  word('fukin'),
  word('fuked'),
  word('fcuk'),
  word('fking'),
  word('fkn'),
  word('omfg'),
  word('lmfao'),
  word('fml'),
  stem('goddam'),
  stem('dammit'),
  word('damn\\s+(?:you|it)'),
  stem('screw\\s+you'),
  word('piss'),
  word('pissed'),
  word('pissing'),
  stem('piss\\s*off'),
  stem('sod\\s+off'),
  stem('bugger\\s+off'),
  word('bugger'),
  word('bollocks'),
  word('bloody\\s+hell'),
  word('crap'),
  word('crappy'),
  word('ass'),
  word('arse'),
  stem('asshat'),
  stem('smartass'),
  stem('dumbass'),
  stem('douchebag'),
  stem('cocksuck'),
  word('pussy'),
  stem('motherfucker'),
  word('mofo'),
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
  // ── Azerbaijani / Kurdish ─────────────────────────────────────────────
  stem('qəhbə'),
  stem('qehbe'),
  stem('qehpik'),
  stem('gijdıllaq'),
  stem('gijdillaq'),
  // ── Persian (script + common Latin spellings) ─────────────────────────
  stem('جنده'),
  stem('کیرم'),
  word('کیر'),
  stem('کونی'),
  stem('کس\\s*ننه'),
  stem('jendeh'),
  stem('kos\\s*nanat'),
  stem('kos\\s*kesh'),
  // ── Greek (script only: "malaka" is also a place name) ────────────────
  stem('μαλάκα'),
  stem('μαλακα'),
  stem('γαμώ'),
  stem('γαμω'),
  stem('πουτάνα'),
  stem('πουτανα'),
  // ── Dutch ─────────────────────────────────────────────────────────────
  stem('klootzak'),
  stem('godverdomme'),
  stem('kankerlijer'),
  stem('kutwijf'),
  // ── Polish / Czech / Slovak ───────────────────────────────────────────
  stem('kurw'),
  stem('chuj'),
  stem('pierdol'),
  stem('jeban'),
  stem('skurwysyn'),
  stem('spierdalaj'),
  stem('píča'),
  stem('zmrd'),
  stem('kokot'),
  stem('čurák'),
  // ── Hungarian ─────────────────────────────────────────────────────────
  word('kurva'),
  stem('kurvaany'),
  word('fasz'),
  stem('faszfej'),
  word('geci'),
  stem('baszd'),
  stem('bazdmeg'),
  // ── Romanian ──────────────────────────────────────────────────────────
  stem('pizd'),
  // "Pula" is also a Croatian city: only the phrase counts.
  stem('pula\\s*mea'),
  word('muie'),
  stem('futu\\s*-?\\s*ti'),
  // ── Serbian / Croatian / Bosnian ──────────────────────────────────────
  stem('jebem'),
  stem('jebiga'),
  stem('jebo'),
  stem('kurac'),
  stem('pička'),
  stem('picka'),
  // ── Bulgarian / Ukrainian / Serbian Cyrillic ──────────────────────────
  stem('курв'),
  stem('путка'),
  stem('пичка'),
  stem('мамка\\s*ти'),
  stem('їбан'),
  // ── Scandinavian ──────────────────────────────────────────────────────
  stem('fitta'),
  stem('jävla'),
  stem('jævla'),
  stem('kuksuger'),
  word('faen'),
  // ── Albanian ──────────────────────────────────────────────────────────
  stem('qifsha'),
  stem('pidh'),
  // ── Hindi / Urdu (romanized + scripts) ────────────────────────────────
  stem('madarchod'),
  stem('behenchod'),
  stem('bhenchod'),
  stem('chutiya'),
  stem('chutiye'),
  stem('bhosdi'),
  stem('gaandu'),
  stem('मादरचोद'),
  stem('बहनचोद'),
  stem('भेनचोद'),
  stem('चूतिया'),
  stem('भोसड'),
  stem('چوتیا'),
  // ── Indonesian / Malay / Tagalog ──────────────────────────────────────
  stem('kontol'),
  word('memek'),
  stem('ngentot'),
  stem('bangsat'),
  stem('pukimak'),
  stem('putang\\s*ina'),
  word('tangina'),
  // ── Hebrew ────────────────────────────────────────────────────────────
  stem('זונה'),
  stem('בן\\s*זונה'),
  stem('כוס\\s*אמק'),
  // ── Korean (particles attach, so stems) ───────────────────────────────
  stem('씨발'),
  stem('씨팔'),
  stem('개새끼'),
  stem('병신'),
  stem('좆'),
  // ── Chinese / Japanese (no spaces between words: plain substrings) ────
  '操你',
  '肏',
  '傻逼',
  '他妈的',
  '他媽的',
  '婊子',
  '王八蛋',
  'くたばれ',
  // Obscene gesture emoji.
  '\u{1F595}',
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

// Invisible characters used to split a word so filters miss it ("s\u200Biktir").
const INVISIBLE_RE = /[\u00AD\u180E\u200B-\u200F\u2060-\u2064\uFEFF]/g;

// Cyrillic / Greek letters that look like Latin ones ("ѕһіt", "fuсk").
const HOMOGLYPHS: Record<string, string> = {
  а: 'a', в: 'b', е: 'e', ё: 'e', і: 'i', ї: 'i', ј: 'j', к: 'k', м: 'm', н: 'h',
  о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', ѕ: 's', ԁ: 'd', ӏ: 'l', ү: 'y',
  һ: 'h', ԛ: 'q', ԝ: 'w', ɡ: 'g',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't',
  υ: 'u', χ: 'x', ζ: 'z',
};
const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPHS).join('')}]`, 'g');

/**
 * "s i k t i r", "f - u - c - k", "o ç": two or more single letters separated
 * by spaces or punctuation are read as one word.
 */
function joinSpacedLetters(text: string): string {
  return text.replace(
    /(?<![\p{L}\p{N}])\p{L}(?:[\s.\-_*·•|/\\]+\p{L}(?![\p{L}\p{N}])){1,}/gu,
    (m) => m.replace(/[^\p{L}]/gu, ''),
  );
}

function variants(text: string): string[] {
  // NFKC folds "fancy font" letters (𝐬𝐢𝐤, ｆｕｃｋ) into plain ones.
  const clean = text.replace(INVISIBLE_RE, '').normalize('NFKC');
  // Plain lowering turns "İ" into "i" + a combining dot; drop the dot so
  // "SİKTİR" reads as "siktir" while "SHIT" still reads as "shit".
  const lower = clean.toLowerCase().replace(/\u0307/g, '');
  // Turkish-aware lowering ("I" → "ı").
  const trLower = clean.toLocaleLowerCase('tr-TR');
  const latin = lower.replace(HOMOGLYPH_RE, (c) => HOMOGLYPHS[c] ?? c);
  const deLeet = latin.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  // "fuuuuck", "siiiiktir": collapse runs of 3+ identical letters.
  const collapsed = deLeet.replace(/(\p{L})\1{2,}/gu, '$1');
  // "f.u.c.k" / "s-i-k-t-i-r": drop separators between single letters.
  const joined = collapsed.replace(/(?<=\p{L})[.\-_*](?=\p{L})/gu, '');
  const spaced = joinSpacedLetters(collapsed);
  return Array.from(new Set([lower, trLower, latin, deLeet, collapsed, joined, spaced]));
}

/** True when the text contains a swear word in any supported language. */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false;
  return variants(text).some((v) => PROFANITY_RE.test(v));
}
