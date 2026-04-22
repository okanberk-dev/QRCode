'use client';

import { useState, useRef } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

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

export default function ContactForm({ t, locale }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [modal, setModal] = useState<'kvkk' | 'marketing' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      business: formData.get('business'),
      message: formData.get('message'),
      kvkk: formData.get('kvkk') === 'on',
      marketing: formData.get('marketing') === 'on',
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        if (formRef.current) formRef.current.reset();
      } else {
        setError(responseData.error || 'Bir hata oluştu, lütfen tekrar deneyin.');
      }
    } catch (err: unknown) {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:ring-4 focus:ring-[#F4B400]/10 focus:bg-white outline-none transition-all text-[15px] text-[#1A2332] font-bold placeholder-[#6B7280] shadow-sm focus:shadow-none focus:translate-y-[2px]";
  const labelClass = "block text-[11px] font-black uppercase tracking-[0.18em] text-[#1A2332] mb-2 ml-1";

  return (
    <div className="bg-white rounded-[32px] border-[3px] border-[#1A2332] p-8 sm:p-12 shadow-md">
      {sent ? (
        <div className="py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-[#F4B400]/10 rounded-3xl border-2 border-[#F4B400]/30 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 size={40} className="text-[#F4B400]" />
          </div>
          <div className="space-y-3">
            <h3 className="text-[24px] font-black text-[#1A2332] tracking-tighter">{t.contact_success_title}</h3>
            <p className="text-[15px] font-bold text-[#2A3444] max-w-sm mx-auto">{t.contact_success_desc}</p>
          </div>
          <button
            onClick={() => setSent(false)}
            className="text-[14px] font-black text-[#F4B400] hover:text-[#1A2332] underline decoration-2 underline-offset-8 transition-colors"
          >
            {t.contact_success_again}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-7">
          {error && (
            <div className="bg-red-50 text-red-600 border-2 border-red-500/20 px-5 py-4 rounded-xl text-[14px] font-bold shadow-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>{t.contact_form_name}</label>
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
              <label className={labelClass}>{t.contact_form_email}</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>{t.contact_form_business}</label>
              <input
                type="text"
                name="business"
                id="contact-business"
                className={inputClass}
                placeholder={t.contact_business_placeholder}
              />
            </div>
            <div>
              <label className={labelClass}>TELEFON NUMARASI / PHONE</label>
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
            <label className={labelClass}>{t.contact_form_message}</label>
            <textarea
              required
              name="message"
              rows={5}
              id="contact-message"
              className={`${inputClass} resize-none`}
              placeholder={t.contact_message_placeholder}
            />
          </div>

          <div className="space-y-4 pt-3">
            <div 
              onClick={() => setKvkkChecked(!kvkkChecked)}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                kvkkChecked 
                  ? 'bg-[#F4B400]/10 border-[#F4B400]/20 shadow-sm' 
                  : 'bg-white border-[#1A2332]/5 hover:border-[#1A2332]/10'
              }`}
            >
              <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${
                kvkkChecked ? 'bg-[#1A2332] border-[#1A2332]' : 'bg-white border-[#1A2332]'
              }`}>
                {kvkkChecked && <CheckCircle2 size={14} className="text-white" strokeWidth={4} />}
              </div>
              <div className="flex-1">
                <label htmlFor="contact-kvkk" className="text-[12px] font-bold text-[#2A3444] leading-tight cursor-pointer select-none">
                  {locale === 'en' ? (
                    <>I have read and <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal('kvkk'); }} className="text-[#1A2332] underline decoration-[#F4B400] decoration-2 underline-offset-4 hover:bg-[#F4B400]/10 transition-colors">accept</span> the processing of my personal data under the Privacy Policy.</>
                  ) : (
                    <><span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal('kvkk'); }} className="text-[#1A2332] underline decoration-[#F4B400] decoration-2 underline-offset-4 hover:bg-[#F4B400]/10 transition-colors">KVKK ve Gizlilik Politikası</span> kapsamında kişisel verilerimin işlenmesini okudum ve kabul ediyorum.</>
                  )}
                </label>
              </div>
            </div>
            <div className="flex items-start gap-4 px-4">
              <input
                type="checkbox"
                name="marketing"
                id="contact-marketing"
                className="mt-1 w-5 h-5 rounded border-2 border-[#1A2332] text-[#1A2332] focus:ring-[#F4B400] accent-[#F4B400] cursor-pointer"
              />
              <label htmlFor="contact-marketing" className="text-[12px] font-bold text-[#6B7280] leading-tight cursor-pointer">
                {locale === 'en' ? (
                  <>I agree to receive <span onClick={(e) => { e.preventDefault(); setModal('marketing'); }} className="text-[#1A2332] underline decoration-2 underline-offset-4 hover:bg-[#F4B400]/10 transition-colors">commercial electronic messages</span> regarding campaigns, announcements, and updates.</>
                ) : (
                  <>Kampanya, duyuru ve yenilikler hakkında <span onClick={(e) => { e.preventDefault(); setModal('marketing'); }} className="text-[#1A2332] underline decoration-2 underline-offset-4 hover:bg-[#F4B400]/10 transition-colors">ticari elektronik ileti</span> almayı kabul ediyorum.</>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            id="contact-submit-btn"
            disabled={loading || !kvkkChecked}
            className={`w-full py-5 bg-[#F4B400] text-[#1A2332] font-black text-[16px] uppercase tracking-[0.1em] rounded-2xl border-[3px] border-[#1A2332] flex items-center justify-center gap-3 transition-all ${
              !kvkkChecked ? 'opacity-40 cursor-not-allowed grayscale' : 'shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={2} /> : <Send size={20} strokeWidth={2} />}
            {t.contact_form_submit}
          </button>
        </form>
      )}

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1A2332]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#F8F6F1] rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border-[3px] border-[#1A2332] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b-3 border-[#1A2332] flex items-center justify-between bg-white border-b-[3px]">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-[#F4B400]/10 rounded-2xl text-[#1A2332]">
                    <CheckCircle2 size={24} />
                 </div>
                 <h3 className="text-xl font-black text-[#1A2332] tracking-tighter uppercase">
                   {modal === 'kvkk' 
                     ? (locale === 'en' ? 'Privacy Policy & Terms' : 'KVKK Aydınlatma Metni') 
                     : (locale === 'en' ? 'Commercial Electronic Message Consent' : 'Ticari Elektronik İleti Onayı')}
                 </h3>
              </div>
              <button 
                onClick={() => setModal(null)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#F8F6F1] border-2 border-[#1A2332] hover:bg-white text-[#1A2332] transition-all shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <span className="text-2xl font-black">×</span>
              </button>
            </div>
            <div className="p-10 max-h-[60vh] overflow-y-auto no-scrollbar bg-white">
              <div className="text-[15px] font-bold text-[#2A3444] space-y-6 leading-relaxed">
                {modal === 'kvkk' && (
                  locale === 'en' ? (
                    <>
                      <p><strong>1. Data Controller:</strong> As Buaze (hereinafter referred to as the "Company"), we process your personal data in our capacity as the data controller in accordance with applicable data protection laws, including the GDPR and KVKK.</p>
                      <p><strong>2. Processed Personal Data and Purposes:</strong> Data you provide via our contact forms (such as your name, email, phone number, and message content) is processed strictly for the purposes of evaluating your requests, getting in touch with you, providing necessary support services, and managing our service processes.</p>
                      <p><strong>3. Method and Legal Basis for Data Collection:</strong> Your personal data is collected electronically via our website. This data is processed based on the legal grounds that "processing is necessary for the legitimate interests pursued by the controller" provided that it does not harm the fundamental rights and freedoms of the data subject, and "processing is directly related to the establishment or performance of a contract".</p>
                      <p><strong>4. Transfer of Personal Data:</strong> Your processed personal data may be transferred to authorized public institutions to fulfill legal obligations, and securely to infrastructure/server providers (e.g., data hosting services) we utilize to fulfill our contractual obligations.</p>
                      <p><strong>5. Your Rights:</strong> By applying to the data controller, you have the right to learn whether your personal data is being processed, request information if it has been processed, learn the purpose of the processing, know the third parties to whom it was transferred, request correction of incomplete/incorrect data, and request its deletion.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>1. Veri Sorumlusunun Kimliği:</strong> Buaze olarak (bundan böyle “Şirket” olarak anılacaktır), 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.</p>
                      <p><strong>2. İşlenen Kişisel Verileriniz ve İşlenme Amaçları:</strong> Ad soyad, e-posta, telefon numarası ve mesaj içeriği gibi bize iletişim formu aracılığıyla ilettiğiniz verileriniz; taleplerinizin değerlendirilmesi, sizinle iletişime geçilmesi, gerekli destek hizmetinin sağlanması ve hizmet süreçlerimizin yürütülmesi amaçlarıyla sınırlı olarak işlenmektedir.</p>
                      <p><strong>3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi:</strong> Kişisel verileriniz, web sitemizde yer alan Formlar aracılığıyla elektronik ortamda toplanmaktadır. Bu veriler KVKK madde 5/2 uyarınca "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması" ve "bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" hukuki sebeplerine dayanılarak işlenmektedir.</p>
                      <p><strong>4. Kişisel Verilerin Aktarımı:</strong> İşlenen kişisel verileriniz, yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları ile sözleşmesel yükümlülüklerimizin ifası için hizmet aldığımız altyapı/sunucu sağlayıcılarına (örnek: veri barındırma hizmetleri) KVKK md. 8 ve 9 çerçevesinde aktarılabilecektir.</p>
                      <p><strong>5. Haklarınız:</strong> KVKK madde 11 uyarınca, veri sorumlusuna başvurarak kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı 3. kişileri bilme, eksik/yanlış düzeltilmesini isteme, silinmesini isteme hakkına sahipsiniz.</p>
                    </>
                  )
                )}
                {modal === 'marketing' && (
                  locale === 'en' ? (
                    <>
                      <p>In accordance with applicable laws, you hereby give your consent for our Company (Buaze) to send commercial electronic messages via methods such as SMS, email, or direct calling to the contact address you have provided through the contact form, in order to inform you about campaigns, promotions, announcements, and new features related to our products and services.</p>
                      <p>Your contact information will be processed strictly for this purpose and utilized exclusively in marketing or promotional activities. You consent in advance to its transfer to reliable business partners we collaborate with for infrastructure, technical support, and message delivery processes (solely for the purpose of sending newsletters and announcements).</p>
                      <p>You can revoke this consent and stop the messages entirely free of charge at any time without giving any reason. You can exercise your opt-out right by clicking the "Unsubscribe" link at the bottom of the emails sent to you or by contacting us directly.</p>
                    </>
                  ) : (
                    <>
                      <p>Bize iletişim formu üzerinden sağlamış olduğunuz iletişim adresinize, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca Şirketimiz (Buaze) tarafından sunulan ürün ve hizmetlerle ilgili kampanyalar, promosyonlar, duyurular ve yeni özellikler hakkında bilgilendirme yapılması amacıyla SMS, e-posta veya arama gibi yöntemlerle ticari elektronik ileti gönderilmesine onay vermektesiniz.</p>
                      <p>İletişim bilgileriniz sadece bu amaca yönelik olarak işlenecek ve pazarlama veya tanıtım faaliyetlerinde kullanılacaktır. Altyapı, teknik destek ve ileti gönderimi süreçlerinde iş birliği yaptığımız güvenilir iş ortaklarına aktarılmasına (salt bülten ve duyuru gönderme amacıyla) peşinen muvafakat ediyorsunuz.</p>
                      <p>Bu onayı istediğiniz zaman hiçbir gerekçe göstermeksizin iptal edebilir ve iletilerin size gönderilmesini ücretsiz olarak durdurabilirsiniz. Reddetme hakkınızı size gönderilen e-postaların altındaki "Abonelikten Çık" (Unsubscribe) linkine tıklayarak veya doğrudan tarafımıza ulaşarak kullanabilirsiniz.</p>
                    </>
                  )
                )}
              </div>
            </div>
            <div className="p-8 bg-[#F8F6F1] border-t-[3px] border-[#1A2332] flex justify-end">
              <button 
                onClick={() => setModal(null)}
                className="w-full py-5 bg-[#1A2332] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {locale === 'en' ? 'I UNDERSTAND' : 'ANLADIM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
