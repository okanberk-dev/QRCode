'use client';

import { useState, useEffect } from 'react';

const dictionaries = {
  tr: {
    restaurant_name: process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Mamma's Burger",
    subtitle: "Bizi değerlendirin, deneyiminizi bizimle paylaşın",
    how_was_it: "Nasıl buldunuz?",
    share_experience: "Deneyiminizi paylaşın",
    feedback_reason: "Size daha iyi hizmet verebilmemiz için görüşleriniz çok değerli.",
    comment_label: "Yorumunuz",
    comment_placeholder: "Neyi daha iyi yapabilirdik?",
    name_label: "Ad Soyad",
    name_placeholder: "Adınız Soyadınız",
    phone_label: "Telefon",
    phone_placeholder: "05XX XXX XX XX",
    email_label: "E-posta",
    email_placeholder: "ornek@email.com",
    optional: "(İsteğe bağlı)",
    send: "Gönder",
    sending: "Gönderiliyor...",
    kvkk_consent_pt1: "Kişisel verilerimin işlenmesine ilişkin ",
    kvkk_link: "KVKK Aydınlatma Metni",
    kvkk_consent_pt2: "'ni ve ",
    acik_riza_link: "Açık Rıza Metni",
    kvkk_consent_pt3: "'ni okudum, kabul ediyorum.",
    marketing_consent_pt1: "Mamma's Burger tarafından sunulan kampanya, indirim ve fırsatlardan haberdar olmak için tarafıma ",
    marketing_link: "Ticari Elektronik İleti",
    marketing_consent_pt2: " gönderilmesini (SMS/E-posta) onaylıyorum.",
    thank_you: "Teşekkür Ederiz!",
    thank_you_high: "Güzel puanlamanız için çok teşekkürler! Bizi mutlu ettiniz.",
    thank_you_low: "Geri bildiriminiz başarıyla alındı. Kendimizi geliştirmek için mesajınızı dikkate alacağız.",
    google_review_btn: "Google'da Yorum Yap",
    direct_google_text: "Bizi doğrudan Google Haritalar üzerinde de değerlendirebilirsiniz:",
    privacy: "Gizlilik Politikası",
    kvkk: "KVKK",
    error_comment_required: "Lütfen yorumunuzu belirtin.",
    error_generic: "Bir hata oluştu, lütfen tekrar deneyin.",
    error_connection: "Bağlantı hatası. Lütfen internetinizi kontrol edin."
  },
  en: {
    restaurant_name: process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Mamma's Burger",
    subtitle: "Rate us and share your experience",
    how_was_it: "How was your experience?",
    share_experience: "Share your experience",
    feedback_reason: "Your feedback is highly valuable for us to serve you better.",
    comment_label: "Your Comment",
    comment_placeholder: "What could we have done better?",
    name_label: "Full Name",
    name_placeholder: "John Doe",
    phone_label: "Phone",
    phone_placeholder: "Your phone number",
    email_label: "Email",
    email_placeholder: "example@email.com",
    optional: "(Optional)",
    send: "Submit",
    sending: "Submitting...",
    kvkk_consent_pt1: "I have read and accept the ",
    kvkk_link: "Data Protection Notice",
    kvkk_consent_pt2: " and ",
    acik_riza_link: "Explicit Consent Text",
    kvkk_consent_pt3: " regarding the processing of my personal data.",
    marketing_consent_pt1: "I agree to receive ",
    marketing_link: "Commercial Electronic Messages",
    marketing_consent_pt2: " (SMS/Email) about campaigns, discounts, and offers from Mamma's Burger.",
    thank_you: "Thank You!",
    thank_you_high: "Thank you so much for your great rating! You made our day.",
    thank_you_low: "Your feedback has been successfully received. We will consider your message to improve ourselves.",
    google_review_btn: "Review on Google",
    direct_google_text: "You can also review us directly on Google Maps:",
    privacy: "Privacy Policy",
    kvkk: "Data Policy",
    error_comment_required: "Please provide your comment.",
    error_generic: "An error occurred, please try again.",
    error_connection: "Connection error. Please check your internet."
  },
  ar: {
    restaurant_name: process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Mamma's Burger",
    subtitle: "يرجى تقييمنا ومشاركة تجربتك",
    how_was_it: "كيف كانت تجربتك؟",
    share_experience: "شارك تجربتك",
    feedback_reason: "ملاحظاتك قيمة جداً بالنسبة لنا لنقدم لك خدمة أفضل.",
    comment_label: "تعليقك",
    comment_placeholder: "ما الذي كان بإمكاننا القيام به بشكل أفضل؟",
    name_label: "الاسم الكامل",
    name_placeholder: "الاسم",
    phone_label: "رقم الهاتف",
    phone_placeholder: "رقم هاتفك",
    email_label: "البريد الإلكتروني",
    email_placeholder: "مثال@البريد.com",
    optional: "(اختياري)",
    send: "إرسال",
    sending: "جاري الإرسال...",
    kvkk_consent_pt1: "لقد قرأت وأوافق على ",
    kvkk_link: "إشعار حماية البيانات",
    kvkk_consent_pt2: " و ",
    acik_riza_link: "نص الموافقة الصريحة",
    kvkk_consent_pt3: " بخصوص معالجة بياناتي الشخصية.",
    marketing_consent_pt1: "أوافق على تلقي ",
    marketing_link: "الرسائل الإلكترونية التجارية",
    marketing_consent_pt2: " (رسائل قصيرة/بريد إلكتروني) حول الحملات والخصومات والعروض من ماما برجر.",
    thank_you: "شكراً لك!",
    thank_you_high: "شكراً جزيلاً لتقييمك الرائع! لقد أسعدتنا.",
    thank_you_low: "تم استلام ملاحظاتك بنجاح. سنأخذ رسالتك بعين الاعتبار لتحسين خدماتنا.",
    google_review_btn: "تقييم على جوجل",
    direct_google_text: "يمكنك أيضاً تقييمنا مباشرة على خرائط جوجل:",
    privacy: "سياسة الخصوصية",
    kvkk: "سياسة البيانات",
    error_comment_required: "يرجى كتابة تعليقك.",
    error_generic: "حدث خطأ، يرجى المحاولة مرة أخرى.",
    error_connection: "خطأ في الاتصال. يرجى التحقق من الإنترنت الخاص بك."
  }
};

export type Language = 'tr' | 'en' | 'ar';

export function useTranslation() {
  const [lang, setLang] = useState<Language>('tr');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    
    if (paramLang && ['tr', 'en', 'ar'].includes(paramLang)) {
      setLang(paramLang as Language);
      return;
    }

    const browserLang = navigator.language.toLowerCase();
    
    if (browserLang.startsWith('ar')) {
      setLang('ar');
    } else if (browserLang.startsWith('en')) {
      setLang('en');
    } else if (!browserLang.startsWith('tr')) {
      // For any generic languages (German, Russian etc.) default to English
      setLang('en');
    }
  }, []);

  return { 
    t: dictionaries[lang], 
    lang, 
    mounted,
    isRtl: lang === 'ar'
  };
}
