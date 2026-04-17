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
}

export default function ContactForm({ t }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
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

  const inputClass = "w-full px-4 py-3 bg-[#F7F4F0] rounded-lg border border-[#e8e4de] focus:border-[#FDBF1D] focus:ring-2 focus:ring-[#FDBF1D]/10 focus:bg-white outline-none transition-all text-[14px] text-[#1f1e1d] placeholder-[#ada89f]";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-widest text-[#ada89f] mb-1.5";

  return (
    <div className="bg-white rounded-xl border border-[#e8e4de] p-7 sm:p-9">
      {sent ? (
        <div className="py-12 text-center space-y-5">
          <div className="w-14 h-14 bg-[#FDBF1D]/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-[#FDBF1D]" />
          </div>
          <h3 className="text-[20px] font-extrabold text-[#1f1e1d]">{t.contact_success_title}</h3>
          <p className="text-[14px] text-[#6b6760]">{t.contact_success_desc}</p>
          <button
            onClick={() => setSent(false)}
            className="text-[13px] font-semibold text-[#FDBF1D] hover:underline underline-offset-4"
          >
            {t.contact_success_again}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-lg text-[13px]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                name="kvkk"
                id="contact-kvkk"
                className="mt-1 w-4 h-4 rounded border-2 border-[#1f1e1d] text-[#1f1e1d] focus:ring-[#FDBF1D] accent-[#FDBF1D] cursor-pointer"
              />
              <label htmlFor="contact-kvkk" className="text-[12px] font-medium text-[#6b6760] leading-tight cursor-pointer">
                <span onClick={(e) => { e.preventDefault(); setModal('kvkk'); }} className="font-bold border-b border-[#6b6760] hover:text-[#1f1e1d] hover:border-[#1f1e1d] transition-colors">KVKK ve Gizlilik Politikası</span> kapsamında kişisel verilerimin işlenmesini okudum ve kabul ediyorum.
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="marketing"
                id="contact-marketing"
                className="mt-1 w-4 h-4 rounded border-2 border-[#1f1e1d] text-[#1f1e1d] focus:ring-[#FDBF1D] accent-[#FDBF1D] cursor-pointer"
              />
              <label htmlFor="contact-marketing" className="text-[12px] font-medium text-[#6b6760] leading-tight cursor-pointer">
                Kampanya, duyuru ve yenilikler hakkında <span onClick={(e) => { e.preventDefault(); setModal('marketing'); }} className="font-bold border-b border-[#6b6760] hover:text-[#1f1e1d] hover:border-[#1f1e1d] transition-colors">ticari elektronik ileti</span> almayı kabul ediyorum.
              </label>
            </div>
          </div>

          <button
            type="submit"
            id="contact-submit-btn"
            disabled={loading}
            className="w-full py-3.5 bg-[#FDBF1D] text-[#1f1e1d] font-extrabold text-[15px] rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 active:translate-y-[4px] active:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={16} />}
            {t.contact_form_submit}
          </button>
        </form>
      )}

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
          <div className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl border-[4px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-[#e8e4de] bg-[#F7F4F0]">
              <h3 className="text-xl font-black tracking-tight text-[#111827]">
                {modal === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'Ticari Elektronik İleti Onayı'}
              </h3>
              <button 
                onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border-2 border-[#1f1e1d] hover:bg-[#FDBF1D] transition-colors shadow-[2px_2px_0_0_#1f1e1d]"
              >
                <span className="font-bold leading-none select-none -mt-0.5" style={{ fontSize: '18px' }}>×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-sm font-medium text-[#4a4741] space-y-4 leading-relaxed">
              {modal === 'kvkk' && (
                <>
                  <p><strong>1. Veri Sorumlusunun Kimliği:</strong> Buaze olarak (bundan böyle “Şirket” olarak anılacaktır), 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.</p>
                  <p><strong>2. İşlenen Kişisel Verileriniz ve İşlenme Amaçları:</strong> Ad soyad, e-posta, telefon numarası ve mesaj içeriği gibi bize iletişim formu aracılığıyla ilettiğiniz verileriniz; taleplerinizin değerlendirilmesi, sizinle iletişime geçilmesi, gerekli destek hizmetinin sağlanması ve hizmet süreçlerimizin yürütülmesi amaçlarıyla sınırlı olarak işlenmektedir.</p>
                  <p><strong>3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi:</strong> Kişisel verileriniz, web sitemizde yer alan Formlar aracılığıyla elektronik ortamda toplanmaktadır. Bu veriler KVKK madde 5/2 uyarınca "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması" ve "bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" hukuki sebeplerine dayanılarak işlenmektedir.</p>
                  <p><strong>4. Kişisel Verilerin Aktarımı:</strong> İşlenen kişisel verileriniz, yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları ile sözleşmesel yükümlülüklerimizin ifası için hizmet aldığımız altyapı/sunucu sağlayıcılarına (örnek: veri barındırma hizmetleri) KVKK md. 8 ve 9 çerçevesinde aktarılabilecektir.</p>
                  <p><strong>5. Haklarınız:</strong> KVKK madde 11 uyarınca, veri sorumlusuna başvurarak kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı 3. kişileri bilme, eksik/yanlış düzeltilmesini isteme, silinmesini isteme hakkına sahipsiniz.</p>
                </>
              )}
              {modal === 'marketing' && (
                <>
                  <p>Bize iletişim formu üzerinden sağlamış olduğunuz iletişim adresinize, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca Şirketimiz (Buaze) tarafından sunulan ürün ve hizmetlerle ilgili kampanyalar, promosyonlar, duyurular ve yeni özellikler hakkında bilgilendirme yapılması amacıyla SMS, e-posta veya arama gibi yöntemlerle ticari elektronik ileti gönderilmesine onay vermektesiniz.</p>
                  <p>İletişim bilgileriniz sadece bu amaca yönelik olarak işlenecek ve pazarlama veya tanıtım faaliyetlerinde kullanılacaktır. Altyapı, teknik destek ve ileti gönderimi süreçlerinde iş birliği yaptığımız güvenilir iş ortaklarına aktarılmasına (salt bülten ve duyuru gönderme amacıyla) peşinen muvafakat ediyorsunuz.</p>
                  <p>Bu onayı istediğiniz zaman hiçbir gerekçe göstermeksizin iptal edebilir ve iletilerin size gönderilmesini ücretsiz olarak durdurabilirsiniz. Reddetme hakkınızı size gönderilen e-postaların altındaki "Abonelikten Çık" (Unsubscribe) linkine tıklayarak veya doğrudan tarafımıza ulaşarak kullanabilirsiniz.</p>
                </>
              )}
            </div>
            <div className="flex-shrink-0 p-6 border-t-2 border-[#e8e4de] flex justify-end">
              <button 
                onClick={() => setModal(null)}
                className="px-6 py-2.5 bg-[#111827] text-white font-black text-sm rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] active:shadow-none active:translate-y-[4px] hover:bg-[#1f1e1d] transition-all"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
