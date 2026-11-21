import type { BillingLocale } from './billing-format';

/**
 * TR / EN strings of the saved-card surfaces (billing spec §13.1): the owner
 * panel, the review page, the hand-off page and the result page. Pure data,
 * shared by server and client code. Placeholders are `{name}`; `billingText`
 * fills them. Copy follows the Pulse voice: calm, exact, no emoji; formal
 * "siz" in Turkish. Company names are never written here (CLAUDE.md §47): the
 * brand is "Buaze", the payment institution is PayNKolay.
 */

type Copy = { tr: string; en: string };

export const BILLING_COPY = {
  // ── Payment method card (§12.2) ──
  'pm.eyebrow': { tr: 'ÖDEME YÖNTEMİ', en: 'PAYMENT METHOD' },
  'pm.meta': { tr: "PayNKolay'da saklanır · Kart numaranız Buaze'ye ulaşmaz", en: 'Stored by PayNKolay · Your card number never reaches Buaze' },
  'pm.expires': { tr: 'Son kullanma {mm}/{yy}', en: 'Expires {mm}/{yy}' },
  'pm.expired': { tr: 'Süresi doldu', en: 'Expired' },
  'pm.expiresSoon': { tr: 'Kartınızın süresi bir sonraki yenilemeden önce doluyor.', en: 'Your card expires before the next renewal.' },
  'pm.replace': { tr: 'Kartı değiştir', en: 'Replace card' },
  'pm.refresh': { tr: 'Kartı yenile', en: 'Refresh card' },
  'pm.remove': { tr: 'Kartı kaldır', en: 'Remove card' },
  'pm.more': { tr: 'Kart — diğer işlemler', en: 'Card — more actions' },
  'pm.removeTitle': { tr: 'Kayıtlı kart kaldırılsın mı?', en: 'Remove saved card?' },
  'pm.removeBodyAuto': {
    tr: 'Kart PayNKolay\'dan silinir ve otomatik yenileme kapanır. Planınız {date} tarihine kadar açık kalır.',
    en: 'The card is deleted at PayNKolay and auto-renew turns off. Your plan stays active until {date}.',
  },
  'pm.removeBody': {
    tr: "Kart PayNKolay'dan silinir. Sonraki ödemede kart bilgilerinizi yeniden girersiniz.",
    en: "The card is deleted at PayNKolay. You'll enter your card again next time you pay.",
  },
  'pm.removeConfirm': { tr: 'Kartı kaldır', en: 'Remove card' },
  'pm.cancel': { tr: 'Vazgeç', en: 'Cancel' },
  'pm.removed': { tr: 'Kart kaldırıldı.', en: 'Card removed.' },
  'pm.removeFailed': {
    tr: 'Kart PayNKolay\'da hâlâ görünüyor; silme doğrulanamadı. Birazdan tekrar deneyin.',
    en: 'PayNKolay still lists the card; the deletion could not be confirmed. Try again shortly.',
  },
  'pm.removeError': { tr: 'Kart kaldırılamadı. Tekrar deneyin.', en: "The card couldn't be removed. Try again." },
  'pm.removeNotListed': {
    tr: 'PayNKolay bu kartı şu an listelemedi; kart kaldırılmadı. Birazdan tekrar deneyin.',
    en: "PayNKolay didn't list this card just now; nothing was removed. Try again shortly.",
  },
  'pm.refreshed': { tr: 'Kart bilgisi PayNKolay\'dan yenilendi.', en: 'Card details refreshed from PayNKolay.' },
  'pm.refreshError': {
    tr: "PayNKolay'a şu an ulaşılamadı; son bilinen kart gösteriliyor.",
    en: "PayNKolay couldn't be reached; showing the last known card.",
  },
  'pm.loadError': { tr: 'Ödeme yöntemi yüklenemedi.', en: "The payment method couldn't be loaded." },
  'pm.retry': { tr: 'Tekrar dene', en: 'Try again' },
  'pm.empty': { tr: 'Kayıtlı kart yok', en: 'No saved card' },
  'pm.emptyBody': {
    tr: "Kartınız bir ödeme sırasında, PayNKolay'ın güvenli sayfasında kaydedilir.",
    en: "Your card is saved during a payment, on PayNKolay's secure page.",
  },
  'pm.add': { tr: 'Ödeyip kartı kaydet', en: 'Pay and save card' },
  'pm.pay': { tr: 'Öde', en: 'Pay' },
  'pm.teamOnly': { tr: 'Ödeme yöntemini yalnız hesap sahibi görür ve yönetir.', en: 'Only the account owner can see and manage the payment method.' },
  'pm.impersonating': {
    tr: 'Destek oturumunda kart ve yenileme ayarları değiştirilemez.',
    en: "Card and renewal settings can't be changed during a support session.",
  },
  'pm.other': { tr: 'Doğrulanmamış kart •••• {last4}', en: 'Unverified card •••• {last4}' },
  'pm.otherNoDigits': { tr: 'Doğrulanmamış kart', en: 'Unverified card' },
  'pm.otherHint': {
    tr: 'Bu kart otomatik yenilemede kullanılmaz. İstemiyorsanız kaldırın.',
    en: "This card is never used for auto-renew. Remove it if you don't want it.",
  },
  'pm.otherRemove': { tr: 'Kaldır', en: 'Remove' },
  'pm.previous': { tr: 'Önceki kart •••• {last4}', en: 'Previous card •••• {last4}' },
  'pm.previousNoDigits': { tr: 'Önceki kart', en: 'Previous card' },
  'pm.previousHint': {
    tr: 'Yeni kartınız kaydedildi; bu kart PayNKolay\'dan silinmeyi bekliyor. Hemen kaldırabilirsiniz.',
    en: 'Your new card is saved; this one is waiting to be deleted at PayNKolay. You can remove it now.',
  },
  'pm.saveLater': {
    tr: 'Kart kaydı, hesabınız doğrulandıktan 24 saat sonra açılır.',
    en: 'Saving a card becomes available 24 hours after your account is verified.',
  },
  'pm.legacyManual': { tr: 'Admin tarafından yönetilir', en: 'Managed by admin' },
  'pm.legacyNone': { tr: 'Henüz ödeme yöntemi eklenmedi.', en: 'No payment method on file.' },

  // ── Auto-renew (§12.3, §13.1) ──
  'ar.label': { tr: 'Otomatik yenileme', en: 'Auto-renew' },
  'ar.on': { tr: 'Sonraki çekim {date} · {amount} · •••• {last4}', en: 'Next charge {date} · {amount} · •••• {last4}' },
  'ar.onNoCard': { tr: 'Sonraki çekim {date} · {amount}', en: 'Next charge {date} · {amount}' },
  'ar.off': { tr: 'Kapalı. Dönem sonunda planınızı kendiniz uzatırsınız.', en: 'Off. You extend your plan yourself at the end of the period.' },
  'ar.paused': {
    tr: 'Otomatik yenileme geçici olarak durduruldu; bu dönem kartınızdan otomatik çekim yapılmaz. Erişiminiz {grace} tarihine kadar sürer; dilerseniz şimdi yenileyin.',
    en: "Auto-renew is paused for now; your card won't be charged automatically this period. You keep access until {grace}; renew now if you like.",
  },
  'ar.pausedShort': { tr: 'Geçici olarak durduruldu; kartınızdan otomatik çekim yapılmıyor.', en: "Paused for now; your card isn't charged automatically." },
  'ar.na.no_card': { tr: 'Otomatik yenileme için kayıtlı kart gerekir.', en: 'Auto-renew needs a saved card.' },
  'ar.na.yearly_cycle': { tr: 'Otomatik yenileme şimdilik yalnız aylık planlarda var.', en: 'Auto-renew is available for monthly plans only for now.' },
  'ar.na.above_non3d_limit': {
    tr: 'Bu tutar otomatik çekilemiyor; yenilemeyi kayıtlı kartınızla 3D Secure ile onaylarsınız.',
    en: "This amount can't be charged automatically; you confirm the renewal with your saved card and 3D Secure.",
  },
  'ar.na.subscription_inactive': { tr: 'Otomatik yenileme, aktif bir kartlı abonelikte açılabilir.', en: 'Auto-renew can be turned on for an active card subscription.' },
  'ar.na.not_card_subscription': { tr: 'Otomatik yenileme, kartla ödenen aboneliklerde açılabilir.', en: 'Auto-renew can be turned on for subscriptions paid by card.' },
  'ar.na.plan_unavailable': { tr: 'Bu paket için otomatik yenileme şu an açılamıyor.', en: "Auto-renew can't be turned on for this plan right now." },
  'ar.na.cancel_at_period_end': { tr: 'Aboneliğiniz dönem sonunda bitecek şekilde ayarlı.', en: 'Your subscription is set to end at the end of the period.' },
  'ar.na.flag_off': { tr: 'Otomatik yenileme yakında.', en: 'Auto-renew is coming soon.' },
  'ar.modalTitle': { tr: 'Otomatik yenilemeyi aç', en: 'Turn on auto-renew' },
  'ar.summaryPlan': { tr: 'Paket', en: 'Plan' },
  'ar.summaryAmount': { tr: 'Tutar', en: 'Amount' },
  'ar.summaryMonthly': { tr: 'aylık, KDV dahil', en: 'monthly, VAT included' },
  'ar.summaryFirst': { tr: 'İlk çekim', en: 'First charge' },
  'ar.summaryCard': { tr: 'Kart', en: 'Card' },
  'ar.textLabel': { tr: 'Talimat metni', en: 'Instruction text' },
  'ar.check': {
    tr: 'Talimatı okudum; her ay {amount} ödeme yükümlülüğünü kabul ediyorum.',
    en: 'I have read the instruction and accept the obligation to pay {amount} every month.',
  },
  'ar.confirm': { tr: 'Onayla ve otomatik yenilemeyi aç', en: 'Confirm and turn on auto-renew' },
  'ar.cancel': { tr: 'Vazgeç', en: 'Cancel' },
  'ar.continue': { tr: 'Devam et', en: 'Continue' },
  'ar.onNotice': {
    tr: 'Otomatik yenileme açıldı. İlk çekim {date}. Her çekimden en az 3 gün önce tarih ve tutarı bildiren bir e-posta alırsınız.',
    en: "Auto-renew is on. First charge on {date}. You'll get an email stating the date and amount at least 3 days before every charge.",
  },
  'ar.onPausedNotice': {
    tr: 'Talimatınız kaydedildi. Otomatik çekim şu an geçici olarak durdurulmuş; kartınızdan çekim yapılmadan önce size e-posta göndeririz.',
    en: "Your instruction is saved. Automatic charging is paused for now; we email you before your card is ever charged.",
  },
  'ar.offNotice': { tr: 'Otomatik yenileme kapatıldı. Planınız {date} tarihine kadar açık.', en: 'Auto-renew is off. Your plan stays active until {date}.' },
  'ar.offNoticeGeneric': { tr: 'Otomatik yenileme kapatıldı.', en: 'Auto-renew is off.' },
  'ar.termsChanged': {
    tr: 'Tutar ya da kart değişti. Güncel bilgileri kontrol edip yeniden onaylayın.',
    en: 'The amount or card changed. Check the updated details and confirm again.',
  },
  'ar.inFlight': {
    tr: 'Bu dönemin ödemesi şu anda işleniyor; sonucu birkaç dakika içinde göreceksiniz.',
    en: "This period's payment is being processed; you'll see the result in a few minutes.",
  },
  'ar.inFlightRefund': {
    tr: 'Otomatik yenileme kapatıldı. Bu dönemin çekimi tam şu anda işleniyordu; gerçekleşirse iade edilir.',
    en: "Auto-renew is off. This period's charge was already being processed; if it goes through, it will be refunded.",
  },
  'ar.useCheckout': { tr: 'Otomatik yenilemeyi bir sonraki ödemenizde açabilirsiniz.', en: 'You can turn on auto-renew with your next payment.' },
  'ar.error': { tr: 'Otomatik yenileme ayarı kaydedilemedi. Tekrar deneyin.', en: "The auto-renew setting couldn't be saved. Try again." },
  'ar.notEligible': { tr: 'Otomatik yenileme şu an açılamıyor.', en: "Auto-renew can't be turned on right now." },
  'stepup.title': { tr: 'Kimliğinizi doğrulayın', en: "Confirm it's you" },
  'stepup.body': {
    tr: 'Otomatik ödeme talimatı vermeden önce hesabın size ait olduğunu doğrulayın.',
    en: 'Before you give an automatic payment instruction, confirm the account is yours.',
  },
  'stepup.password': { tr: 'Şifreniz', en: 'Your password' },
  'stepup.totp': { tr: 'Doğrulama uygulamanızdaki 6 haneli kod', en: 'The 6-digit code from your authenticator app' },
  'stepup.google': { tr: 'Google ile doğrula', en: 'Verify with Google' },
  'stepup.googleHint': { tr: 'Google hesabınızla yeniden giriş yaparak doğrulayın.', en: 'Verify by signing in with your Google account again.' },
  'stepup.error': { tr: 'Doğrulama başarısız. Tekrar deneyin.', en: 'Verification failed. Try again.' },
  'stepup.rateLimited': { tr: 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.', en: 'Too many attempts. Try again later.' },

  // ── Off-only mail link page (§8.8) ──
  'off.eyebrow': { tr: 'OTOMATİK YENİLEME', en: 'AUTO-RENEW' },
  'off.title': { tr: 'Otomatik yenilemeyi kapat', en: 'Turn off auto-renew' },
  'off.body': {
    tr: 'Aşağıdaki düğmeyle otomatik yenilemeyi kapatırsınız. Kartınızdan otomatik çekim yapılmaz; planınız ödediğiniz dönemin sonuna kadar açık kalır.',
    en: "Use the button below to turn auto-renew off. Your card won't be charged automatically; your plan stays active until the end of the period you paid for.",
  },
  'off.button': { tr: 'Otomatik yenilemeyi kapat', en: 'Turn off auto-renew' },
  'off.done': { tr: 'Otomatik yenileme kapatıldı.', en: 'Auto-renew is off.' },
  'off.doneUntil': { tr: 'Otomatik yenileme kapatıldı. Planınız {date} tarihine kadar açık.', en: 'Auto-renew is off. Your plan stays active until {date}.' },
  'off.already': { tr: 'Otomatik yenileme zaten kapalı.', en: 'Auto-renew is already off.' },
  'off.invalid': {
    tr: 'Bu bağlantı geçersiz ya da süresi dolmuş. Otomatik yenilemeyi Hesabım → Plan ve faturalama sayfasından kapatabilirsiniz.',
    en: 'This link is invalid or has expired. You can turn auto-renew off under Account → Plan & billing.',
  },
  'off.superseded': {
    tr: 'Bu bağlantı daha eski bir talimata ait. Otomatik yenilemeyi son e-postadaki bağlantıdan ya da Hesabım → Plan ve faturalama sayfasından kapatabilirsiniz.',
    en: 'This link belongs to an earlier instruction. Turn auto-renew off through the link in the latest email or under Account → Plan & billing.',
  },
  'off.error': { tr: 'İşlem tamamlanamadı. Birazdan tekrar deneyin.', en: "That didn't work. Try again shortly." },
  'off.account': { tr: 'Hesabım → Plan ve faturalama', en: 'Account → Plan & billing' },

  // ── Plan hero (§12.1) ──
  'hero.payNow': { tr: 'Şimdi öde', en: 'Pay now' },
  'hero.changePlan': { tr: 'Planı değiştir', en: 'Change plan' },
  'hero.extend': { tr: 'Süreyi uzat', en: 'Extend period' },
  'hero.upgrade': { tr: 'Planı yükselt', en: 'Upgrade plan' },
  'hero.autoOff': { tr: 'Otomatik çekim kapalı; dönem bitmeden uzatabilirsiniz.', en: 'Automatic charging is off; extend before the period ends.' },
  'hero.pickPlan': {
    tr: 'Paketinizi seçin, PayNKolay güvenli ödeme sayfasına geçin.',
    en: 'Pick a plan and continue to the secure PayNKolay page.',
  },

  // ── Renewal notices (§12.1 RenewalNotice) ──
  'notice.pastDue': {
    tr: 'Ödemeniz alınamadı. Erişiminiz {grace} tarihine kadar sürer.',
    en: "We couldn't take your payment. You keep access until {grace}.",
  },
  'notice.needsAction': {
    tr: 'Bu dönemin yenilemesi tamamlanmadı. Planınızın kesilmemesi için {grace} tarihine kadar ödeyin.',
    en: "This period hasn't been renewed. Pay by {grace} to keep your plan.",
  },
  'notice.reminder': { tr: 'Planınız {date} tarihinde sona eriyor.', en: 'Your plan ends on {date}.' },
  'notice.renewSaved': { tr: 'Kayıtlı kartla yenile', en: 'Renew with saved card' },
  'notice.renewNow': { tr: 'Şimdi yenile', en: 'Renew now' },
  'notice.manualReview': {
    tr: 'Son ödemenin sonucunu doğruluyoruz. Erişiminiz {grace} tarihine kadar sürer. Beklemek istemezseniz şimdi ödeyebilirsiniz; iki ödeme de geçerse fazlasını iade ederiz.',
    en: "We're verifying the last payment. You keep access until {grace}. You can pay now if you'd rather not wait; if both payments go through, we refund the extra one.",
  },
  'notice.processing': {
    tr: 'Bu dönemin ödemesi şu anda işleniyor; sonucu birkaç dakika içinde göreceksiniz.',
    en: "This period's payment is being processed; you'll see the result in a few minutes.",
  },
  'notice.ownerPaying': {
    tr: 'Başlattığınız bir ödemenin sonucunu bekliyoruz. Ödemeyi tamamlamadıysanız yeniden ödeyebilirsiniz; iki ödeme de geçerse fazlasını iade ederiz.',
    en: "We're waiting for the result of a payment you started. If you didn't finish it, you can pay again; if both payments go through, we refund the extra one.",
  },

  // ── Review page (§12.4) ──
  'review.eyebrow': { tr: 'GÜVENLİ ÖDEME', en: 'SECURE PAYMENT' },
  'review.cancel': { tr: 'Vazgeç', en: 'Cancel' },
  'review.title': { tr: 'Ödeme özeti', en: 'Order summary' },
  'review.renewTitle': { tr: 'Aboneliği yenile', en: 'Renew subscription' },
  'review.replaceTitle': { tr: 'Kartı değiştir', en: 'Replace card' },
  'review.monthly': { tr: 'Aylık', en: 'Monthly' },
  'review.yearly': { tr: 'Yıllık', en: 'Yearly' },
  'review.yearlyHint': { tr: '2 ay hediye', en: '2 months free' },
  'review.cycle': { tr: 'Ödeme dönemi', en: 'Billing period' },
  'review.period': { tr: 'Dönem: {from} – {to}', en: 'Period: {from} – {to}' },
  'review.businesses': { tr: '{count} işletme', en: '{count} businesses' },
  'review.businessOne': { tr: '1 işletme', en: '1 business' },
  'review.dueToday': { tr: 'Bugün ödenecek', en: 'Due today' },
  'review.vatIncluded': { tr: 'KDV dahil · Türk lirası', en: 'VAT included · Turkish lira' },
  'review.saveCard': { tr: "Kartımı sonraki ödemeler için PayNKolay'da kaydet", en: 'Save my card at PayNKolay for future payments' },
  'review.saveNewCard': { tr: 'Kartımı kaydet', en: 'Save my card' },
  'review.saveLater': {
    tr: 'Kart kaydı, hesabınız doğrulandıktan 24 saat sonra açılır. Şimdilik kart kaydetmeden ödeyebilirsiniz.',
    en: 'Saving a card becomes available 24 hours after your account is verified. For now you can pay without saving it.',
  },
  'review.savedCardSelect': {
    tr: 'PayNKolay sayfasında kayıtlı kartınızı seçip 3D Secure ile onaylayın.',
    en: 'Pick your saved card on the PayNKolay page and confirm with 3D Secure.',
  },
  'review.enterCard': {
    tr: "Kart bilgilerinizi PayNKolay'ın sayfasında girip 3D Secure ile onaylayın.",
    en: "Enter your card on PayNKolay's page and confirm with 3D Secure.",
  },
  'review.saveNewHint': {
    tr: 'Yeni kartınız doğrulandıktan sonra eski kayıtlı kartınızın yerini alır.',
    en: 'Once verified, your new card replaces the card you saved before.',
  },
  'review.replaceBody': {
    tr: 'Yeni kartınız bir ödemeyle kaydedilir: sonraki dönemi ({amount}) şimdi ödersiniz, süre {renewsAt} tarihinden sonraya eklenir ({newEnd} tarihine kadar).',
    en: 'Your new card is saved with a payment: you pay the next period ({amount}) now, and the time is added after {renewsAt} (until {newEnd}).',
  },
  'review.replaceRequired': {
    tr: 'Kartın değişmesi için bu kutuyu işaretleyin.',
    en: 'Tick this box to replace the card.',
  },
  'review.pay': { tr: '{amount} öde', en: 'Pay {amount}' },
  'review.redirecting': { tr: 'Yönlendiriliyor…', en: 'Redirecting…' },
  'review.obligation': {
    tr: '“{amount} öde” düğmesine basarak {amount} ödeme yükümlülüğü altına girdiğinizi kabul edersiniz.',
    en: 'By pressing “Pay {amount}” you accept the obligation to pay {amount}.',
  },
  'review.trust': { tr: "3D Secure · Kart bilgileri PayNKolay'da girilir", en: 'Card details are entered at PayNKolay · 3D Secure' },
  'review.legal': { tr: 'Mesafeli Hizmet Sözleşmesi · İade ve İptal Politikası', en: 'Distance Service Agreement · Refund and Cancellation Policy' },
  'review.distance': { tr: 'Mesafeli Hizmet Sözleşmesi', en: 'Distance Service Agreement' },
  'review.refund': { tr: 'İade ve İptal Politikası', en: 'Refund and Cancellation Policy' },
  'review.pastDue': {
    tr: 'Son dönemin ödemesi alınamadı. Bu ödemeyle planınız kesintisiz devam eder.',
    en: 'The last period was not paid. This payment keeps your plan running without a gap.',
  },
  'review.noPlan': {
    tr: 'Bu paket için kartla ödeme şu an açık değil.',
    en: 'Card payment is not available for this plan right now.',
  },
  'review.backToPanel': { tr: 'Panele dön', en: 'Back to dashboard' },
  'review.impersonating': {
    tr: 'Destek oturumunda ödeme başlatılamaz. Ödemeyi hesap sahibi kendi oturumunda yapar.',
    en: "A payment can't be started during a support session. The account owner pays from their own session.",
  },
  'review.ownerOnly': {
    tr: 'Ödemeyi yalnız hesap sahibi yapabilir.',
    en: 'Only the account owner can pay.',
  },
  'review.err.consent_required': {
    tr: 'Kartın kaydedilmesi için onay kutusunu işaretlemeniz gerekir.',
    en: 'Saving the card needs your consent.',
  },
  'review.err.terms_changed': {
    tr: 'Fiyat ya da koşullar değişti. Güncel tutarı kontrol edip yeniden deneyin.',
    en: 'The price or terms changed. Check the updated amount and try again.',
  },
  'review.err.renewal_in_progress': {
    tr: 'Bu dönem için başka bir ödeme şu anda doğrulanıyor. Sonucu Hesabım sayfasında görürsünüz; ödeme geçmezse buradan yeniden ödeyebilirsiniz.',
    en: 'Another payment for this period is being confirmed. You will see the result under Account; if it fails, you can pay again here.',
  },
  'review.err.verification_required': {
    tr: 'Ödeme için güvenlik doğrulaması gerekiyor: yeniden giriş yapın. Sorun sürerse {email} adresine yazın.',
    en: 'This payment needs a security check: sign in again. If the problem continues, write to {email}.',
  },
  'review.verify.stale': {
    tr: 'Ödemeden önce güvenlik doğrulaması gerekiyor: son girişiniz 24 saatten eski. Yeniden giriş yapın, ardından bu sayfaya dönersiniz.',
    en: 'A security check is needed before paying: your last sign-in is more than 24 hours old. Sign in again and you will come back to this page.',
  },
  'review.verify.noScore': {
    tr: 'Son girişinizde güvenlik kontrolü tamamlanamadı; tarayıcınız ya da bir eklenti Google reCAPTCHA\'yı engellemiş olabilir. Engelleyiciyi bu site için kapatıp yeniden giriş yapın. Sorun sürerse {email} adresine yazın.',
    en: 'The security check did not complete at your last sign-in; your browser or an extension may have blocked Google reCAPTCHA. Allow it for this site and sign in again. If the problem continues, write to {email}.',
  },
  'review.verify.lowScore': {
    tr: 'Son girişiniz güvenlik kontrolünden geçmedi. Yeniden giriş yapın; sorun sürerse {email} adresine yazın.',
    en: 'Your last sign-in did not pass the security check. Sign in again; if the problem continues, write to {email}.',
  },
  'review.verify.button': { tr: 'Yeniden giriş yap', en: 'Sign in again' },
  'review.expired': {
    tr: 'Planınızın süresi doldu. Devam etmek için bir paket seçin.',
    en: 'Your plan has ended. Pick a plan to continue.',
  },
  'review.seePlans': { tr: 'Paketleri gör', en: 'See plans' },
  'review.err.save_not_allowed': {
    tr: 'Kart kaydı şu an kullanılamıyor; ödemeyi kart kaydetmeden yapabilirsiniz.',
    en: "Saving a card isn't available yet; you can pay without saving it.",
  },
  'review.err.rate_limited': { tr: 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.', en: 'Too many attempts. Try again later.' },
  'review.err.unavailable': {
    tr: 'Kartla ödeme şu an kullanılamıyor. Biraz sonra tekrar deneyin.',
    en: 'Card payment is unavailable right now. Try again a little later.',
  },
  'review.err.origin_mismatch': {
    tr: 'Ödeme isteği doğrulanamadı. Sayfayı yenileyip tekrar deneyin.',
    en: "The payment request couldn't be verified. Reload the page and try again.",
  },
  'review.err.owner_only': { tr: 'Ödemeyi yalnız hesap sahibi yapabilir.', en: 'Only the account owner can pay.' },
  'review.err.impersonation_blocked': {
    tr: 'Destek oturumunda ödeme başlatılamaz.',
    en: "A payment can't be started during a support session.",
  },
  'review.err.plan_too_small': {
    tr: 'Bu paket, hesabınızdaki işletme sayısı için küçük. Daha büyük bir paket seçin.',
    en: 'This plan is too small for the businesses on your account. Pick a larger plan.',
  },

  // ── Saved-card page (/billing/{l}/card, outside the dashboard gate) ──
  'card.title': { tr: 'Kayıtlı kart', en: 'Saved card' },
  'card.body': {
    tr: "Kartınız PayNKolay'da saklanır; kart numaranız Buaze'ye ulaşmaz. Kartı buradan istediğiniz zaman kaldırabilirsiniz.",
    en: 'Your card is stored by PayNKolay; your card number never reaches Buaze. You can remove it here at any time.',
  },
  'card.none': { tr: 'Kayıtlı kartınız yok.', en: 'You have no saved card.' },

  // ── Hand-off page (§12.5) ──
  'inter.eyebrow': { tr: 'GÜVENLİ ÖDEME', en: 'SECURE PAYMENT' },
  'inter.title': { tr: "PayNKolay'a geçiyorsunuz", en: 'Taking you to PayNKolay' },
  'inter.body': {
    tr: "Kart bilgilerinizi PayNKolay'ın sayfasında girersiniz; Buaze kart numaranızı görmez.",
    en: "You enter your card on PayNKolay's page; Buaze never sees your card number.",
  },
  'inter.save': { tr: "Kartınız PayNKolay'da saklanacak.", en: 'Your card will be stored by PayNKolay.' },
  'inter.auto': {
    tr: 'Otomatik yenileme: {date} tarihinden itibaren her ay {amount} · istediğiniz an kapatın',
    en: 'Auto-renew: {amount} every month from {date} · turn off anytime',
  },
  'inter.autoYearly': {
    tr: 'Otomatik yenileme: {date} tarihinden itibaren her yıl {amount} · istediğiniz an kapatın',
    en: 'Auto-renew: {amount} every year from {date} · turn off anytime',
  },
  'inter.button': { tr: 'Güvenli ödemeye devam et', en: 'Continue to secure payment' },
  'inter.cancel': { tr: 'Vazgeç', en: 'Cancel' },
  'inter.noscript': { tr: 'Devam etmek için düğmeye basın.', en: 'Press the button to continue.' },
  'inter.trust': { tr: '3D Secure · PayNKolay (Nkolay Ödeme Kuruluşu)', en: '3D Secure · PayNKolay (Nkolay Ödeme Kuruluşu)' },
  'inter.renew': { tr: 'Yenileme', en: 'Renewal' },
  'inter.replace': { tr: 'Kart değişikliği', en: 'Card replacement' },

  // ── Result page (§12.6) ──
  'result.success': { tr: 'Ödemeniz alındı', en: 'Payment received' },
  'result.successBody': { tr: 'Planınız {date} tarihine kadar açık.', en: 'Your plan is active until {date}.' },
  'result.successGeneric': { tr: 'Planınız güncellendi.', en: 'Your plan has been updated.' },
  'result.cardSaved': { tr: 'Kartınız kaydedildi: •••• {last4}', en: 'Card saved: •••• {last4}' },
  'result.cardSavedGeneric': { tr: 'Kartınız kaydedildi.', en: 'Your card was saved.' },
  'result.cardNotSaved': {
    tr: 'Ödemeniz alındı ancak kartınız kaydedilemedi. Bir sonraki ödemede yeniden deneyebilirsiniz.',
    en: "Your payment went through but the card couldn't be saved. You can try again at your next payment.",
  },
  'result.cardPending': {
    tr: 'Kart kaydınız PayNKolay ile doğrulanıyor; birkaç dakika içinde Hesabım sayfasında görünür.',
    en: 'Your card is being confirmed with PayNKolay; it appears under Account within a few minutes.',
  },
  'result.failed': { tr: 'Ödeme onaylanmadı', en: 'Payment not confirmed' },
  'result.failedBody': {
    tr: 'Kartınızdan tutar çekildiğini görürseniz bize yazın; kontrol edip düzeltiriz.',
    en: "If you see a charge on your card, write to us and we'll check and fix it.",
  },
  'result.pending': { tr: 'Ödeme kontrol ediliyor', en: 'Checking your payment' },
  'result.pendingBody': {
    tr: 'Sonucu birkaç dakika içinde burada ve e-postanızda göreceksiniz.',
    en: "You'll see the result here and in your email within a few minutes.",
  },
  'result.review': { tr: 'Ödemeniz inceleniyor', en: 'Your payment is under review' },
  'result.reviewBody': {
    tr: 'Ödemeniz beklenen koşullarla eşleşmedi; dönem eklenmedi ve tutar iade edilecek. Bize yazarsanız hemen kontrol ederiz.',
    en: "Your payment didn't match the expected terms; no period was added and the amount will be refunded. Write to us and we'll check right away.",
  },
  'result.generic': { tr: 'Ödeme sayfası', en: 'Payment' },
  'result.genericBody': {
    tr: 'Ödemenizin durumunu Hesabım → Plan ve faturalama sayfasında görebilirsiniz.',
    en: 'You can see the status of your payment under Account → Plan & billing.',
  },
  'result.plan': { tr: 'Paket', en: 'Plan' },
  'result.amount': { tr: 'Tutar', en: 'Amount' },
  'result.periodEnd': { tr: 'Dönem sonu', en: 'Period end' },
  'result.card': { tr: 'Kart', en: 'Card' },
  'result.back': { tr: 'Panele dön', en: 'Back to dashboard' },
  'result.retry': { tr: 'Tekrar dene', en: 'Try again' },
  'result.pricing': { tr: 'Paketleri gör', en: 'See plans' },
  'result.support': { tr: 'Destek: {email}', en: 'Support: {email}' },

  // ── Plan picker (§12.7) ──
  'picker.title': { tr: 'Paket seç', en: 'Pick a plan' },
  'picker.intro': {
    tr: "Ödeme PayNKolay'ın güvenli sayfasında alınır. Otomatik yenileme isteğe bağlıdır.",
    en: "Payment is taken on PayNKolay's secure page. Auto-renew is optional.",
  },
  'picker.introLegacy': {
    tr: "Ödeme PayNKolay'ın güvenli sayfasında alınır. Kartınızdan otomatik çekim yapılmaz.",
    en: "Payment is taken on PayNKolay's secure page. Your card is never charged automatically.",
  },
  'picker.footer': { tr: 'GÜVENLİ ÖDEME · 3D SECURE · TAAHHÜTSÜZ', en: 'SECURE PAYMENT · 3D SECURE · NO COMMITMENT' },
  'picker.continue': { tr: 'Devam et · {price}', en: 'Continue · {price}' },
  'picker.current': { tr: 'Mevcut plan', en: 'Current plan' },
  'picker.monthlyShort': { tr: '/ay', en: '/mo' },
  'picker.yearlyShort': { tr: '/yıl', en: '/yr' },
} as const satisfies Record<string, Copy>;

export type BillingCopyKey = keyof typeof BILLING_COPY;

/** The string for `key` in `locale`, with `{name}` placeholders filled (missing values become ''). */
export function billingText(key: BillingCopyKey, locale: BillingLocale, vars: Record<string, string | number> = {}): string {
  const entry: Copy = BILLING_COPY[key];
  const template = locale === 'en' ? entry.en : entry.tr;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : ''));
}

/** Error codes the review page can show (`?error=<code>`); anything else is ignored. */
export const REVIEW_ERROR_CODES = [
  'consent_required',
  'terms_changed',
  'renewal_in_progress',
  'verification_required',
  'save_not_allowed',
  'rate_limited',
  'unavailable',
  'origin_mismatch',
  'owner_only',
  'impersonation_blocked',
  'plan_too_small',
] as const;
export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number];

export function reviewErrorCode(value: string | null | undefined): ReviewErrorCode | null {
  return (REVIEW_ERROR_CODES as readonly string[]).includes(value ?? '') ? (value as ReviewErrorCode) : null;
}
