// Surveys Phase 1 — ready-made survey templates (spec 3.8).
//
// Pure data, no database and no schema: a template only produces the same
// `QuestionDraft[]` + title + thank-you text the editor would hold after the
// owner typed them, and the POST body is the ordinary `CreateBody`.
//
// Rules the content follows (tests/survey-templates.test.ts enforces them):
//   - star and recommend-score questions are phrased "how would you rate …?",
//     never as yes/no questions (a yes/no wording does not fit a 1–5 answer);
//   - no health data is asked for — the clinic template even puts the warning
//     inside its open text question, because the form has no separate hint;
//   - no review-routing, "filter", guarantee or invented-number wording
//     (CLAUDE.md §19.1.1 / §35.8);
//   - Turkish and English are kept 1:1 (same questions, types, order,
//     required flags and option counts).
//
// Sector mapping uses `detectSector(category)` from sector-platforms.ts:
// food / hospitality / clinic / spa / retail each have one template of their
// own; delivery, legal, fitness, education and other get the three universal
// ones only.

import type { SectorKey } from '@/lib/sector-platforms';
import type { SurveyQuestionType } from '@/lib/surveys';

export type SurveyTemplateLocale = 'tr' | 'en';

interface Localized<T> {
  tr: T;
  en: T;
}

/** Lucide component names; the picker maps them to icons. */
export type SurveyTemplateIcon =
  | 'Smile'
  | 'Gauge'
  | 'Star'
  | 'UtensilsCrossed'
  | 'BedDouble'
  | 'Stethoscope'
  | 'Sparkles'
  | 'Store';

export type SurveyTemplateId =
  | 'satisfaction-plus'
  | 'nps-one'
  | 'quick-stars'
  | 'table-service'
  | 'post-stay'
  | 'post-visit'
  | 'post-service'
  | 'in-store';

/** `all` = universal (offered for every sector). */
export type SurveyTemplateSector = 'all' | Extract<SectorKey, 'food' | 'hospitality' | 'clinic' | 'spa' | 'retail'>;

export interface SurveyTemplateQuestion {
  type: SurveyQuestionType;
  text: Localized<string>;
  required: boolean;
  /** multiple_choice only: 2–6 options per locale. */
  options?: Localized<string[]>;
}

export interface SurveyTemplate {
  id: SurveyTemplateId;
  sector: SurveyTemplateSector;
  icon: SurveyTemplateIcon;
  /** Card title. */
  title: Localized<string>;
  /** One line under the card title. */
  description: Localized<string>;
  /** Pre-filled survey title (editable; also the title field's placeholder). */
  defaultTitle: Localized<string>;
  questions: SurveyTemplateQuestion[];
}

/**
 * One question as the editor holds it while the owner works. Edit mode adds the
 * stored id, answer count and used options on top of this shape (the editor
 * extends it); templates only ever produce these five fields.
 */
export interface QuestionDraft {
  /** Client-only React key. Never sent to the server. */
  localId: string;
  text: string;
  type: SurveyQuestionType;
  /** multiple_choice rows; empty for every other type. */
  options: string[];
  required: boolean;
}

/** Thank-you text every template starts with (also the editor's placeholder). */
export const SURVEY_TEMPLATE_THANK_YOU: Localized<string> = {
  tr: 'Görüşlerin bizim için çok değerli, teşekkürler!',
  en: 'Your feedback means a lot to us — thank you!',
};

function star(tr: string, en: string, required = true): SurveyTemplateQuestion {
  return { type: 'rating', text: { tr, en }, required };
}

function recommend(tr: string, en: string, required = true): SurveyTemplateQuestion {
  return { type: 'nps', text: { tr, en }, required };
}

function choice(
  tr: string,
  en: string,
  options: Localized<string[]>,
  required = true,
): SurveyTemplateQuestion {
  return { type: 'multiple_choice', text: { tr, en }, required, options };
}

function note(tr: string, en: string, required = false): SurveyTemplateQuestion {
  return { type: 'long_text', text: { tr, en }, required };
}

