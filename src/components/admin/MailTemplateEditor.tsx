'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, History, Loader2, Mail, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import MailFieldInput, { type MailFieldDef } from './MailFieldInput';
import FormConfirmationEditor from './FormConfirmationEditor';
import MailRevisionHistory from './MailRevisionHistory';
import { MAIL_PLACEHOLDERS } from '@/lib/email/placeholders';

// Schema-aware fields per template. Only string copy fields the admin
// should edit; structural arrays (steps, resources, quickActions, quotes)
// are hidden — they require typed editing UI which is Phase 3+ scope.
//
// Field flags:
//  - `multiline?: boolean` → render as <textarea>
//  - `locked?: boolean` → KVKK/security lock; UI shows disabled input
//    with 🔒 KVKK badge. Server-side enforcement is in `locked-fields.ts`,
//    so UI bypass via curl/devtools still gets dropped.
//  - `lockReason?: string` → user-facing tooltip explaining the lock
// Re-exported via the shared MailFieldInput component so other editors
// (e.g. FormConfirmationEditor) reuse the same field schema.
type FieldDef = MailFieldDef;
const FIELDS_BY_TEMPLATE: Record<string, FieldDef[]> = {
  welcome: [
    { key: 'eyebrow', label: 'Eyebrow', group: 'Başlık', hint: 'Hero kartının sağ-üst köşesinde küçük mono-font etiket. Lime arka plan üstünde graphite text. Örnek: "Hoş geldin · Sayı bir".' },
    { key: 'titleHi', label: 'Selamlama başlığı', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS.welcome, hint: 'Hero başlığın 1. satırı — büyük graphite font. "${firstName}" placeholder runtime\'da kullanıcının adıyla doldurulur. Örnek: "Merhaba ${firstName}.".' },
    { key: 'titleSub', label: 'Başlık alt satırı', group: 'Başlık', hint: 'Hero başlığın 2. satırı — italic, navy/n800 renkte. Selamlamadan hemen sonra. Örnek: "Şimdi başlıyoruz."' },
    { key: 'intro', label: 'Giriş paragrafı', group: 'Başlık', multiline: true, placeholders: MAIL_PLACEHOLDERS.welcome, hint: 'Hero altındaki açıklama metni — 1-2 cümle. Body font, hero kartının iç bölümünde. Örnek: "Hesabını oluşturduğun için teşekkürler. ..."' },
    { key: 'stepsEyebrow', label: 'Adımlar bölüm etiketi', group: 'Adımlar', hint: 'Hero altındaki kurulum bölümünün üst etiketi. ECG divider sonrası ilk satır. Örnek: "Kurulum · 4 adım".' },
    { key: 'nextLabel', label: '"Sıradaki" rozet metni', group: 'Adımlar', hint: 'Aktif adımın sağ tarafında lime arka planlı küçük rozet. Sadece "current" durumdaki adımda görünür. Örnek: "Sıradaki".' },
    { key: 'cta', label: 'Birincil CTA buton metni', group: 'Aksiyon', hint: 'Adımlar listesinin altındaki büyük lime buton — kullanıcıyı dashboard\'a yönlendirir. Örnek: "Kuruluma devam et →".' },
    { key: 'demoLink', label: 'Demo video link metni', group: 'Aksiyon', hint: 'Birincil CTA butonunun yanındaki ikincil link — alt çizgili gri text. Örnek: "Demo videoyu izle (2 dk)".' },
    { key: 'resourcesEyebrow', label: 'Kaynaklar bölüm etiketi', group: 'Footer', hint: 'Mail\'in alt kısmındaki 4-kart kaynak grid\'inin üst etiketi. Örnek: "İlk gün için".' },
  ],
  newsletter: [
    { key: 'titleA', label: 'Başlık 1. parça', group: 'Başlık', hint: 'Hero başlığın ilk yarısı — büyük graphite font, sol-üst hizalı. Örnek: "Sessiz misafiri".' },
    { key: 'titleAccent', label: 'Başlık vurgu kelimesi', group: 'Başlık', hint: 'Lime arka planlı, italic vurgu kelimesi — başlığın ortasında. Örnek: "duyabilmek".' },
    { key: 'titleEnd', label: 'Başlık 3. parça', group: 'Başlık', hint: 'Hero başlığın son satırı — vurgu kelimesinden sonra. Örnek: "sanatı."' },
    { key: 'intro', label: 'Giriş paragrafı', group: 'Başlık', multiline: true, placeholders: MAIL_PLACEHOLDERS.newsletter, hint: 'Hero altındaki editör notu — 2-3 cümle. Örnek: "Müşterilerin yalnızca %4\'ü kötü deneyim yaşadığında konuşur. ..."' },
    { key: 'featuredEyebrow', label: 'Kapak yazısı etiketi', group: 'Bölümler', hint: 'Featured (öne çıkan) yazı kartının üst etiketi — koyu kart üstünde. Örnek: "Kapak yazısı".' },
    { key: 'listEyebrow', label: 'Yazılar listesi başlığı', group: 'Bölümler', hint: 'Featured altındaki numaralandırılmış yazı listesinin üst etiketi. Örnek: "Bu sayıda".' },
    { key: 'statsTitle', label: 'İstatistik kart başlığı', group: 'Bölümler', hint: 'Stats band başlığı — caller params.stats geçirmediğinde band tamamen gizlenir. Örnek: "Bu ayın küçük rakamları".' },
    { key: 'futureLabel', label: 'Gelecek sayı etiketi', group: 'Footer', hint: 'Mail sonundaki "next issue" teaser kart üst etiketi. Örnek: "Önümüzdeki sayıda".' },
    { key: 'futureBody', label: 'Gelecek sayı metni', group: 'Footer', multiline: true, hint: 'Teaser açıklaması — 1 cümle. Örnek: "Otel sektörü vakası, yeni heatmap görselleri, OAuth entegrasyonları."' },
    { key: 'exploreCta', label: 'Arşiv link metni', group: 'Footer', hint: 'Footer\'da blog/issue arşivine giden ikincil link. Örnek: "Tüm sayıları gör →".' },
    { key: 'cta', label: 'Birincil CTA', group: 'Aksiyon', hint: 'Featured yazıyı açan koyu kart içindeki lime buton. Örnek: "Editörün notunu oku →".' },
  ],
  'trial-ending': [
    { key: 'eyebrow', label: 'Eyebrow', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['trial-ending'], hint: 'Hero kartının üst etiketi — "${daysLeft}" runtime\'da gerçek gün sayısı olur. Örnek: "Deneme · ${daysLeft} gün kaldı".' },
    { key: 'titleA', label: 'Başlık 1. satır', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['trial-ending'], hint: 'Hero büyük başlığının 1. satırı. Geçmiş zamanlı bir cümle. Örnek: "14 gündür birlikteyiz."' },
    { key: 'titleB', label: 'Başlık 2. satır', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['trial-ending'], hint: 'Hero büyük başlığının 2. satırı — soru cümlesi. Örnek: "Devam edelim mi?"' },
    { key: 'usageEyebrow', label: 'Kullanım kart etiketi', group: 'Kullanım', hint: '4-sütun stat grid\'inin üst etiketi (yorum / ortalama / AI yanıt / +X% organik). Örnek: "Bu 14 günde Buaze\'de".' },
    { key: 'plansEyebrow', label: 'Plan bölüm etiketi', group: 'Planlar', hint: '2 plan kartının üst etiketi. Genelde promo bilgisi içerir. Örnek: "Plan seç · İlk ay %50".' },
    { key: 'starterTitle', label: 'Starter plan başlığı', group: 'Planlar', hint: 'Sol plan kartının başlığı (ucuz olan). Örnek: "Pulse Starter".' },
    { key: 'starterBody', label: 'Starter plan açıklaması', group: 'Planlar', multiline: true, hint: 'Sol plan kartının açıklama metni — özellikleri özetler. Örnek: "Tek şube, sınırsız QR, 100 AI yanıt/ay."' },
    { key: 'proTitle', label: 'Pro plan başlığı', group: 'Planlar', hint: 'Sağ plan kartının başlığı (premium olan). "ÖNERİLEN" rozeti bu kart üzerinde. Örnek: "Pulse Pro".' },
    { key: 'proBody', label: 'Pro plan açıklaması', group: 'Planlar', multiline: true, hint: 'Sağ plan kartının açıklama metni. Örnek: "Çoklu şube, sınırsız AI, OAuth + webhook, öncelikli destek."' },
    { key: 'proBadge', label: 'Pro rozet metni', group: 'Planlar', hint: 'Pro kartının sağ-üst köşesinde absolute pozisyonlu küçük lime rozet. Örnek: "ÖNERİLEN".' },
    { key: 'cta', label: 'Birincil CTA', group: 'Aksiyon', hint: 'Plan kartlarının altındaki büyük lime buton — Stripe/billing\'e yönlendirir. Örnek: "Planımı seç →".' },
    { key: 'comparisonLink', label: 'Detay link metni', group: 'Aksiyon', hint: 'CTA butonunun yanındaki ikincil link — pricing sayfasına gider. Örnek: "Detaylı karşılaştırma".' },
  ],
  'forgot-password': [
    { key: 'eyebrow', label: 'Eyebrow', group: 'Başlık', hint: 'Hero kartının üst etiketi — adım numarası içerir. Örnek: "01 · Talep alındı".' },
    { key: 'title', label: 'Başlık 1. parça', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['forgot-password'], hint: 'Hero başlığın 1. satırı — büyük graphite font. Örnek: "Şifreni".' },
    { key: 'titleAccent', label: 'Başlık vurgu', group: 'Başlık', hint: 'Başlığın 2. satırı — lime altçizgili italic vurgu. Örnek: "sıfırlayalım".' },
    { key: 'intro', label: 'Giriş paragrafı', group: 'Başlık', multiline: true, placeholders: MAIL_PLACEHOLDERS['forgot-password'], hint: 'Hero altındaki açıklama. "${firstName}" varsa kişiselleştirilir. Örnek: "Merhaba ${firstName}, az önce bu adres için yeni bir şifre talep edildi. ..."' },
    { key: 'cardEyebrow', label: 'Token kartı etiketi', group: 'Token kartı', hint: 'Hero altındaki token kartının üst etiketi. Örnek: "Tek kullanımlık link".' },
    { key: 'statusText', label: 'Durum pill metni', group: 'Token kartı', locked: true, lockReason: 'Güvenlik: token süre uyarısı, değiştirmek phishing riski yaratır', hint: 'Token kartının sağ-üst köşesindeki yeşil pill. Örnek: "Aktif · 30 dk geçerli".' },
    { key: 'cta', label: 'Birincil CTA buton metni', group: 'Aksiyon', hint: 'Token kartı içindeki büyük lime buton — kullanıcıyı reset URL\'ine götürür. Örnek: "Yeni şifre belirle →".' },
    { key: 'altCodeLabel', label: 'Alternatif kod açıklaması', group: 'Aksiyon', hint: 'CTA butonu altında, 6-haneli fallback kod\'un üst etiketi. Örnek: "Uygulamada kullanmak için kod".' },
    { key: 'metaTime', label: '"Talep saati" alanı etiketi', group: 'Meta', hint: '2x2 meta grid\'in sol-üst hücresi etiketi. Sağda timestamp gösterilir. Örnek: "Talep saati".' },
    { key: 'metaIp', label: '"IP" alanı etiketi', group: 'Meta', hint: '2x2 meta grid\'in sağ-üst hücresi etiketi. Sağda IP adresi gösterilir. Örnek: "IP".' },
    { key: 'metaDevice', label: '"Cihaz" alanı etiketi', group: 'Meta', hint: '2x2 meta grid\'in sol-alt hücresi etiketi. Sağda user-agent özeti. Örnek: "Cihaz".' },
    { key: 'metaAccount', label: '"Hesap" alanı etiketi', group: 'Meta', hint: '2x2 meta grid\'in sağ-alt hücresi etiketi. Sağda user email gösterilir. Örnek: "Hesap".' },
    { key: 'notYouTitle', label: '"Sen değil misin?" başlık', group: 'Güvenlik uyarısı', locked: true, lockReason: 'Güvenlik uyarısı — hesap sahibi değilsen ne yapmalı bilgisi', hint: 'Mail\'in alt kısmındaki güvenlik kartının başlığı. Lime-soft arka plan + 3px lime-deep sol border.' },
    { key: 'notYouBody', label: '"Sen değil misin?" gövde', group: 'Güvenlik uyarısı', multiline: true, locked: true, lockReason: 'Güvenlik uyarısı içeriği', hint: 'Güvenlik kartının gövde metni — kullanıcı şüphelendiğinde ne yapacağını söyler.' },
    { key: 'notYouLink', label: 'Destek link metni', group: 'Güvenlik uyarısı', locked: true, lockReason: 'Şüpheli durum eskalasyon linki', hint: 'Güvenlik kartı içindeki destek ekibi linki — lime altı çizgili.' },
  ],
  'low-rating-alert': [
    { key: 'eyebrowAlert', label: 'Üst alarm etiketi', group: 'Etiketler', hint: 'Hero üstündeki graphite alert bar\'ın sol bilgi metni. Warning dot + bu text + timestamp. Örnek: "Anlık uyarı · Düşük puan".' },
    { key: 'eyebrowAction', label: 'Aksiyon urgency etiketi', group: 'Etiketler', hint: 'Hero başlığının üstündeki ikinci eyebrow — aksiyon urgency mesajı. Örnek: "Aksiyon gerektiriyor · 1 saat içinde dön".' },
    { key: 'title', label: 'Başlık', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['low-rating-alert'], hint: 'Hero büyük başlık — "${rating}" runtime\'da gerçek puanla doldurulur. Örnek: "${rating} yıldız geldi."' },
    { key: 'titleSub', label: 'Başlık alt satırı', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['low-rating-alert'], hint: 'Hero başlığın 2. satırı — italic, n500 renkte. Örnek: "Önce dinleyelim."' },
    { key: 'aiEyebrow', label: 'AI Co-Pilot kart etiketi', group: 'AI Co-Pilot', hint: 'Yorum kartı altındaki dark AI Co-Pilot draft kartının üst etiketi. Örnek: "Co-Pilot taslağı".' },
    { key: 'toneLabel', label: 'AI tone default etiketi', group: 'AI Co-Pilot', hint: 'AI Co-Pilot kartında, taslağın yanındaki tone label\'ı — caller params.aiTone geçirmediğinde fallback görünür. Örnek: "Ton: profesyonel · empati yüksek".' },
    { key: 'aiEdit', label: 'AI "Düzenle" buton metni', group: 'AI Co-Pilot', hint: 'AI Co-Pilot kartı altındaki ikincil buton — taslağı düzenlemek için panele yönlendirir. Örnek: "Düzenle".' },
    { key: 'aiApprove', label: 'AI "Onayla" buton metni', group: 'AI Co-Pilot', hint: 'AI Co-Pilot kartı altındaki birincil lime buton — taslağı onaylar ve yollar. Örnek: "Onayla & Yanıtla →".' },
    { key: 'quickEyebrow', label: 'Hızlı aksiyon başlığı', group: 'Hızlı aksiyon', hint: 'Mail\'in alt kısmındaki 3-sütun aksiyon grid\'inin üst etiketi. Örnek: "Hızlı aksiyon".' },
    { key: 'noComment', label: '"Yorum yok" hint metni', group: 'Hızlı aksiyon', hint: 'Müşteri yorum bırakmadığında yorum kartının yerine görünen italic placeholder text. Örnek: "Yorum bırakılmadı."' },
  ],
  'new-review': [
    { key: 'eyebrow', label: 'Status pill metni', group: 'Etiket', hint: 'Hero üstündeki "Canlı" status pill\'inin metni — yeşil dot + bu text. Örnek: "Canlı · Az önce geldi".' },
    { key: 'title', label: 'Başlık', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['new-review'], hint: 'Hero büyük başlık — "${rating}" runtime\'da gerçek puanla doldurulur. Örnek: "${rating} yıldız."' },
    { key: 'titleSub', label: 'Başlık alt satırı', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['new-review'], hint: 'Hero başlığın 2. satırı — italic, n500 renkte (kutlama tonu). Örnek: "Hak ettin."' },
    { key: 'primaryCta', label: 'Birincil CTA buton metni', group: 'Aksiyon', hint: 'Yorum kartı altındaki büyük lime buton — feedback yanıt panelinde açar. Örnek: "Teşekkür yaz →".' },
    { key: 'secondaryCta', label: 'İkincil CTA link metni', group: 'Aksiyon', hint: 'Birincil CTA\'nın yanındaki ikincil border\'lı buton — Google review URL\'ine gider (params.shareUrl varsa). Örnek: "Google\'da paylaş".' },
    { key: 'noComment', label: '"Yorum yok" hint metni', group: 'Boş durum', hint: 'Müşteri yorum bırakmadığında kart yerine italic placeholder. Örnek: "Yorum bırakılmadı."' },
  ],
  'weekly-report': [
    // NOTE: `eyebrow` is intentionally not exposed here. Inline default uses
    // a `Hafta ${weekNum} · …` template literal — interpolation that admin
    // override would silently strip (DB stores plain strings). Render keeps
    // the literal default so the week number stays dynamic.
    { key: 'titleA', label: 'Hero 1. satır', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['weekly-report'], hint: 'Hero başlığın 1. satırı — geçmiş hafta yorumu. Örnek: "Sessiz başlayan hafta," (pozitif senaryo).' },
    { key: 'titleEnd', label: 'Hero 3. satır', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['weekly-report'], hint: 'Hero başlığın son satırı — sayı ve aksiyon birleşimi. Aradaki vurgu sayı runtime\'da. Örnek: "yorumla bitti."' },
    { key: 'statTotal', label: 'Yeni yorum etiketi', group: 'İstatistikler', hint: 'Dark hero kartındaki ilk stat hücresinin etiketi — sayı altında küçük mono text. Örnek: "Yeni yorum".' },
    { key: 'statAvg', label: 'Ortalama puan etiketi', group: 'İstatistikler', hint: 'Dark hero kartındaki 2. stat hücresinin etiketi. Sayı altında. Örnek: "Ortalama puan".' },
    { key: 'statResp', label: 'Yanıt süresi etiketi', group: 'İstatistikler', hint: 'Şu an gizli — backend response-time tracking henüz yok. Eklendiğinde 3. stat sütunu olacak. Örnek: "Yanıt süresi".' },
    { key: 'chartEyebrow', label: 'Grafik bölüm etiketi', group: 'Grafik', hint: 'Stats altındaki 7-günlük bar chart\'ın üst etiketi. Örnek: "Günlük dağılım".' },
    { key: 'chartTitle', label: 'Grafik başlığı', group: 'Grafik', hint: 'Bar chart\'ın altındaki kısa açıklama — peak gün vurgusu. Örnek: "Cumartesi günü zirve yaptın."' },
    { key: 'quotesEyebrow', label: 'Alıntılar bölüm etiketi', group: 'Alıntılar', hint: 'Bar chart altındaki 3-quote galerisinin üst etiketi. Örnek: "Bu haftanın sözleri".' },
    { key: 'aspectFood', label: '"Yemek" aspect etiketi', group: 'Alıntılar', hint: 'Sentiment aspect score 3-grid\'in 1. hücresi. Sayısal score altında. Örnek: "Yemek".' },
    { key: 'aspectService', label: '"Servis" aspect etiketi', group: 'Alıntılar', hint: 'Sentiment aspect score 3-grid\'in 2. hücresi. Örnek: "Servis".' },
    { key: 'aspectAtm', label: '"Atmosfer" aspect etiketi', group: 'Alıntılar', hint: 'Sentiment aspect score 3-grid\'in 3. hücresi. Örnek: "Atmosfer".' },
    { key: 'cta', label: 'Birincil CTA', group: 'Footer', hint: 'Mail\'in altındaki büyük lime buton — dashboard\'a yönlendirir. Örnek: "Panele git →".' },
    { key: 'detailLabel', label: 'Detay kart başlığı', group: 'Footer', hint: 'CTA üstündeki lime-soft side-by-side kart\'ın başlığı. Örnek: "Detaylı analiz seni bekliyor."' },
    { key: 'detailSub', label: 'Detay kart açıklaması', group: 'Footer', multiline: true, hint: 'Detay kartının başlık altındaki gri açıklama metni. Örnek: "Heatmap, sentiment ve aspect kırılımı panelde."' },
  ],
  'customer-reply': [
    { key: 'headerEyebrow', label: 'Üst eyebrow', group: 'Etiketler', hint: 'Hero kartı üstündeki lime-soft bandın etiketi. Örnek: "Sana özel · Kişisel yanıt".' },
    { key: 'ownerLabel', label: 'İşletmeci rozeti', group: 'Etiketler', hint: 'Restoran kartında, işletmeci avatar harfinin altındaki küçük mono rozet. Örnek: "İŞLETMECİ".' },
    { key: 'titleA', label: 'Başlık 1. parça', group: 'Başlık', placeholders: MAIL_PLACEHOLDERS['customer-reply'], hint: 'Hero büyük başlığın 1. parçası — virgüllü selamlama. "${customerFirstName}" runtime\'da müşteri ismiyle dolar. Örnek: "${customerFirstName},".' },
    { key: 'titleSubA', label: 'Başlık 2. parça', group: 'Başlık', hint: 'Başlığın selamlamadan sonraki 2. kelimesi/parçası. Örnek: "bizi".' },
    { key: 'titleSubItalic', label: 'Başlık italic kelime', group: 'Başlık', hint: 'Başlığın ortasındaki italic vurgu kelimesi. Örnek: "duyduğun için".' },
    { key: 'titleSubB', label: 'Başlık 4. parça', group: 'Başlık', hint: 'Başlığın son kelimesi. Örnek: "teşekkürler".' },
    { key: 'actionsEyebrow', label: 'Aksiyonlar kart etiketi', group: 'Aksiyonlar', hint: 'Mektup gövdesinden sonraki "aldığımız aksiyonlar" listesinin üst etiketi. params.actions geçirilmediğinde tüm aksiyon kartı gizlenir. Örnek: "Aldığımız aksiyonlar".' },
    { key: 'couponEyebrow', label: 'Kupon kart etiketi', group: 'Kupon', hint: 'Aksiyonlardan sonraki graphite kupon kartının üst etiketi. params.couponCode geçirilmediğinde kart gizlenir. Örnek: "Sana küçük bir özür".' },
    { key: 'couponTitle', label: 'Kupon başlığı', group: 'Kupon', multiline: true, placeholders: MAIL_PLACEHOLDERS['customer-reply'], hint: 'Kupon kartının ana başlığı — kupon değerini söyler. \\n ile satır kırılır. Örnek: "Bir sonraki ziyaretinde\\nkahveler bizden."' },
    { key: 'couponDescDefault', label: 'Kupon açıklaması (default)', group: 'Kupon', multiline: true, hint: 'Kupon kartının başlık altındaki açıklama metni — params.couponBody geçilmediğinde fallback. Örnek: "Aşağıdaki kodu kasada göster ..."' },
    { key: 'couponLabelDefault', label: 'Kupon kod etiketi (default)', group: 'Kupon', hint: 'Kupon kodu satırının sol etiketi — params.couponLabel geçilmediğinde fallback. Örnek: "Kuponun".' },
    { key: 'daysSuffix', label: 'Gün sayısı suffix', group: 'Kupon', hint: 'Kupon kodu satırının sağındaki "30 gün" suffix\'i. Sayı runtime\'da, bu sadece "gün" kelimesi. Örnek: "gün".' },
    { key: 'callEyebrow', label: 'Telefon kartı etiketi', group: 'İletişim', hint: 'Mail sonundaki 2x1 iletişim grid\'inin sol kartı (telefon) etiketi. Örnek: "Direkt ara".' },
    { key: 'mapsEyebrow', label: 'Yol tarifi kart etiketi', group: 'İletişim', hint: 'Mail sonundaki 2x1 iletişim grid\'inin sağ kartı (Maps) etiketi. Örnek: "Yol tarifi".' },
    { key: 'sentLine', label: 'Footer Buaze disclosure 1', group: 'Footer', locked: true, lockReason: 'KVKK / GDPR: Buaze gönderim açıklaması — şeffaflık zorunluluğu', hint: 'Mail\'in en altındaki Buaze attribution satırının ilk parçası. Örnek: "Bu yanıt".' },
    { key: 'sentSuffix', label: 'Footer Buaze disclosure 2', group: 'Footer', locked: true, lockReason: 'KVKK / GDPR: Buaze gönderim açıklaması — şeffaflık zorunluluğu', hint: 'Buaze attribution satırının "Buaze" link\'inden sonraki son parçası. Örnek: "ile gönderildi".' },
  ],
};

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Hoş geldin',
  newsletter: 'Aylık bülten',
  'trial-ending': 'Deneme bitiyor',
  'forgot-password': 'Şifre sıfırlama',
  'low-rating-alert': 'Düşük puan uyarısı',
  'new-review': 'Yeni 5★ yorum',
  'weekly-report': 'Haftalık rapor',
  'customer-reply': 'Müşteri yanıtı',
  'form-confirmation': 'Form onayı',
};

