/**
 * Reply risk gate — deterministic rules for text a business sends to its
 * customers through Buaze (reply e-mails to low-rated feedback, Google review
 * replies).
 *
 * Every reply goes out under the Buaze brand, so anything that could expose
 * Buaze legally or hurt its sender reputation is a hard block — no override,
 * no "send anyway" (CLAUDE.md §45, §48). This module is pure (no network, no
 * Sentry, no Prisma) so the composers can run it live while the owner types,
 * and the server runs the same rules before anything is stored or sent.
 *
 * Categories:
 *   unusual_characters — invisible / direction-changing characters, letters
 *     from another alphabet hidden inside a word, "fancy font" letters, zalgo
 *   profanity          — swear words in 9 languages (src/lib/profanity.ts),
 *                        masked swears ("f*ck"), obscene emoji
 *   insult             — name-calling a customer (hakaret, TCK 125)
 *   threat             — threats of violence or harm
 *   legal_intimidation — threatening the customer with a lawsuit / police
 *   hate               — slurs and discriminatory statements
 *   review_pressure    — asking to delete / change a review or rating, or
 *                        offering something in exchange for one (Google
 *                        policy + Ticaret Bakanlığı yorum yönetmeliği)
 *   personal_data      — TC kimlik no, card number, IBAN
 *   link               — links outside the business's own saved addresses,
 *                        shorteners, IP addresses, disguised links
 *   markup             — HTML / script injection
 *
 * False positives block a legitimate reply with no override, so every rule
 * is written for an unambiguous reading; `tests/reply-risk.test.ts` pins
 * everyday sentences that must keep passing.
 */

import { containsProfanity } from './profanity';

export type ReplyRiskKind =
  | 'unusual_characters'
  | 'profanity'
  | 'insult'
  | 'threat'
  | 'legal_intimidation'
  | 'hate'
  | 'review_pressure'
  | 'personal_data'
  | 'link'
  | 'markup';

/** Order in which issues are reported (most serious first). */
export const REPLY_RISK_ORDER: readonly ReplyRiskKind[] = [
  'threat',
  'hate',
  'profanity',
  'insult',
  'legal_intimidation',
  'review_pressure',
  'personal_data',
  'markup',
  'link',
  'unusual_characters',
];

export interface ReplyRiskOptions {
  /**
   * Hosts the business has saved (website, review platforms, social). Links
   * to these (and their subdomains) are allowed; every other link blocks.
   * `buaze.com` is always allowed (public menu / review links).
   */
  allowedHosts?: readonly string[];
  /**
   * Client preview: the composer does not know the business's saved hosts,
   * so links are reported as a warning instead of a block. The server always
   * runs with links enforced.
   */
  linksAsWarning?: boolean;
}

