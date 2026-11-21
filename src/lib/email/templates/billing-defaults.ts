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
  // auto_notice: the pre-charge notice of an auto renewal (§9.2 phase 3). Its delivery gates the charge (D5).
  eyebrowAuto: 'Otomatik yenileme · ${date}',
  titleAuto: 'Aboneliğiniz ${date} tarihinde otomatik yenilenecek.',
  introAuto: '${planName} paketiniz için ${date} tarihinde ${card} ${amount} çekilecek. Bir şey yapmanız gerekmiyor.',
  retryOne: 'Çekim başarısız olursa ${retry1} tarihinde yeniden denenir.',
  retryTwo: 'Çekim başarısız olursa ${retry1} ve ${retry2} tarihlerinde yeniden denenir; erişiminiz bu süre boyunca devam eder.',
  labelChargeDate: 'Çekim tarihi',
  labelRetries: 'Yeniden deneme',
  offBeforeAuto: 'Otomatik yenilemeyi çekim tarihinden önce kapatırsanız bu çekim yapılmaz ve planınız ödediğiniz dönemin sonuna kadar açık kalır.',
  ctaAuto: 'Plan ve faturalama',
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
  eyebrowAuto: 'Auto-renew · ${date}',
  titleAuto: 'Your subscription renews automatically on ${date}.',
  introAuto: 'For your ${planName} plan, ${amount} will be charged to ${card} on ${date}. You don\'t need to do anything.',
  retryOne: 'If the charge fails, it is retried on ${retry1}.',
  retryTwo: 'If the charge fails, it is retried on ${retry1} and ${retry2}; your access continues meanwhile.',
  labelChargeDate: 'Charge date',
  labelRetries: 'Retries',
  offBeforeAuto: 'If you turn auto-renew off before the charge date, nothing is charged and your plan stays active until the end of the period you paid for.',
  ctaAuto: 'Plan & billing',
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

// Shared closing lines of every auto-mode mail (§13.4): the panel path and, where the
// mail carries it, the off-only link (§8.8). Not admin-editable: they describe how the
// owner leaves the instruction and must always be present.
export const BILLING_AUTO_FOOTER = {
  tr: {
    manage: 'Otomatik yenilemeyi kapatmak için: Hesabım → Plan ve faturalama',
    offLead: 'Bu talimatı siz vermediyseniz ya da artık istemiyorsanız tek tıkla kapatın:',
    offLabel: 'Otomatik yenilemeyi kapat',
  },
  en: {
    manage: 'To turn auto-renew off: Account → Plan & billing',
    offLead: "If you didn't give this instruction or no longer want it, turn it off with one click:",
    offLabel: 'Turn off auto-renew',
  },
} as const;

export const BILLING_RENEWAL_PAID_TR = {
  headerEyebrow: 'Plan ve faturalama · Ödeme',
  eyebrowPaid: 'Ödeme alındı',
  titlePaid: 'Ödemeniz alındı.',
  introPaid: '${planName} paketiniz otomatik olarak yenilendi. Yeni döneminiz ${date} tarihine kadar açık.',
  introPaidNoDate: '${planName} paketiniz otomatik olarak yenilendi.',
  eyebrowRefund: 'İade edilecek',
  titleRefund: 'Bu çekim iade edilecek.',
  introRefund:
    "Otomatik yenileme kapatıldığı, kartınız kaldırıldığı ya da hesap silme talebinde bulunduğunuz sırada işlenmekte olan ${amount} tutarındaki çekim gerçekleşti. Döneminize ekleme yapılmadı; tutar İade ve İptal Politikası'ndaki süre içinde kartınıza iade edilecek.",
  labelPlan: 'Paket',
  labelAmount: 'Tutar',
  labelCard: 'Kart',
  labelPeriodEnd: 'Yeni dönem sonu',
  cta: 'Faturaları gör',
  footnoteRefund: 'İade kartınıza yansımazsa support@buaze.com adresine yazın; hemen kontrol ederiz.',
};

export const BILLING_RENEWAL_PAID_EN = {
  headerEyebrow: 'Plan & billing · Payment',
  eyebrowPaid: 'Payment received',
  titlePaid: 'Payment received.',
  introPaid: 'Your ${planName} plan renewed automatically. Your new period runs until ${date}.',
  introPaidNoDate: 'Your ${planName} plan renewed automatically.',
  eyebrowRefund: 'To be refunded',
  titleRefund: 'This charge will be refunded.',
  introRefund:
    'A charge of ${amount} that was already being processed when auto-renew was turned off, your card was removed or you asked to delete your account went through. No period was added; the amount will be refunded to your card within the period set by the Refund and Cancellation Policy.',
  labelPlan: 'Plan',
  labelAmount: 'Amount',
  labelCard: 'Card',
  labelPeriodEnd: 'New period end',
  cta: 'See invoices',
  footnoteRefund: "If the refund doesn't reach your card, write to support@buaze.com and we'll check right away.",
};