interface Props {
  templateKey: string;
  locale: string;
}

export default function MailTemplateEditor({ templateKey, locale }: Props) {
  // form-confirmation has 4 nested formType variants — its own editor with
  // tab UI, separate state per variant, save round-trips all 4 in one PATCH.
  // Branching here keeps the flat editor (8 templates) untouched.
  if (templateKey === 'form-confirmation') {
    return <FormConfirmationEditor locale={locale} />;
  }
  return <FlatTemplateEditor templateKey={templateKey} locale={locale} />;
}

function FlatTemplateEditor({ templateKey, locale }: Props) {
  const router = useRouter();
  const fields = FIELDS_BY_TEMPLATE[templateKey] ?? [];
  const isEnglish = locale === 'en';

  const [content, setContent] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`);
        if (res.status === 404) {
          if (alive) {
            setSeeded(false);
            setLoading(false);
          }
          return;
        }
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Yüklenemedi');
        const dbContent = (body.template?.content as Record<string, string>) ?? {};
        const stringContent: Record<string, string> = {};
        for (const f of fields) {
          // Locked fields never round-trip through the form: the inline
          // default is always the source of truth, so leaving state empty
          // keeps the PATCH payload minimal (server strips anyway, but
          // sending nothing means slow networks see no flicker).
          if (f.locked) continue;
          stringContent[f.key] = typeof dbContent[f.key] === 'string' ? dbContent[f.key] : '';
        }
        setContent(stringContent);
        setSeeded(true);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // `reloadKey` re-fetches after revert; `fields` is stable per template.
  }, [templateKey, locale, fields, reloadKey]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'invalid_placeholder' && body.field && Array.isArray(body.invalid)) {
          throw new Error(
            `"${body.field}" alanında geçersiz placeholder: ${body.invalid.map((p: string) => `\${${p}}`).join(', ')}. İzin verilenler: ${(body.allowed ?? []).map((p: string) => `\${${p}}`).join(', ') || '(yok)'}`,
          );
        }
        if (body.error === 'invalid_field_length' && body.field) {
          if (body.reason === 'too_long') {
            throw new Error(`"${body.field}" alanı çok uzun: ${body.actual} karakter (max ${body.max}).`);
          }
          if (body.reason === 'too_short') {
            throw new Error(`"${body.field}" alanı çok kısa: ${body.actual} karakter (min ${body.min}).`);
          }
        }
        throw new Error(body.error || 'Kayıt başarısız');
      }
      setSeeded(true);
      setInfo('Kayıt başarılı — değişiklik 1 dakika içinde tüm gönderimlere yansır.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRevert = async () => {
    if (!confirm('Tüm bu içeriği silip kod-içi varsayılana dönmek istediğine emin misin?')) return;
    setReverting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Silme başarısız');
      }
      setContent(Object.fromEntries(fields.map((f) => [f.key, ''])));
      setSeeded(false);
      setInfo('Varsayılana döndürüldü. Sonraki mail kod-içi default ile gider.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReverting(false);
    }
  };

  const onPreview = () => {
    window.open(`/api/dev/email-preview?template=${templateKey}&locale=${locale}`, '_blank');
  };

  const onTestMail = async () => {
    setSendingTest(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey, locale }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Test mail gönderimi başarısız');
      setInfo(`Test mail gönderildi: ${body.to}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between">
        <Link href="/admin/mail-templates" className="inline-flex items-center gap-2 text-xs font-semibold text-[#525252] hover:text-[#0A0A0A]">
          <ArrowLeft size={14} />
          Mail İçeriklerine dön
        </Link>
        <span className="pulse-eyebrow rounded-full bg-[#FAFAFA] px-3 py-1 text-[#525252]">{locale.toUpperCase()}</span>
      </div>

      <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <p className="pulse-eyebrow text-[#737373]">MAIL İÇERİĞİ / {templateKey.toUpperCase()}</p>
        <h1 className="mt-1 flex items-center gap-3 text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)' }}>
          <Mail size={20} strokeWidth={2} />
          {TEMPLATE_LABELS[templateKey] ?? templateKey} · {isEnglish ? 'English' : 'Türkçe'}
        </h1>
        <div className="mt-2 space-y-1.5 text-[13px] sm:text-[14px] text-[#525252]">
          <p>
            Alanlar gruplara bölündü — her alanın yanında <strong>mailde nereye düştüğü</strong> açıklamalı.
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[#737373]">
            <li>Boş bıraktığın alanlar otomatik <strong>kod-içi varsayılan</strong> kullanır.</li>
            <li>Değişiklikler <strong>1 dakika içinde</strong> tüm gönderimlere yansır (cache TTL).</li>
            <li><code className="font-mono text-[11px]">{'${firstName}'}</code> gibi placeholder'lar runtime'da değişir — chip'lerden ekleyebilirsin.</li>
            <li>Yanlışlıkla bozarsan <strong>"Geçmiş"</strong> butonundan eski sürümlere geri dönebilirsin.</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      )}
      {info && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-4 text-xs font-semibold text-[#0A0A0A]">{info}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
            {(() => {
              // Group fields by `group` while preserving original order.
              // Fields without a group fall into a single "Diğer" bucket
              // so legacy templates don't break.
              const groups: Array<{ name: string; items: typeof fields }> = [];
              for (const f of fields) {
                const name = f.group ?? 'Diğer';
                let g = groups.find((x) => x.name === name);
                if (!g) {
                  g = { name, items: [] };
                  groups.push(g);
                }
                g.items.push(f);
              }
              return groups.map((g, i) => (
                <section
                  key={g.name}
                  className={i === 0 ? '' : 'mt-6 border-t border-[#EDEDED] pt-6'}
                >
                  <h3 className="mb-3 flex items-baseline gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#525252]">
                    <span>{g.name}</span>
                    <span className="text-[10px] font-normal tracking-normal text-[#9CA3AF] normal-case">
                      · {g.items.length} alan
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {g.items.map((f) => (
                      <MailFieldInput
                        key={f.key}
                        field={f}
                        value={content[f.key] ?? ''}
                        onChange={(next) => setContent((c) => ({ ...c, [f.key]: next }))}
                      />
                    ))}
                  </div>
                </section>
              ));
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <Eye size={14} /> Önizle
              </button>
              <button
                type="button"
                onClick={onTestMail}
                disabled={sendingTest}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Test mail at
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <History size={14} /> Geçmiş
              </button>
              {seeded && (
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={reverting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 active:scale-95 disabled:opacity-50"
                >
                  {reverting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Varsayılana dön
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-5 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </>
      )}

      <MailRevisionHistory
        templateKey={templateKey}
        locale={locale}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReverted={() => {
          // Revert applied DB-side; re-fetch the editor's content so the
          // form reflects the reverted state without a hard reload.
          setReloadKey((k) => k + 1);
          setInfo('Geri dönüş başarılı — içerik yenilendi.');
        }}
      />
    </div>
  );
}