export const SURVEY_TEMPLATES: readonly SurveyTemplate[] = [
  // ── Universal ─────────────────────────────────────────────────────────────
  {
    id: 'satisfaction-plus',
    sector: 'all',
    icon: 'Smile',
    title: { tr: 'Memnuniyet + görüş', en: 'Satisfaction + comments' },
    description: {
      tr: 'Genel puan, öne çıkan konu ve serbest görüş.',
      en: 'Overall rating, what mattered most and a free comment.',
    },
    defaultTitle: { tr: 'Müşteri memnuniyet anketi', en: 'Customer satisfaction survey' },
    questions: [
      star(
        'Genel memnuniyetinizi nasıl değerlendirirsiniz?',
        'How would you rate your overall satisfaction?',
      ),
      choice('Sizin için en önemli olan neydi?', 'What mattered most to you?', {
        tr: ['Kalite', 'Hizmet', 'Hız', 'Fiyat', 'Ortam'],
        en: ['Quality', 'Service', 'Speed', 'Price', 'Atmosphere'],
      }),
      note('Eklemek istediğiniz bir şey var mı?', "Anything you'd like to add?"),
    ],
  },
  {
    id: 'nps-one',
    sector: 'all',
    icon: 'Gauge',
    title: { tr: 'Tavsiye skoru', en: 'Recommend score' },
    description: {
      tr: 'Tek soruyla müşterinin seni tavsiye etme isteğini öğren.',
      en: 'One question to learn how willing customers are to recommend you.',
    },
    defaultTitle: { tr: 'Bizi tavsiye eder misiniz?', en: 'Would you recommend us?' },
    questions: [
      recommend(
        'Bizi bir arkadaşınıza veya yakınınıza tavsiye etme ihtimaliniz nedir?',
        'How likely are you to recommend us to a friend or family member?',
      ),
    ],
  },
  {
    id: 'quick-stars',
    sector: 'all',
    icon: 'Star',
    title: { tr: 'Hızlı memnuniyet', en: 'Quick satisfaction' },
    description: {
      tr: 'Tek soruluk yıldız puanı; en hızlı yanıtlanan anket.',
      en: 'A single star rating — the quickest survey to answer.',
    },
    defaultTitle: { tr: 'Deneyiminizi puanlayın', en: 'Rate your experience' },
    questions: [
      star(
        'Bugünkü deneyiminizi nasıl değerlendirirsiniz?',
        'How would you rate your experience today?',
      ),
    ],
  },

  // ── Sector specific ───────────────────────────────────────────────────────
  {
    id: 'table-service',
    sector: 'food',
    icon: 'UtensilsCrossed',
    title: { tr: 'Masa servisi sonrası', en: 'After table service' },
    description: {
      tr: 'Yemek, servis, bekleme süresi ve serbest not.',
      en: 'Food, service, waiting time and a free note.',
    },
    defaultTitle: { tr: 'Bugünkü ziyaretiniz nasıldı?', en: 'How was your visit today?' },
    questions: [
      star(
        'Yemeklerin lezzetini nasıl değerlendirirsiniz?',
        'How would you rate the taste of the food?',
      ),
      star(
        'Servisi ve ekibin ilgisini nasıl değerlendirirsiniz?',
        "How would you rate our service and the team's attentiveness?",
      ),
      choice('Siparişiniz ne kadar sürede geldi?', 'How quickly did your order arrive?', {
        tr: ['Çok hızlı', 'Makul', 'Biraz uzun', 'Çok uzun'],
        en: ['Very fast', 'Reasonable', 'A bit long', 'Too long'],
      }),
      note(
        'Mutfağa veya ekibe iletmek istediğiniz bir not var mı?',
        'Any note for the kitchen or our team?',
      ),
    ],
  },
  {
    id: 'post-stay',
    sector: 'hospitality',
    icon: 'BedDouble',
    title: { tr: 'Konaklama sonrası', en: 'After the stay' },
    description: {
      tr: 'Oda temizliği, personel ilgisi ve tavsiye isteği.',
      en: 'Room cleanliness, staff care and willingness to recommend.',
    },
    defaultTitle: { tr: 'Konaklamanız nasıldı?', en: 'How was your stay?' },
    questions: [
      star(
        'Odanızın temizliğini nasıl değerlendirirsiniz?',
        'How would you rate the cleanliness of your room?',
      ),
      star(
        'Resepsiyon ve personelin ilgisini nasıl değerlendirirsiniz?',
        'How would you rate the care shown by reception and staff?',
      ),
      recommend(
        'Bizi arkadaşlarınıza tavsiye etme ihtimaliniz nedir?',
        'How likely are you to recommend us to friends?',
      ),
      note(
        'Bir sonraki konaklamanızı daha iyi yapmak için neyi değiştirelim?',
        'What should we change to make your next stay better?',
      ),
    ],
  },
  {
    id: 'post-visit',
    sector: 'clinic',
    icon: 'Stethoscope',
    title: { tr: 'Randevu sonrası', en: 'After the appointment' },
    description: {
      tr: 'Randevu ve ekip deneyimi. Sağlık bilgisi sormaz.',
      en: 'Appointment and team experience. Asks for no health data.',
    },
    defaultTitle: { tr: 'Ziyaretinizi değerlendirin', en: 'Rate your visit' },
    questions: [
      star(
        'Randevu ve bekleme sürecini nasıl değerlendirirsiniz?',
        'How would you rate the appointment and waiting process?',
      ),
      star(
        'Ekibin ilgisini ve iletişimini nasıl değerlendirirsiniz?',
        "How would you rate the team's care and communication?",
      ),
      recommend(
        'Bizi yakınlarınıza tavsiye etme ihtimaliniz nedir?',
        'How likely are you to recommend us to your relatives?',
      ),
      // The warning lives inside the question: the form has no separate hint
      // field, and free text is where health details (special-category data
      // under KVKK) could be typed.
      note(
        'Hizmetimizi geliştirmek için önerileriniz nelerdir? (Lütfen sağlık bilgilerinizi yazmayın.)',
        "What suggestions do you have to improve our service? (Please don't include health details.)",
      ),
    ],
  },
  {
    id: 'post-service',
    sector: 'spa',
    icon: 'Sparkles',
    title: { tr: 'Hizmet sonrası', en: 'After the service' },
    description: {
      tr: 'Hizmet kalitesi, uzmanın ilgisi ve tekrar tercih.',
      en: 'Service quality, specialist care and likelihood to return.',
    },
    defaultTitle: { tr: 'Hizmetimizi değerlendirin', en: 'Rate our service' },
    questions: [
      star(
        'Hizmetin kalitesini nasıl değerlendirirsiniz?',
        'How would you rate the quality of the service?',
      ),
      star(
        'Uzmanımızın ilgisini nasıl değerlendirirsiniz?',
        "How would you rate our specialist's care?",
      ),
      choice('Bizi tekrar tercih eder misiniz?', 'Would you choose us again?', {
        tr: ['Kesinlikle', 'Büyük ihtimalle', 'Emin değilim', 'Hayır'],
        en: ['Definitely', 'Probably', 'Not sure', 'No'],
      }),
      note('Eklemek istediğiniz bir şey var mı?', "Anything you'd like to add?"),
    ],
  },
  {
    id: 'in-store',
    sector: 'retail',
    icon: 'Store',
    title: { tr: 'Mağaza deneyimi', en: 'Store experience' },
    description: {
      tr: 'Mağaza deneyimi, ürün bulma kolaylığı ve personel ilgisi.',
      en: 'Store experience, how easily things were found and staff care.',
    },
    defaultTitle: { tr: 'Mağazamızdaki deneyiminiz', en: 'Your experience in our store' },
    questions: [
      star(
        'Mağazamızı genel olarak nasıl değerlendirirsiniz?',
        'How would you rate our store overall?',
      ),
      choice(
        'Aradığınızı kolayca buldunuz mu?',
        'Did you find what you were looking for easily?',
        {
          tr: ['Evet', 'Kısmen', 'Hayır'],
          en: ['Yes', 'Partly', 'No'],
        },
      ),
      star(
        'Personelin ilgisini nasıl değerlendirirsiniz?',
        "How would you rate the staff's care?",
      ),
      note(
        'Bulamadığınız bir ürün veya önerileriniz var mı?',
        "Any product you couldn't find, or suggestions?",
      ),
    ],
  },
];

