'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Loader2, Check, X } from 'lucide-react';
import { getRecaptchaToken, preloadRecaptcha } from '@/lib/recaptcha-client';

interface ContactFormProps {
  t: {
    contact_form_name: string;
    contact_form_email: string;
    contact_form_business: string;
    contact_form_message: string;
    contact_form_submit: string;
    contact_success_title: string;
    contact_success_desc: string;
    contact_success_again: string;
    contact_name_placeholder: string;
    contact_email_placeholder: string;
    contact_business_placeholder: string;
    contact_message_placeholder: string;
  };
  locale: string;
}

const MIN_FILL_MS = 2500;

export default function ContactForm({ t, locale }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [modal, setModal] = useState<'kvkk' | 'marketing' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtRef = useRef<number>(Date.now());
  const isTr = locale !== 'en';

  useEffect(() => {
    preloadRecaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const honeypot = (formData.get('website') as string) || '';
    const elapsed = Date.now() - renderedAtRef.current;

    if (honeypot.trim() !== '' || elapsed < MIN_FILL_MS) {
      setSent(true);
      setLoading(false);
      if (formRef.current) formRef.current.reset();
      return;
    }

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      business: formData.get('business'),
      message: formData.get('message'),
      kvkk: formData.get('kvkk') === 'on',
      marketing: formData.get('marketing') === 'on',
      website: honeypot,
      renderedAt: renderedAtRef.current,
    };

    try {
      const recaptchaToken = await getRecaptchaToken('contact_submit');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });
      const responseData = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        if (formRef.current) formRef.current.reset();
      } else {
        setError(responseData.error || (isTr ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'Something went wrong, please try again.'));
      }
    } catch {
      setError(isTr ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'min-h-[44px] w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]';
  const labelClass = 'pulse-eyebrow text-[#737373] ml-1 mb-2 block';

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10">
      {sent ? (
        <div className="py-14 text-center space-y-5">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em]">
              {t.contact_success_title}
            </h3>
            <p className="text-[14px] text-[#525252] max-w-sm mx-auto leading-relaxed">
              {t.contact_success_desc}
            </p>
          </div>
          <button
            onClick={() => setSent(false)}
            className="pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            {t.contact_success_again}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {error && (
            <div className="bg-[#FEF2F2] text-[#B91C1C] px-4 py-3 rounded-xl text-[13px] font-medium border border-[#FECACA]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className={labelClass}>
                {t.contact_form_name}
              </label>
              <input
                required
                name="name"
                type="text"
                id="contact-name"
                className={inputClass}
                placeholder={t.contact_name_placeholder}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={labelClass}>
                {t.contact_form_email}
              </label>
              <input
                required
                name="email"
                type="email"
                id="contact-email"
                className={inputClass}
                placeholder={t.contact_email_placeholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-business" className={labelClass}>
                {t.contact_form_business}
              </label>
              <input
                type="text"
                name="business"
                id="contact-business"
                className={inputClass}
                placeholder={t.contact_business_placeholder}
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className={labelClass}>
                {isTr ? 'TELEFON' : 'PHONE'}
              </label>
              <input
                type="tel"
                name="phone"
                id="contact-phone"
                className={inputClass}
                placeholder="+90 (5XX) XXX XX XX"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-message" className={labelClass}>
              {t.contact_form_message}
            </label>
            <textarea
              required
              name="message"
              rows={5}
              id="contact-message"
              className={`${inputClass} resize-none`}
              placeholder={t.contact_message_placeholder}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div
              onClick={() => setKvkkChecked(!kvkkChecked)}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                kvkkChecked ? 'bg-[#EAF9B8] border-[#C6F24E]' : 'bg-white border-[#EDEDED] hover:border-[#D4D4D4]'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                  kvkkChecked ? 'bg-[#0A0A0A]' : 'bg-white border border-[#D4D4D4]'
                }`}
              >
                {kvkkChecked && <Check size={12} className="text-[#C6F24E]" strokeWidth={3.5} />}
              </div>
              <input type="checkbox" name="kvkk" checked={kvkkChecked} onChange={() => {}} className="sr-only" />
              <label htmlFor="contact-kvkk" className="text-[12px] font-medium text-[#0A0A0A] leading-relaxed cursor-pointer select-none flex-1">
                {isTr ? (
                  <>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModal('kvkk');
                      }}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      KVKK ve Gizlilik Politikası
                    </span>{' '}
                    kapsamında kişisel verilerimin işlenmesini okudum ve kabul ediyorum.
                  </>
                ) : (
                  <>
                    I have read and{' '}
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModal('kvkk');
                      }}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      accept
                    </span>{' '}
                    the processing of my personal data under the Privacy Policy.
                  </>
                )}
              </label>
            </div>

            <div className="flex items-start gap-3 px-2">
              <input
                type="checkbox"
                name="marketing"
                id="contact-marketing"
                className="mt-1 w-4 h-4 rounded border border-[#D4D4D4] focus:ring-2 focus:ring-[#C6F24E] accent-[#0A0A0A] cursor-pointer"
              />
              <label htmlFor="contact-marketing" className="text-[12px] text-[#525252] leading-relaxed cursor-pointer">
                {isTr ? (
                  <>
                    Kampanya, duyuru ve yenilikler hakkında{' '}
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setModal('marketing');
                      }}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      ticari elektronik ileti
                    </span>{' '}
                    almayı kabul ediyorum.
                  </>
                ) : (
                  <>
                    I agree to receive{' '}
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setModal('marketing');
                      }}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      commercial electronic messages
                    </span>{' '}
                    regarding campaigns, announcements, and updates.
                  </>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            id="contact-submit-btn"
            disabled={loading || !kvkkChecked}
            className={`min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium text-[14px] py-3.5 rounded-full transition-colors ${
              !kvkkChecked || loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A1A1A]'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : <Send size={16} strokeWidth={2} />}
            {t.contact_form_submit}
          </button>
        </form>
      )}

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-[#0A0A0A]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_20px_60px_rgba(10,10,10,0.25)] border border-[#EDEDED] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[#EDEDED] flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0A0A0A] tracking-[-0.01em]">
                {modal === 'kvkk'
                  ? isTr
                    ? 'KVKK Aydınlatma Metni'
                    : 'Privacy Policy & Terms'
                  : isTr
                  ? 'Ticari Elektronik İleti Onayı'
                  : 'Commercial Electronic Message Consent'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#FAFAFA] text-[#737373] hover:text-[#0A0A0A] transition-colors"
                aria-label="Close"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="p-7 max-h-[55vh] overflow-y-auto">
              <div className="text-[13px] text-[#525252] space-y-4 leading-[1.65]">
                {modal === 'kvkk' &&
                  (isTr ? (
                    <>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">1. Veri Sorumlusunun Kimliği:</strong> Buaze
                        olarak (bundan böyle "Şirket" olarak anılacaktır), 6698 sayılı Kişisel Verilerin Korunması
                        Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">2. İşlenen Kişisel Verileriniz ve İşlenme Amaçları:</strong>{' '}
                        Ad soyad, e-posta, telefon numarası ve mesaj içeriği gibi bize iletişim formu aracılığıyla ilettiğiniz verileriniz; taleplerinizin değerlendirilmesi, sizinle iletişime geçilmesi, gerekli destek hizmetinin sağlanması ve hizmet süreçlerimizin yürütülmesi amaçlarıyla sınırlı olarak işlenmektedir.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi:</strong>{' '}
                        Kişisel verileriniz, web sitemizde yer alan Formlar aracılığıyla elektronik ortamda toplanmaktadır. Bu veriler KVKK madde 5/2 uyarınca meşru menfaat ve sözleşmenin kurulması hukuki sebeplerine dayanılarak işlenmektedir.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">4. Kişisel Verilerin Aktarımı:</strong> İşlenen kişisel verileriniz, yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları ile sözleşmesel yükümlülüklerimizin ifası için hizmet aldığımız altyapı/sunucu sağlayıcılarına KVKK md. 8 ve 9 çerçevesinde aktarılabilecektir.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">5. Haklarınız:</strong> KVKK madde 11 uyarınca, veri sorumlusuna başvurarak kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme hakkına sahipsiniz.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">1. Data Controller:</strong> As Buaze (hereinafter the "Company"), we process your personal data in our capacity as the data controller in accordance with applicable data protection laws, including GDPR and KVKK.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">2. Processed Personal Data and Purposes:</strong> Data you provide via our contact forms (name, email, phone, message content) is processed strictly for evaluating your requests, getting in touch, providing support services, and managing our service processes.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">3. Method and Legal Basis:</strong> Your personal data is collected electronically via our website, based on legitimate interest and contract performance legal grounds.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">4. Transfer of Personal Data:</strong> Your processed personal data may be transferred to authorized public institutions to fulfill legal obligations, and securely to infrastructure providers used to fulfill our contractual obligations.
                      </p>
                      <p>
                        <strong className="text-[#0A0A0A] font-medium">5. Your Rights:</strong> You have the right to learn whether your personal data is being processed, request information, correction, and deletion by applying to the data controller.
                      </p>
                    </>
                  ))}
                {modal === 'marketing' &&
                  (isTr ? (
                    <>
                      <p>
                        Bize iletişim formu üzerinden sağlamış olduğunuz iletişim adresinize, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca Şirketimiz (Buaze) tarafından sunulan ürün ve hizmetlerle ilgili kampanyalar, promosyonlar, duyurular ve yeni özellikler hakkında bilgilendirme yapılması amacıyla SMS, e-posta veya arama gibi yöntemlerle ticari elektronik ileti gönderilmesine onay vermektesiniz.
                      </p>
                      <p>
                        İletişim bilgileriniz sadece bu amaca yönelik olarak işlenecek ve pazarlama veya tanıtım faaliyetlerinde kullanılacaktır.
                      </p>
                      <p>
                        Bu onayı istediğiniz zaman hiçbir gerekçe göstermeksizin iptal edebilir ve iletilerin size gönderilmesini ücretsiz olarak durdurabilirsiniz.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        You hereby give your consent for Buaze to send commercial electronic messages via SMS, email, or direct calling to the contact address you provided, in order to inform you about campaigns, promotions, announcements, and new features.
                      </p>
                      <p>
                        Your contact information will be processed strictly for this purpose and utilized exclusively in marketing activities.
                      </p>
                      <p>
                        You can revoke this consent and stop the messages entirely free of charge at any time by clicking the "Unsubscribe" link in our emails or contacting us directly.
                      </p>
                    </>
                  ))}
              </div>
            </div>
            <div className="p-6 border-t border-[#EDEDED] flex justify-end">
              <button
                onClick={() => setModal(null)}
                className="min-h-[48px] w-full py-3.5 bg-[#0A0A0A] text-white rounded-full font-medium text-[14px] hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? 'Anladım' : 'I understand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