export const BILLING_RENEWAL_FAILED_TR = {
  headerEyebrow: 'Plan ve faturalama · Ödeme',
  eyebrowAttempt: 'Ödeme alınamadı',
  titleAttempt: 'Ödemeniz alınamadı.',
  introAttempt: '${planName} paketiniz için ${amount} kayıtlı kartınızdan çekilemedi. ${date} tarihinde tekrar deneyeceğiz. Erişiminiz ${grace} tarihine kadar sürer.',
  hintAttempt: 'Kartınızın limitini ve bankanızın bir engel koyup koymadığını kontrol edin; beklemek istemezseniz şimdi ödeyebilirsiniz.',
  eyebrowFinal: 'Son deneme başarısız',
  titleFinal: 'Erişiminiz ${grace} tarihinde duracak.',
  introFinal: 'Son çekim denemesi de başarısız oldu; kartınızdan bu dönem için otomatik çekim yapılmayacak. Planınızın kesilmemesi için ${grace} tarihine kadar ödeyin.',
  eyebrowHard: 'İşlem gerekiyor',
  titleHard: 'Aboneliğiniz için işlem gerekiyor.',
  introHard: 'Bankanız ${amount} tutarındaki çekimi onaylamadı; bu kartla bu dönem için yeniden deneme yapılmayacak. Planınızın kesilmemesi için ${grace} tarihine kadar ödeyin.',
  introActionNeeded: 'Bu dönemin otomatik yenilemesi yapılamadı. Planınızın kesilmemesi için ${grace} tarihine kadar ödeyin.',
  eyebrowUnresolved: 'Doğrulanıyor',
  titleUnresolved: 'Ödemenizin sonucunu doğruluyoruz.',
  introUnresolved:
    'Son çekim denemesinin sonucunu henüz doğrulayamadık. Kartınızdan çekim görürseniz bize yazın. Erişiminiz ${grace} tarihine kadar sürer. Beklemek istemezseniz şimdi ödeyebilirsiniz; iki ödeme de geçerse fazlasını iade ederiz.',
  labelPlan: 'Paket',
  labelAmount: 'Tutar',
  labelCard: 'Kart',
  labelNextAttempt: 'Sonraki deneme',
  labelAccessUntil: 'Erişim sonu',
  cta: 'Şimdi öde',
};

export const BILLING_RENEWAL_FAILED_EN = {
  headerEyebrow: 'Plan & billing · Payment',
  eyebrowAttempt: 'Payment failed',
  titleAttempt: "We couldn't take your payment.",
  introAttempt: "We couldn't charge ${amount} to your saved card for your ${planName} plan. We'll try again on ${date}. You keep access until ${grace}.",
  hintAttempt: "Check your card's limit and whether your bank has blocked the charge; if you'd rather not wait, you can pay now.",
  eyebrowFinal: 'Final attempt failed',
  titleFinal: 'Your access stops on ${grace}.',
  introFinal: "The last charge attempt failed too; your card won't be charged automatically for this period. Pay by ${grace} to keep your plan.",
  eyebrowHard: 'Action needed',
  titleHard: 'Action needed for your subscription.',
  introHard: "Your bank declined the charge of ${amount}; it won't be retried with this card for this period. Pay by ${grace} to keep your plan.",
  introActionNeeded: "This period couldn't be renewed automatically. Pay by ${grace} to keep your plan.",
  eyebrowUnresolved: 'Verifying',
  titleUnresolved: "We're verifying your payment.",
  introUnresolved:
    "We couldn't verify the result of the last charge attempt yet. If you see a charge on your card, write to us. You keep access until ${grace}. You can pay now if you'd rather not wait; if both payments go through, we refund the extra one.",
  labelPlan: 'Plan',
  labelAmount: 'Amount',
  labelCard: 'Card',
  labelNextAttempt: 'Next attempt',
  labelAccessUntil: 'Access until',
  cta: 'Pay now',
};