export function getSurveyTemplate(id: string | null | undefined): SurveyTemplate | undefined {
  return SURVEY_TEMPLATES.find((t) => t.id === id);
}

/**
 * "Recommended for you": the sector's own template first (when it has one),
 * then the universal ones. Always at least the three universal templates.
 */
export function templatesForSector(sector: SectorKey): SurveyTemplate[] {
  const own = SURVEY_TEMPLATES.filter((t) => t.sector === sector);
  const universal = SURVEY_TEMPLATES.filter((t) => t.sector === 'all');
  return [...own, ...universal];
}

/** "More templates": everything that is not recommended for this sector. */
export function otherTemplatesForSector(sector: SectorKey): SurveyTemplate[] {
  const recommended = new Set(templatesForSector(sector).map((t) => t.id));
  return SURVEY_TEMPLATES.filter((t) => !recommended.has(t.id));
}

let localIdCounter = 0;

/**
 * Unique client-side key. Prefers the platform UUID; `crypto.randomUUID` does
 * not exist on insecure origins (plain http on a LAN address), so a counter +
 * random fallback keeps the editor working there.
 */
export function newLocalId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return `q_${c.randomUUID()}`;
  localIdCounter += 1;
  return `q_${Date.now().toString(36)}_${localIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** The single empty question "Start from blank" opens with (a star rating). */
export function blankQuestionDraft(
  type: SurveyQuestionType = 'rating',
  makeId: () => string = newLocalId,
): QuestionDraft {
  return {
    localId: makeId(),
    text: '',
    type,
    options: type === 'multiple_choice' ? ['', ''] : [],
    required: true,
  };
}

export interface InstantiatedSurveyTemplate {
  templateId: SurveyTemplateId;
  title: string;
  /** Owners write their own; templates never invent one. */
  description: string;
  thankYouMessage: string;
  questions: QuestionDraft[];
}

/**
 * Turn a template into editor state. Every call mints new `localId`s. When the
 * drafts are built during server rendering and the same ids must reach the
 * browser, build them on the server and pass them down as props, or pass a
 * deterministic `makeId` (a plain counter) so server and client agree.
 */
export function instantiateTemplate(
  template: SurveyTemplate,
  locale: SurveyTemplateLocale,
  makeId: () => string = newLocalId,
): InstantiatedSurveyTemplate {
  return {
    templateId: template.id,
    title: template.defaultTitle[locale],
    description: '',
    thankYouMessage: SURVEY_TEMPLATE_THANK_YOU[locale],
    questions: template.questions.map((q) => ({
      localId: makeId(),
      text: q.text[locale],
      type: q.type,
      options: q.options ? [...q.options[locale]] : [],
      required: q.required,
    })),
  };
}
