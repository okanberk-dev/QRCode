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
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      business: formData.get('business'),
      message: formData.get('message'),
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
    </div>
  );
}
