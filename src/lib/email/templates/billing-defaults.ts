// Inline TR/EN defaults of the billing mails (billing spec §13.4, CLAUDE.md
// §21.26). The render functions and the admin editor share these objects
// (MAIL_INLINE_DEFAULTS re-exports them, no copy). `${name}` placeholders are
// whitelisted in placeholders.ts. Company names are never written here
// (CLAUDE.md §47): the brand is "Buaze", the payment institution PayNKolay.

export const BILLING_RENEWAL_UPCOMING_TR = {
  headerEyebrow: 'Plan ve faturalama · Hatırlatma',
  eyebrow7: 'Yenileme · ${date}',
  eyebrow1: 'Yenileme · Yarın',
  title7: 'Planınız ${date} tarihinde sona eriyor.',
  title1: 'Planınız yarın sona eriyor.',
  intro: '${planName} paketiniz ${date} tarihine kadar açık. Kesintisiz devam etmek için dönem bitmeden yenileyin.',
  introGrace: 'Erişiminiz ${grace} tarihine kadar sürer; dilerseniz şimdi yenileyin.',
  howTo: "Ödeme PayNKolay'ın güvenli sayfasında 3D Secure ile alınır. Kartınızdan otomatik çekim yapılmaz; yenilemeyi siz onaylarsınız.",
  labelPlan: 'Paket',
  labelAmount: 'Tutar',
  labelPeriodEnd: 'Dönem sonu',
  labelCard: 'Kayıtlı kart',
  perMonth: 'aylık, KDV dahil',
  perYear: 'yıllık, KDV dahil',
  cta: 'Aboneliği yenile',
  footnote: 'Yenilemezseniz panel erişiminiz dönem sonunda durur; verileriniz silinmez.',
};

export const BILLING_RENEWAL_UPCOMING_EN = {
  headerEyebrow: 'Plan & billing · Reminder',
  eyebrow7: 'Renewal · ${date}',
  eyebrow1: 'Renewal · Tomorrow',
  title7: 'Your plan ends on ${date}.',
  title1: 'Your plan ends tomorrow.',
  intro: 'Your ${planName} plan is active until ${date}. Renew before the period ends to keep going without a gap.',
  introGrace: 'You keep access until ${grace}; renew now if you like.',
  howTo: "Payment is taken on PayNKolay's secure page with 3D Secure. Your card is never charged automatically; you confirm the renewal.",
  labelPlan: 'Plan',
  labelAmount: 'Amount',
  labelPeriodEnd: 'Period end',
  labelCard: 'Saved card',
  perMonth: 'monthly, VAT included',
  perYear: 'yearly, VAT included',
  cta: 'Renew subscription',
  footnote: "If you don't renew, dashboard access stops at the end of the period; your data is not deleted.",
};

export const BILLING_PERIOD_ENDED_TR = {
  headerEyebrow: 'Plan ve faturalama',
  eyebrow: 'Dönem sona erdi',
  title: 'Planınızın süresi doldu.',
  intro: '${planName} döneminiz sona erdi ve panel erişiminiz durdu. Verileriniz yerinde duruyor; bir paket seçip ödediğinizde kaldığınız yerden devam edersiniz.',
  cta: 'Paketleri gör',
  footnote: "Ödeme PayNKolay'ın güvenli sayfasında 3D Secure ile alınır.",
};

export const BILLING_PERIOD_ENDED_EN = {
  headerEyebrow: 'Plan & billing',
  eyebrow: 'Period ended',
  title: 'Your plan has ended.',
  intro: 'Your ${planName} period has ended and dashboard access has stopped. Your data is still here; pick a plan and pay to continue where you left off.',
  cta: 'See plans',
  footnote: "Payment is taken on PayNKolay's secure page with 3D Secure.",
};

export const BILLING_CARD_RETENTION_TR = {
  headerEyebrow: 'Plan ve faturalama · Kayıtlı kart',
  eyebrow: 'Kart silinecek · ${date}',
  title: 'Kayıtlı kartınız ${date} tarihinde silinecek.',
  intro: "Aboneliğiniz sona erdiği için PayNKolay'da saklanan ${card} ${date} tarihinde silinecek. Bir şey yapmanız gerekmiyor.",
  outro: 'Kartı daha önce silmek isterseniz aşağıdaki sayfadan kaldırabilirsiniz. Aboneliğinizi yeniden başlatırsanız kartınızı bir sonraki ödemede tekrar kaydedebilirsiniz.',
  cta: 'Kayıtlı kartı yönet',
};

export const BILLING_CARD_RETENTION_EN = {
  headerEyebrow: 'Plan & billing · Saved card',
  eyebrow: 'Card deletion · ${date}',
  title: 'Your saved card will be deleted on ${date}.',
  intro: 'Your subscription has ended, so ${card} stored by PayNKolay will be deleted on ${date}. You don\'t need to do anything.',
  outro: 'To remove the card sooner, use the page below. If you restart your subscription, you can save your card again at your next payment.',
  cta: 'Manage saved card',
};