export const BILLING_AUTO_RENEW_CHANGED_TR = {
  headerEyebrow: 'Plan ve faturalama · Otomatik yenileme',
  eyebrowOn: 'Otomatik yenileme açık',
  titleOn: 'Otomatik yenileme açıldı.',
  introOn: '${planName} paketiniz ${date} tarihinden itibaren her ay ${amount} tutarında ${card} otomatik olarak yenilenecek. Her çekimden en az 3 gün önce tarihi ve tutarı bildiren bir e-posta alırsınız.',
  consentLead: 'Onayladığınız talimatın tam metni:',
  eyebrowReplaced: 'Kart değişti',
  titleReplaced: 'Otomatik yenileme artık yeni kartınızla.',
  introReplaced: '${planName} paketinizin sonraki otomatik çekimi ${date} tarihinde ${amount} tutarında ${card} yapılacak.',
  eyebrowOff: 'Otomatik yenileme kapalı',
  titleOff: 'Otomatik yenileme kapatıldı.',
  introOffOwner: 'Otomatik yenilemeyi kapattınız; kartınızdan otomatik çekim yapılmayacak. ${planName} paketiniz ${grace} tarihine kadar açık, sonrasında dilediğiniz zaman kendiniz uzatabilirsiniz.',
  introOffCardRemoved: 'Kayıtlı kartınızı kaldırdığınız için otomatik yenileme kapandı. ${planName} paketiniz ${grace} tarihine kadar açık.',
  introOffProviderMissing: "Kayıtlı kartınız PayNKolay'da bulunamadığı için otomatik yenileme kapandı ve kartınızdan çekim yapılmadı. ${planName} paketiniz ${grace} tarihine kadar açık; devam etmek için dönem bitmeden ödeyin.",
  introOffPlanChanged: "Paketinizi ya da ödeme döneminizi değiştirdiğiniz için önceki otomatik yenileme talimatı sona erdi. Yeni paketiniz için otomatik yenilemeyi Hesabım'dan yeniden açabilirsiniz.",
  introOffPriceIncrease: '${planName} paketinin fiyatı değiştiği için otomatik yenileme kapatıldı; yeni tutar için onayınız olmadan çekim yapılmaz. Paketiniz ${grace} tarihine kadar açık; devam etmek için yeni tutarla yenileyin ya da otomatik yenilemeyi yeniden açın.',
  introOffAdmin: 'Otomatik yenilemeniz destek ekibimiz tarafından kapatıldı; kartınızdan otomatik çekim yapılmayacak. ${planName} paketiniz ${grace} tarihine kadar açık. Sorunuz varsa support@buaze.com adresine yazın.',
  introOffAccountDeletion: 'Hesap silme talebiniz nedeniyle otomatik yenileme kapatıldı; kartınızdan çekim yapılmayacak.',
  labelPlan: 'Paket',
  labelAmount: 'Tutar',
  labelCard: 'Kart',
  labelFirstCharge: 'İlk çekim',
  labelNextCharge: 'Sonraki çekim',
  labelAccessUntil: 'Erişim sonu',
  perMonth: 'aylık, KDV dahil',
  cta: 'Plan ve faturalama',
};

export const BILLING_AUTO_RENEW_CHANGED_EN = {
  headerEyebrow: 'Plan & billing · Auto-renew',
  eyebrowOn: 'Auto-renew on',
  titleOn: 'Auto-renew is on.',
  introOn: 'Your ${planName} plan will renew automatically every month for ${amount} from ${card}, starting on ${date}. You get an email stating the date and amount at least 3 days before every charge.',
  consentLead: 'The full text of the instruction you confirmed:',
  eyebrowReplaced: 'Card changed',
  titleReplaced: 'Auto-renew now uses your new card.',
  introReplaced: 'The next automatic charge for your ${planName} plan is ${amount} to ${card} on ${date}.',
  eyebrowOff: 'Auto-renew off',
  titleOff: 'Auto-renew is off.',
  introOffOwner: "You turned auto-renew off; your card won't be charged automatically. Your ${planName} plan stays active until ${grace}; after that you can extend it yourself anytime.",
  introOffCardRemoved: 'Auto-renew turned off because you removed your saved card. Your ${planName} plan stays active until ${grace}.',
  introOffProviderMissing: "Auto-renew turned off because your saved card could no longer be found at PayNKolay, and nothing was charged. Your ${planName} plan stays active until ${grace}; pay before the period ends to continue.",
  introOffPlanChanged: 'You changed your plan or billing period, so the previous auto-renew instruction ended. You can turn auto-renew on again for your new plan under Account.',
  introOffPriceIncrease: "The price of the ${planName} plan changed, so auto-renew was turned off; nothing is charged for the new amount without your consent. Your plan stays active until ${grace}; to continue, renew at the new amount or turn auto-renew on again.",
  introOffAdmin: "Our support team turned your auto-renew off; your card won't be charged automatically. Your ${planName} plan stays active until ${grace}. Questions? Write to support@buaze.com.",
  introOffAccountDeletion: "Auto-renew was turned off because you asked to delete your account; your card won't be charged.",
  labelPlan: 'Plan',
  labelAmount: 'Amount',
  labelCard: 'Card',
  labelFirstCharge: 'First charge',
  labelNextCharge: 'Next charge',
  labelAccessUntil: 'Access until',
  perMonth: 'monthly, VAT included',
  cta: 'Plan & billing',
};