export interface ReplyRiskResult {
  blocked: boolean;
  /** Blocking issues, most serious first. */
  issues: ReplyRiskKind[];
  /** Non-blocking notes (only `link` in client preview mode). */
  warnings: ReplyRiskKind[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';

/** Lowercase (Turkish-aware), strip accents and invisible characters: "Gerizekalı" → "gerizekali". */
export function foldText(text: string): string {
  return text
    .replace(/[­᠎​-‏⁠-⁤﻿]/g, '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i');
}

function anyMatch(patterns: readonly RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

function rx(body: string): RegExp {
  return new RegExp(body, 'u');
}

/** Sentences, so co-occurrence rules don't reach across the whole reply. */
function sentences(folded: string): string[] {
  return folded.split(/[.!?;\n]+/u).map((s) => s.trim()).filter(Boolean);
}

// ─── Characters ("uygunsuz harfler") ────────────────────────────────────

const BIDI_CONTROL = /[‪-‮⁦-⁩]/u;
// C0/C1 controls except tab, newline, vertical tab, form feed, carriage return.
const CONTROL = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/u;
// Unicode "tag" characters — invisible text smuggling.
const TAG_CHARS = /[\u{E0000}-\u{E007F}]/u;
// An invisible character between two letters is a word split to dodge filters.
const INVISIBLE_IN_WORD =
  /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}][­᠎​-‍⁠-⁤﻿]+[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u;
// "Fancy font" letters: mathematical alphanumerics, fullwidth Latin, circled letters.
const FANCY_LETTERS = /[\u{1D400}-\u{1D7FF}Ａ-Ｚａ-ｚⒶ-ⓩ]/u;
// Zalgo: a letter carrying three or more combining marks (after NFC).
const ZALGO = /\p{L}\p{M}{3,}/u;

function hasMixedScriptWord(text: string): boolean {
  const words = text.match(/[\p{L}\p{M}]+/gu) ?? [];
  return words.some(
    (w) => /\p{Script=Latin}/u.test(w) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(w),
  );
}

function hasUnusualCharacters(raw: string): boolean {
  const nfc = raw.normalize('NFC');
  return (
    BIDI_CONTROL.test(nfc) ||
    CONTROL.test(nfc) ||
    TAG_CHARS.test(nfc) ||
    INVISIBLE_IN_WORD.test(nfc) ||
    FANCY_LETTERS.test(nfc) ||
    ZALGO.test(nfc) ||
    hasMixedScriptWord(nfc)
  );
}

// ─── Profanity extras ───────────────────────────────────────────────────

// "f*ck", "s*kt*r", "b**ch": letters with an asterisk/hash mask between them.
const MASKED_SWEAR = /\p{L}[*#]+\p{L}|(?<![\p{L}\p{N}])\p{L}[*#]{2,}(?![\p{L}\p{N}*#])/u;

// ─── Insults (run on folded text) ───────────────────────────────────────

const COPULA = '(?:sin(?:iz)?|sun(?:uz)?|\\s+mi(?:sin|siniz)|\\s+herif|\\s+adam|\\s+kadin|\\s+insan)';
// "You're an animal lover" is a compliment, not an insult.
const NOT_INSULT_TAIL = '(?![\\s-]+(?:lovers?|friendly|owners?|farmers?|person|people|rights|welfare|shelter|fans?|sanctuary|plant|about|for|enough|health))';

const INSULT: RegExp[] = [
  rx(`${B}aptal(?:sin(?:iz)?|lar|lik|in)?${E}`),
  rx(`${B}salak(?:sin(?:iz)?|lar|lik|in)?${E}`),
  rx(`${B}geri\\s*zekal\\p{L}*`),
  rx(`${B}gerzek\\p{L}*`),
  rx(`${B}beyinsiz\\p{L}*`),
  rx(`${B}dangalak\\p{L}*`),
  rx(`${B}ahmak\\p{L}*`),
  rx(`${B}embesil\\p{L}*`),
  rx(`${B}avanak\\p{L}*`),
  rx(`${B}hoduk\\p{L}*`),
  rx(`${B}cahil(?:sin(?:iz)?|ler|lik|\\s+(?:insan|herif|adam|musteri))?${E}`),
  // "Yalancı dolma / sarma" is a dish.
  rx(`${B}yalanci\\p{L}*${E}(?!\\s+(?:dolma|sarma|biber|yaprak))`),
  rx(`${B}iftiraci\\p{L}*`),
  rx(`${B}dolandirici\\p{L}*`),
  rx(`${B}sahtekar\\p{L}*`),
  rx(`${B}terbiyesiz\\p{L}*`),
  rx(`${B}edepsiz\\p{L}*`),
  rx(`${B}haysiyetsiz\\p{L}*`),
  rx(`${B}namussuz\\p{L}*`),
  rx(`${B}ahlaksiz\\p{L}*`),
  rx(`${B}karaktersiz\\p{L}*`),
  rx(`${B}serseri\\p{L}*`),
  rx(`${B}psikopat\\p{L}*`),
  rx(`${B}herif\\p{L}*`),
  rx(`${B}(?:mal|manyak|hayvan|esek|okuz|domuz|kopek|zavalli|rezil|pislik|ezik|ayi|sigir|aval|odun|sersem|hiyar|maganda|hirsiz)${COPULA}${E}`),
  rx(`${B}it\\s+(?:herif|oglu)`),
  rx(`${B}(?:angut|andaval|mankafa|budala|kafasiz|akilsiz|yuzsuz|utanmaz|onursuz|arsiz|lavuk|kustah|ukala|kendini\\s+bilmez|kaz\\s+kafali)\\p{L}*`),
  rx(`${B}keko(?:lar|su|lar[ia]?)?${E}`),
  rx(`${B}asagilik\\p{L}*${E}(?!\\s+kompleks)`),
  // "Lan / ulan" is rude in any reply; "LAN party / kablosu" is a network.
  rx(`${B}u?lan${E}(?!\\s*(?:party|parti|kablo|ag|baglanti|port|bator|batur|ude)\\p{L}*)`),
  // "Defolu" (defective) is a retail word: only the imperative counts.
  rx(`${B}defol(?:un|sun|sunuz|up|asica)?${E}`),
  rx(`${B}haddini(?:zi)?\\s+bil`),
  rx(`${B}agzini(?:zi)?\\s+topla`),
  rx(`${B}ceneni(?:zi)?\\s+kapa`),
  rx(`${B}(?:sesini(?:zi)?\\s+kes|kes\\s+sesini)`),
  rx(`${B}cehenneme\\s+(?:kadar|git|gidin|gidebilir|yolun)`),
  rx(`${B}canin(?:iz)?\\s+cehenneme`),
  rx(`${B}belani(?:zi)?\\s+(?:versin|bul)`),
  rx(`${B}allah(?:'?in)?\\s+belasi`),
  rx(`${B}(?:seni|sizi)\\s+(?:allah\\s+)?kahret`),
  rx(`${B}kahrol(?:sun|un|asi\\p{L}*)${E}`),
  rx(`${B}geberesice\\p{L}*`),
  rx(`${B}ne\\s+cur'?etle`),
  // Only with the noun right after "gibi": "sizin gibi değerli misafirleri
  // kaybetmek istemiyoruz" is an apology, not an insult.
  rx(`${B}(?:sizin|senin)\\s+gibi(?:ler\\p{L}*|\\s+(?:musteri|insan|kisi|tip)\\p{L}*)\\s+(?:istemiyoruz|istemiyorum|ihtiyacimiz\\s+yok|gerek\\s+yok|gelmesin|gelmeyin|tahammul\\s+edemeyiz)`),
  rx(`${B}(?:aklin(?:iz)?\\s+(?:yok|kit|almiyor)|beyniniz?\\s+yok|kafan(?:iz)?\\s+(?:calismiyor|basmiyor))`),
  // English
  rx(`${B}idiot\\p{L}*`),
  rx(`${B}stupid${E}`),
  rx(`${B}moron\\p{L}*`),
  rx(`${B}dumb(?:ass)?${E}`),
  rx(`${B}imbecile\\p{L}*`),
  rx(`${B}loser${E}`),
  rx(`${B}liars?${E}`),
  rx(`${B}scammers?${E}`),
  rx(`${B}scumbag\\p{L}*`),
  rx(`${B}psycho\\p{L}*`),
  rx(`${B}low\\s*life${E}`),
  rx(`${B}pathetic${E}`),
  rx(`${B}ignorant${E}`),
  rx(`${B}(?:cretin|dimwit|halfwit|nitwit|numb?skull|bonehead|airhead|dunce|buffoon|nincompoop|lunatic|nutjob|nutcase|scum|scumbag|cheapskate|freeloader|lowlife|dipstick|twit|jerk|tosser)s?${E}(?!\\s+(?:chicken|pork|sauce|seasoning|spice))`),
  rx(`${B}you(?:'re|\\s+are|re)\\s+(?:a\\s+|an\\s+|so\\s+|such\\s+(?:a\\s+|an\\s+)?|just\\s+(?:a\\s+|an\\s+)?|nothing\\s+but\\s+(?:a\\s+|an\\s+)?|clearly\\s+(?:a\\s+|an\\s+)?|obviously\\s+(?:a\\s+|an\\s+)?|a\\s+total\\s+|a\\s+complete\\s+)?(?:joke|disgrace|clown|pig|animal|fool|nobody|trash|garbage|rubbish|scum|rat|snake|parasite|crazy|insane|mental|delusional|ungrateful|brat|ridiculous|worthless|useless|disgusting|lying|liar|greedy|entitled\\s+(?:brat|idiot|customer)|troll|fraud|fake)${E}${NOT_INSULT_TAIL}`),
  rx(`${B}you\\s+(?:suck|stink|people\\s+are)${E}`),
  rx(`${B}shut\\s+(?:the\\s+\\p{L}+\\s+)?up${E}(?!\\s+shop)`),
  rx(`${B}go\\s+to\\s+hell${E}`),
  rx(`${B}how\\s+dare\\s+you${E}`),
  rx(`${B}get\\s+a\\s+(?:life|brain|clue)${E}`),
  rx(`(?:^|[.!?,\\n]\\s*)(?:get\\s+lost|grow\\s+up|bite\\s+me|drop\\s+dead)${E}`),
  rx(`${B}(?:customers|people|guests)\\s+like\\s+you\\s+(?:are\\s+not|aren't|are\\s+never|are\\s+the\\s+(?:reason|problem)|ruin|should)`),
  rx(`${B}we\\s+(?:don't|do\\s+not)\\s+(?:need|want)\\s+(?:customers|people|guests)\\s+like\\s+you`),
  rx(`${B}(?:learn\\s+to\\s+read|can\\s+you\\s+even\\s+read|use\\s+your\\s+brain)${E}`),
];

// ─── Threats ────────────────────────────────────────────────────────────

const THREAT: RegExp[] = [
  // "dov" not followed by "iz": "sizi döviz kuru hakkında..." is about currency.
  rx(`${B}(?:seni|sizi)\\s+(?:\\p{L}+\\s+)?(?:oldur|gebert|dov(?!iz)|mahved|mahvet|bitir|yok\\s*ed|ezer|ezeri|bicakla|vur(?:acag|dur)|bogaca|asacag|sakat\\s*birak|perisan\\s+ed)\\p{L}*`),
  rx(`${B}dovdur(?:ur|ecek|ece)\\p{L}*`),
  rx(`${B}ayagini(?:zi)?\\s+kir`),
  rx(`${B}(?:dukkanini(?:zi)?|evini(?:zi)?|arabani(?:zi)?|isyerini(?:zi)?)\\s+(?:\\p{L}+\\s+)?(?:yak(?:ar|acag|aca|tir)|yik(?:ar|acag))\\p{L}*`),
  rx(`${B}(?:olumunu(?:zu)?|olmenizi|olmeni)\\s+(?:istiyorum|diliyorum|bekliyorum)`),
  rx(`${B}(?:seni|sizi)\\s+(?:\\p{L}+\\s+)?(?:pisman|perisan)\\s+ed(?:er|ecek)\\p{L}*`),
  rx(`${B}seni\\s+bul(?:ur|acag|acak|ucag)\\p{L}*`),
  rx(`${B}adamlarimi?\\s+(?:yollar|gonder)`),
  rx(`${B}kanini(?:zi)?\\s+dok`),
  rx(`${B}kafani(?:zi)?\\s+(?:kir|kopar|ezer|ucur)`),
  rx(`${B}agzini(?:zi)?\\s+(?:burnunu(?:zu)?\\s+)?(?:kir|dagit|yirt|ozer)`),
  rx(`${B}canini(?:zi)?\\s+(?:yak|cikar|alir)`),
  rx(`${B}bacak\\p{L}*\\s+kir`),
  rx(`${B}gozunu(?:zu)?\\s+(?:oyar|cikar)`),
  rx(`${B}(?:evini(?:zi)?|nerede\\s+(?:oturdugun|yasadigin)\\p{L}*)\\s+(?:\\p{L}+\\s+)?(?:biliyor|bulur)\\p{L}*`),
  rx(`${B}pisman\\s+(?:ol(?:ur|acak)s|ederim|edecegiz|ederiz)\\p{L}*`),
  rx(`${B}bedelini\\s+(?:agir\\s+)?ode(?:r|yecek)s\\p{L}*`),
  rx(`${B}hesabini(?:zi)?\\s+sor(?:ar|acag|acak)\\p{L}*`),
  rx(`${B}gorursun(?:uz)?\\s+(?:sen|siz)${E}`),
  rx(`${B}basin(?:iz)?a\\s+(?:is|bela)\\s+(?:acar|acariz|acacag|gelir|gelecek)\\p{L}*`),
  rx(`${B}sonunu(?:zu)?\\s+hazirla`),
  rx(`${B}geber(?:in|sin|esin|esiniz)?${E}`),
  rx(`${B}intihar\\s+et(?:in|sene|seniz)`),
  rx(`${B}olsen(?:iz)?\\s+(?:iyi|daha\\s+iyi)`),
  // English
  rx(`${B}(?:i|we)\\s*(?:will|'ll|am\\s+going\\s+to|'m\\s+going\\s+to|are\\s+going\\s+to|'re\\s+going\\s+to|gonna|would|'d|could|can)\\s+(?:\\p{L}+\\s+)?(?:kill|hurt|destroy|beat|ruin|punch|slap|stab|shoot|smash|strangle|choke|bury|crush|wreck|break)\\s+you(?:r\\s+(?:face|legs?|arms?|neck|head|bones|teeth|car|house|windows))?${E}`),
  rx(`${B}you(?:'ll|\\s+will)\\s+(?:pay\\s+for\\s+(?:this|that|it)|get\\s+what's\\s+coming)${E}`),
  rx(`${B}(?:i|we)\\s*(?:'ll|will)\\s+make\\s+you\\s+(?:pay|suffer|regret)${E}`),
  rx(`${B}hope\\s+you\\s+(?:die|rot|choke|suffer|get\\s+(?:sick|hurt|cancer|what\\s+you\\s+deserve))`),
  rx(`${B}you(?:'d)?\\s+better\\s+watch\\s+(?:out|yourself|it|your\\s+step)`),
  rx(`${B}(?:burn|torch)\\s+(?:down\\s+)?your\\s+(?:house|car|place|shop)`),
  rx(`${B}(?:i|we)\\s+know\\s+where\\s+you\\s+live`),
  rx(`${B}watch\\s+your\\s+back`),
  rx(`${B}you(?:'ll|\\s+will)\\s+regret${E}`),
  rx(`${B}you(?:'re|\\s+are)\\s+dead${E}`),
  rx(`${B}kill\\s+yourself`),
  rx(`${B}kys${E}`),
  rx(`${B}go\\s+die${E}`),
];

// ─── Legal intimidation (same sentence: legal term + aimed at the customer)

const LEGAL_TERM = rx(
  `${B}(?:dava(?:ci\\p{L}*|ya|yi|lar\\p{L}*|si|sini|niz)?${E}|mahkeme\\p{L}*|savci\\p{L}*|suc\\s*duyuru\\p{L}*|tazminat\\p{L}*|avukat\\p{L}*|icra\\p{L}*|polis\\p{L}*|karakol\\p{L}*|jandarma\\p{L}*|hukuki\\s+(?:surec|islem|yol|hak)\\p{L}*|yasal\\s+(?:surec|islem|yol|hak)\\p{L}*|hukuk\\s+(?:birim|ekib|burosu)\\p{L}*|ihtarname\\p{L}*)`,
);
const AT_CUSTOMER = rx(
  `${B}(?:hakkiniz?da|hakkinda\\s+(?:siz|sen)|size\\s+karsi|sana\\s+karsi|sizi|seni|sizinle|seninle|aleyhinize|aleyhine|sizden|senden)${E}`,
);
const LEGAL_DIRECT: RegExp[] = [
  rx(`${B}(?:seni|sizi)\\s+(?:\\p{L}+\\s+)?sikayet\\s+ede(?:cegiz|cegim|riz|rim)${E}`),
  rx(`${B}(?:sue|suing)\\s+you`),
  rx(`${B}legal\\s+action\\s+against\\s+you`),
  rx(`${B}see\\s+you\\s+in\\s+court`),
  rx(`${B}(?:take|taking)\\s+you\\s+to\\s+court`),
  rx(`${B}our\\s+(?:lawyers?|attorneys?|legal\\s+team)\\s+will`),
  rx(`${B}report\\s+you\\s+to\\s+the\\s+police`),
  rx(`${B}file\\s+a\\s+(?:complaint|lawsuit|claim)\\s+against\\s+you`),
  rx(`${B}(?:legal\\s+(?:action|steps|measures|proceedings)|lawsuit|press(?:ing)?\\s+charges|charges)\\s+against\\s+you`),
  rx(`${B}(?:hear|hearing)\\s+from\\s+our\\s+(?:lawyers?|attorneys?|legal\\s+(?:team|department|counsel))`),
  rx(`${B}our\\s+(?:lawyers?|attorneys?|legal\\s+(?:team|department|counsel))\\s+(?:is|are|has\\s+been|have\\s+been)\\s+(?:informed|notified|contacted|involved)`),
  rx(`${B}cease\\s+and\\s+desist${E}`),
  rx(`${B}(?:size|sana)\\s+(?:\\p{L}+\\s+){0,2}?(?:ihtarname|dava\\p{L}*|tazminat\\p{L}*)`),
  rx(`${B}avukat\\p{L}*\\s+(?:\\p{L}+\\s+)?(?:size|sana)\\s+(?:ulas|donus|yazi|bildirim)\\p{L}*`),
  rx(`${B}(?:call(?:ing)?|report(?:ing)?)\\s+(?:the\\s+police\\s+on\\s+you|you\\s+to\\s+(?:the\\s+)?(?:police|authorities))`),
  rx(`${B}(?:sue|suing)\\s+(?:you|for\\s+defamation)`),
];
// "Your review is defamatory / libellous" — calling the customer's words a
// legal wrong is intimidation even without a direct threat.
// ("Hakaret" is left out: "personelimizin size hakaret içeren sözleri için
// özür dileriz" is an apology.)
const DEFAMATION_CLAIM = rx(`${B}(?:defamatory|defamation|libel(?:l?ous)?|slander(?:ous)?|iftira\\p{L}*)${E}`);
const CUSTOMER_WORDS = rx(
  `${B}(?:your\\s+(?:\\p{L}+\\s+)?(?:review|comment|post|claims?|statements?|accusations?|allegations?|words)|yorumunuz\\p{L}*|yorumun\\p{L}*|iddialariniz\\p{L}*|paylasiminiz\\p{L}*|ifadeleriniz\\p{L}*|yazdiklariniz\\p{L}*)${E}`,
);

// ─── Hate ───────────────────────────────────────────────────────────────

const GROUPS = '(?:suriyeli|arap|kurt|yahudi|ermeni|rum|cingene|multeci|yabanci|siyahi|escinsel|gay|lezbiyen|trans|afgan|afrikali|alevi|hristiyan|musluman|gocmen|ecnebi|pakistanli|iranli)';
const HATE: RegExp[] = [
  rx(`${B}zenci\\p{L}*`),
  rx(`${B}kiro(?:lar|su|lari|larin)?${E}`),
  // "Gavurdağı salatası" is a dish.
  rx(`${B}gavur(?!\\s*dag)\\p{L}*`),
  rx(`${B}comar\\p{L}*`),
  rx(`${B}nigg(?:er|a)\\p{L}*`),
  rx(`${B}faggots?${E}`),
  rx(`${B}fags?${E}`),
  rx(`${B}kikes?${E}`),
  rx(`${B}trann(?:y|ies)${E}`),
  rx(`${B}retard(?:ed|s)?${E}`),
  rx(`${B}ermeni\\s+dol\\p{L}*`),
  rx(`${B}pis\\s+${GROUPS}\\p{L}*`),
  rx(`${B}${GROUPS}\\p{L}*\\s+(?:defol|gitsin|istemiyoruz|giremez|alinmaz|almiyoruz|yasak)\\p{L}*`),
  rx(`${B}no\\s+(?:blacks|jews|muslims|arabs|gays|refugees|immigrants)\\s+allowed`),
  rx(`${B}(?:wetbacks?|towelheads?|ragheads?|gooks?|beaners?|sand\\s*niggers?|spics|pakis|kaffirs?|shemales?)${E}`),
  rx(`${B}kafir(?:ler|sin|siniz|lerin)?${E}`),
  rx(`${B}go\\s+back\\s+to\\s+(?:your\\s+(?:own\\s+)?country|where\\s+you\\s+came\\s+from)`),
  rx(`${B}(?:ulkene|ulkenize|memleketine|memleketinize)\\s+(?:geri\\s+)?(?:don(?:un|sun|esin)?|git(?:sin|in)?|defol\\p{L}*)${E}`),
  rx(`${B}(?:dirty|filthy)\\s+(?:arabs?|jews?|muslims?|immigrants?|refugees?|foreigners?|gypsies|gypsy)${E}`),
];

// ─── Review pressure ────────────────────────────────────────────────────

const REVIEW_OBJECT = /^(?:yorum|degerlendirme|puan|yildiz|sikayet|inceleme)/u;
const RATING_OBJECT = /^(?:puan|yildiz)/u;
const REMOVE_STEMS = ['sil', 'kaldir'];
const CHANGE_STEMS = ['degistir', 'guncelle', 'duzelt', 'yukselt', 'artir', 'revize', 'gecir'];
const GIVE_STEMS = ['ver', 'birak'];
// What follows the verb stem in a request / conditional aimed at the
// customer: "sil|in", "sil|menizi", "sil|erseniz", "sil|ebilir misiniz".
const ASK_SUFFIX = /(?:niz|nuz|^[iu]n$|^y[iu]n$|ebil|abil|rse|rsa|mesini|masini|menizi|manizi|^meni$|^mani$)/u;
// Past tense right after the stem ("ver|diğiniz", "sil|diniz", "yükselt|tiniz"):
// the customer already did it — a thank-you, not a request.
const PAST_SUFFIX = /^[dt][iu]/u;
const FILLER = new Set([
  'lutfen', 'rica', 'biz', 'bize', 'bizim', 'icin', 'de', 'da', 'mi', 'mu', 'ki', 'bir',
  'tekrar', 'yeniden', 'hemen', 'artik', 'sizin', 'senin', 've', 'ile', 'geri', 'olarak',
  '5', '4', 'bes', 'dort', 'tam', 'en', 'az', 'gozden',
]);

/** The part of `token` after a known verb stem, or null when no stem matches. */
function suffixAfter(token: string, stems: readonly string[]): string | null {
  for (const stem of stems) {
    if (token.startsWith(stem)) return token.slice(stem.length);
  }
  return null;
}

function isRequest(suffix: string | null): boolean {
  return suffix !== null && !PAST_SUFFIX.test(suffix) && ASK_SUFFIX.test(suffix);
}

function hasReviewPressureTokens(folded: string): boolean {
  const tokens = folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const obj = tokens[i];
    if (!REVIEW_OBJECT.test(obj)) continue;
    const isRating = RATING_OBJECT.test(obj);
    let seen = 0;
    for (let j = i + 1; j < tokens.length && seen < 3; j++) {
      const t = tokens[j];
      if (FILLER.has(t)) continue;
      seen++;
      if (isRequest(suffixAfter(t, REMOVE_STEMS)) || isRequest(suffixAfter(t, CHANGE_STEMS))) return true;
      // "geri çekmenizi" (withdraw); a bare "çek-" is too common ("çekinmeyin").
      if (tokens[j - 1] === 'geri' && isRequest(suffixAfter(t, ['cek']))) return true;
      if (isRating && isRequest(suffixAfter(t, GIVE_STEMS))) return true;
    }
  }
  return false;
}

const REVIEW_WORD = rx(`${B}(?:yorum|degerlendirme|puan|yildiz|review|rating|stars?)\\p{L}*`);
const INCENTIVE = rx(
  `${B}(?:indirim|hediye|ucretsiz|bedava|kupon|para\\s*iade|ikram|discount|free|gift|voucher|coupon|refund|cash\\s*back|cashback)\\p{L}*`,
);
// Explicit exchange: "karşılığında", "şartıyla", "in exchange"; or a
// conditional on writing / changing the review ("yorum yaparsanız %10 indirim").
const EXCHANGE = rx(
  `(?:karsilig|karsilik|sartiyla|kosuluyla|in\\s+exchange|in\\s+return|${B}(?:yazarsaniz|yaparsaniz|birakirsaniz|verirseniz|paylasirsaniz|guncellerseniz|degistirirseniz|silerseniz|kaldirirsaniz)${E}|${B}if\\s+you\\s+(?:leave|write|post|give|update|change|remove|delete|edit)${E})`,
);

const REVIEW_PRESSURE_EN: RegExp[] = [
  rx(`${B}(?:remove|delete|take\\s+down|withdraw|change|edit|update|revise|raise|increase|amend|reconsider|rethink|adjust|modify|retract|bump\\s+up)\\s+(?:your|the|this)\\s+(?:\\p{L}+\\s+)?(?:review|rating|comment|stars?|feedback)${E}`),
  rx(`${B}(?:give|leave)\\s+(?:us\\s+)?(?:a\\s+)?(?:5|five|4|four)[\\s-]*stars?`),
  rx(`${B}\\d\\s*yildiz\\s+(?:ver|birak)(?:in|irseniz|menizi|ir\\s+misiniz|ebilir)`),
];

function hasReviewPressure(folded: string): boolean {
  if (hasReviewPressureTokens(folded)) return true;
  if (anyMatch(REVIEW_PRESSURE_EN, folded)) return true;
  return sentences(folded).some((s) => REVIEW_WORD.test(s) && INCENTIVE.test(s) && EXCHANGE.test(s));
}

// ─── Personal / financial data ──────────────────────────────────────────

function isValidTckn(d: string): boolean {
  if (!/^[1-9]\d{10}$/.test(d)) return false;
  const n = d.split('').map(Number);
  const odd = n[0] + n[2] + n[4] + n[6] + n[8];
  const even = n[1] + n[3] + n[5] + n[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== n[9]) return false;
  const d11 = n.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === n[10];
}

function luhn(d: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let v = d.charCodeAt(i) - 48;
    if (dbl) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function isValidIban(compact: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const moved = compact.slice(4) + compact.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const code = ch.charCodeAt(0);
    const part = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const digit of part) rem = (rem * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

function hasPersonalData(raw: string): boolean {
  for (const m of raw.matchAll(/(?<!\d)[1-9]\d{10}(?!\d)/g)) {
    if (isValidTckn(m[0])) return true;
  }
  // Card numbers: continuous 13–19 digits, or grouped 4-4-4-x / 4-6-5. Phone
  // numbers ("0532 123 45 67") never take these shapes.
  for (const m of raw.matchAll(/(?<![\d-])(?:\d{13,19}|\d{4}(?:[ -]\d{4}){2}[ -]\d{1,7}|\d{4}[ -]\d{6}[ -]\d{4,5})(?![\d-])/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && !/^(\d)\1+$/.test(digits) && luhn(digits)) return true;
  }
  const upper = raw.toUpperCase();
  for (const m of upper.matchAll(/(?<![A-Z0-9])[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?(?![A-Z0-9])/g)) {
    if (isValidIban(m[0].replace(/ /g, ''))) return true;
  }
  return false;
}

// ─── Links ──────────────────────────────────────────────────────────────

/** Always allowed: the public menu / review / audit links Buaze itself serves. */
const ALWAYS_ALLOWED_HOSTS = ['buaze.com'];

// Second-level labels under a country code ("com.tr", "co.uk") — the
// registrable domain is then the last three labels.
const SECOND_LEVEL = new Set(['com', 'net', 'org', 'gen', 'co', 'gov', 'edu', 'bel', 'k12', 'web', 'av', 'biz', 'info', 'tv', 'pol', 'tsk', 'ac']);

/** "search.google.com" → "google.com", "www.lezzet.com.tr" → "lezzet.com.tr". */
export function registrableHost(host: string): string {
  const parts = host.toLowerCase().replace(/\.$/, '').split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (tld.length === 2 && SECOND_LEVEL.has(sld)) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

/** Saved URLs (website, platform links) → hosts allowed in replies. */
export function allowedHostsFromUrls(urls: ReadonlyArray<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    if (!u || typeof u !== 'string') continue;
    try {
      const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);
      if (parsed.hostname && parsed.hostname.includes('.')) out.add(registrableHost(parsed.hostname));
    } catch {
      // ignore malformed saved URLs
    }
  }
  return Array.from(out);
}

// Domain endings that look like links even without "http" / "www". Turkish
// words that are also TLDs ("biz", "de") are left out: "geldi.Biz" is a typo,
// not a link. A bare domain followed by a path ("bit.ly/x", "t.co/x") is a
// link whatever its ending.
const BARE_TLD =
  '(?:com|net|org|info|io|co|app|dev|site|online|shop|store|xyz|top|link|click|live|club|ly|gl|tk|ml|ga|cf|gq|ru|cn|su|ws|cc|tv|ai|gg|eu|uk|us|tr|page|ink|icu|vip|win|bid|loan|work|today|news|email|space|website|tech|lol|buzz)';

const URL_WITH_SCHEME = /\b(?:https?|ftp):\/\/[^\s<>"'()]+/giu;
const URL_WWW = /\bwww\.[^\s<>"'()]+/giu;
const URL_BARE_PATH = /(?<![\p{L}\p{N}@.])(?:[a-z0-9-]+\.)+[a-z]{2,24}\/[^\s<>"'()]*/giu;
const URL_BARE = new RegExp(
  `(?<![\\p{L}\\p{N}@.])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+${BARE_TLD}(?:\\.(?:tr|uk))?(?![\\p{L}\\p{N}-])`,
  'giu',
);
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;

function hostOf(candidate: string): string | null {
  let s = candidate.trim().replace(/[),.;:!?]+$/u, '');
  s = s.replace(/^(?:https?|ftp):\/\//i, '');
  // userinfo trick: "google.com@evil.com" — the real host is after "@".
  const slash = s.search(/[/?#]/);
  let authority = slash === -1 ? s : s.slice(0, slash);
  if (authority.includes('@')) return '@';
  authority = authority.replace(/:\d+$/, '').replace(/^www\./i, '').toLowerCase();
  return authority || null;
}

function isRiskyHost(host: string): boolean {
  return (
    host === '@' ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || // raw IP
    host.includes('xn--') // punycode look-alike domain
  );
}

function findLinkHosts(raw: string): string[] {
  // "lezzet[.]com", "lezzet(.)com", "lezzet dot com" → plain dots before scanning.
  let text = raw
    .replace(/[\u00AD\u180E\u200B-\u200F\u2060-\u2064\uFEFF]/g, '')
    .normalize('NFKC')
    .replace(/\s*[[(]\s*(?:\.|dot|nokta)\s*[\])]\s*/giu, '.')
    .replace(/\s+(?:dot|nokta)\s+(?=[a-z]{2,6}\b)/giu, '.');
  const hosts: string[] = [];
  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const h = hostOf(m[0]);
      if (h) hosts.push(h);
    }
    // Scanned links are blanked so later patterns don't re-read their parts.
    text = text.replace(re, ' ');
  };
  // Scheme links first: "https://google.com@evil.com" must not be mistaken
  // for an e-mail address.
  collect(URL_WITH_SCHEME);
  text = text.replace(EMAIL, ' ');
  collect(URL_WWW);
  collect(URL_BARE_PATH);
  collect(URL_BARE);
  return hosts;
}

function linkBlocked(raw: string, allowedHosts: readonly string[]): boolean {
  const hosts = findLinkHosts(raw);
  if (hosts.length === 0) return false;
  const allowed = [...ALWAYS_ALLOWED_HOSTS, ...allowedHosts].map((h) => h.toLowerCase().replace(/^www\./, ''));
  return hosts.some((host) => {
    if (isRiskyHost(host)) return true;
    return !allowed.some((a) => host === a || host.endsWith(`.${a}`));
  });
}

function hasAnyLink(raw: string): boolean {
  return findLinkHosts(raw).length > 0;
}

// ─── Markup ─────────────────────────────────────────────────────────────

const MARKUP: RegExp[] = [
  /<\s*\/?\s*(?:script|iframe|object|embed|style|link|meta|img|svg|a|form|input|button|body|html|base|frame)\b/iu,
  /\b(?:javascript|vbscript|livescript)\s*:/iu,
  /\bdata\s*:\s*(?:text\/html|image\/svg|application)/iu,
  /\bon(?:error|load|click|mouseover|focus|submit|change)\s*=/iu,
];

// ─── Entry point ────────────────────────────────────────────────────────

/**
 * Checks a reply body. `blocked` is true when any blocking issue was found;
 * callers MUST NOT store or send a blocked reply.
 */
export function checkReplyRisk(text: string, opts: ReplyRiskOptions = {}): ReplyRiskResult {
  const raw = typeof text === 'string' ? text : '';
  if (!raw.trim()) return { blocked: false, issues: [], warnings: [] };

  const found = new Set<ReplyRiskKind>();
  const warnings: ReplyRiskKind[] = [];
  const folded = foldText(raw);

  if (hasUnusualCharacters(raw)) found.add('unusual_characters');
  if (containsProfanity(raw) || MASKED_SWEAR.test(raw)) found.add('profanity');
  if (anyMatch(INSULT, folded)) found.add('insult');
  if (anyMatch(THREAT, folded)) found.add('threat');
  if (
    anyMatch(LEGAL_DIRECT, folded) ||
    sentences(folded).some(
      (s) => (LEGAL_TERM.test(s) && AT_CUSTOMER.test(s)) || (DEFAMATION_CLAIM.test(s) && CUSTOMER_WORDS.test(s)),
    )
  ) {
    found.add('legal_intimidation');
  }
  if (anyMatch(HATE, folded)) found.add('hate');
  if (hasReviewPressure(folded)) found.add('review_pressure');
  if (hasPersonalData(raw)) found.add('personal_data');
  if (anyMatch(MARKUP, raw)) found.add('markup');

  if (opts.linksAsWarning) {
    if (hasAnyLink(raw)) warnings.push('link');
  } else if (linkBlocked(raw, opts.allowedHosts ?? [])) {
    found.add('link');
  }

  const issues = REPLY_RISK_ORDER.filter((k) => found.has(k));
  return { blocked: issues.length > 0, issues, warnings };
}

// ─── Owner-facing copy ──────────────────────────────────────────────────

const COPY: Record<ReplyRiskKind, { tr: string; en: string }> = {
  threat: {
    tr: 'Tehdit içeren bir ifade var.',
    en: 'It contains a threat.',
  },
  hate: {
    tr: 'Irk, din, köken veya kimliğe yönelik ayrımcı bir ifade var.',
    en: 'It contains a slur or discriminatory statement.',
  },
  profanity: {
    tr: 'Küfür, müstehcen ifade ya da yıldızla gizlenmiş küfür var.',
    en: 'It contains profanity (including masked swear words).',
  },
  insult: {
    tr: 'Müşteriyi aşağılayan ya da hakaret sayılabilecek bir ifade var.',
    en: 'It contains name-calling or an insult aimed at the customer.',
  },
  legal_intimidation: {
    tr: 'Müşteriyi dava, şikayet, polis veya yasal işlemle korkutan bir ifade var.',
    en: 'It threatens the customer with a lawsuit, the police or legal action.',
  },
  review_pressure: {
    tr: 'Yorumun silinmesini ya da puanın değiştirilmesini istemek veya karşılığında bir şey teklif etmek yasak.',
    en: 'Asking for a review to be removed or a rating to be changed, or offering something in return, is not allowed.',
  },
  personal_data: {
    tr: 'Kimlik numarası, kart numarası veya IBAN gibi kişisel ya da finansal bir veri var.',
    en: 'It contains personal or financial data (ID number, card number or IBAN).',
  },
  markup: {
    tr: 'Kod veya HTML etiketi var.',
    en: 'It contains code or HTML tags.',
  },
  link: {
    tr: 'Yalnız işletmenin kayıtlı web sitesi ve platform bağlantıları paylaşılabilir; kısaltılmış, gizlenmiş veya bilinmeyen linkler gönderilemez.',
    en: "Only the business's saved website and platform links can be shared; shortened, disguised or unknown links can't be sent.",
  },
  unusual_characters: {
    tr: 'Görünmeyen, yön değiştiren ya da başka alfabeden benzer harfler var. Metni klavyeyle yeniden yazın.',
    en: 'It contains invisible or direction-changing characters, or look-alike letters from another alphabet. Retype the text.',
  },
};

/** One sentence per issue, in the given language. */
export function replyRiskMessages(kinds: readonly ReplyRiskKind[], locale: 'tr' | 'en'): string[] {
  return kinds.map((k) => COPY[k]?.[locale]).filter((s): s is string => Boolean(s));
}

/** Link warning shown in the composer preview (links are checked on send). */
export function replyLinkWarning(locale: 'tr' | 'en'): string {
  return locale === 'tr'
    ? 'Metinde link var. Yalnız işletmenizin kayıtlı web sitesi ve platform bağlantıları gönderilebilir; diğerleri gönderimde engellenir.'
    : "The text contains a link. Only your saved website and platform links can be sent; others are blocked on send.";
}

export function isReplyRiskKind(value: unknown): value is ReplyRiskKind {
  return typeof value === 'string' && (REPLY_RISK_ORDER as readonly string[]).includes(value);
}
