import Link from 'next/link';

/**
 * Pulse AI section ("Ritim" `.rt-ai-*`): gradient 64 px title, a chat mock
 * with a 2 px gradient frame on the left (an "Örnek ekran" — sample screen,
 * no real customer), heading + lead + four numbered steps on the right.
 * Copy follows §15: drafts only, nothing is sent until the owner approves.
 */
const COPY = {
  tr: {
    title: 'Pulse AI yanıt taslağını hazırlar; siz okur, düzenler ve onaylarsınız.',
    tabs: ['Gelen kutusu', 'Google yorumları', 'Analitik'],
    bar: 'Yanıt taslağı',
    bubble: 'Yemekler güzeldi ama siparişimiz 40 dakika gecikti.',
    thinking: 'Taslak hazırlanıyor…',
    log: ['• Yorumun dili: Türkçe', '• Ton: özür dileyen', '• Uzunluk: 2–4 cümle'],
    answerTitle: 'Taslak',
    answer:
      'Geri bildiriminiz için teşekkür ederiz. Siparişinizin gecikmesi için özür dileriz; mutfak akışını bu akşam ekibimizle gözden geçireceğiz.',
    answerBtn: 'Düzenle ve gönder',
    sample: 'Örnek ekran',
    h3: 'Taslak hazır. Karar sizin.',
    lead: 'Pulse AI her geri bildirim için sıcak, resmi veya özür dileyen tonda, Türkçe ya da İngilizce 2–4 cümlelik bir taslak hazırlar. Hiçbir yanıt siz onaylamadan gönderilmez.',
    steps: ['Geri bildirim gelir.', 'Pulse AI taslak hazırlar.', 'Siz düzenler, onaylarsınız.', 'Yanıt e-postayla gider ya da panelde kalır.'],
    cta: "Pulse AI'ı inceleyin",
  },
  en: {
    title: 'Pulse AI drafts the reply; you read it, edit it and approve it.',
    tabs: ['Inbox', 'Google reviews', 'Analytics'],
    bar: 'Reply draft',
    bubble: 'The food was great, but our order was 40 minutes late.',
    thinking: 'Drafting…',
    log: ['• Language: English', '• Tone: apologetic', '• Length: 2–4 sentences'],
    answerTitle: 'Draft',
    answer:
      "Thank you for your feedback. We're sorry your order was late; we'll go over the kitchen flow with the team tonight.",
    answerBtn: 'Edit and send',
    sample: 'Sample screen',
    h3: 'The draft is ready. The call is yours.',
    lead: 'Pulse AI drafts a 2–4 sentence reply to each piece of feedback, in a warm, formal or apologetic tone, in Turkish or English. Nothing is sent until you approve it.',
    steps: ['Feedback comes in.', 'Pulse AI drafts a reply.', 'You edit and approve it.', 'The reply goes out by e-mail or stays in the panel.'],
    cta: 'Explore Pulse AI',
  },
} as const;

export default function HomePulseAi({ locale }: { locale: 'tr' | 'en' }) {
  const c = COPY[locale];
  return (
    <section className="rt-section rt-reveal" aria-labelledby="pulse-ai-title">
      <div className="rt-container">
        <h2 id="pulse-ai-title" className="rt-ai-title">
          {c.title}
        </h2>
        <div className="rt-ai-grid">
          <figure>
            <div className="rt-ai-chat" aria-hidden="true">
              <div className="rt-ai-chat__inner">
                <div className="rt-ai-chat__tabs">
                  {c.tabs.map((t, i) => (
                    <span key={t} className={i === 0 ? 'rt-is-on' : undefined}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="rt-ai-chat__bar">
                  <span>{c.bar} ▾</span>
                  <span>⤢</span>
                </div>
                <div className="rt-ai-chat__body">
                  <div className="rt-ai-bubble">{c.bubble}</div>
                  <div className="rt-ai-thinking">
                    <i />
                    {c.thinking}
                  </div>
                  <div className="rt-ai-steps-log">
                    {c.log.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </div>
                  <div className="rt-ai-answer">
                    <p>
                      <strong>{c.answerTitle}:</strong> {c.answer}
                    </p>
                    <span className="rt-btn rt-btn--solid rt-btn--sm">{c.answerBtn}</span>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="rt-note" style={{ marginTop: 12 }}>
              {c.sample}
            </figcaption>
          </figure>
          <div>
            <h3 className="rt-t-h2">{c.h3}</h3>
            <p className="rt-t-lead" style={{ marginTop: 16 }}>
              {c.lead}
            </p>
            <ol className="rt-steps">
              {c.steps.map((s, i) => (
                <li key={s} className={`rt-step${i === 0 ? ' rt-is-done' : ''}`}>
                  <span className="rt-step__num">{i === 0 ? '✓' : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link className="rt-btn rt-btn--primary" href={`/${locale}/features/pulse-ai`}>
              {c.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
