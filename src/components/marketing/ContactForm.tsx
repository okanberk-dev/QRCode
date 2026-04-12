'use client';

import { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

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

      if (res.ok) {
        setSent(true);
        if (formRef.current) formRef.current.reset();
      } else {
        setError(t.contact_form_submit + ' başarısız oldu.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 relative z-10 transition-transform hover:scale-[1.01] duration-500">
        {sent ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <Send size={40} />
            </div>
            <h3 className="text-3xl font-black">{t.contact_success_title}</h3>
            <p className="text-gray-500 font-bold">{t.contact_success_desc}</p>
            <button onClick={() => setSent(false)} className="text-sm font-black text-[#79C5D1] hover:underline">
              {t.contact_success_again}
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.contact_form_name}</label>
                <input
                  required
                  name="name"
                  type="text"
                  id="contact-name"
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
                  placeholder={t.contact_name_placeholder}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.contact_form_email}</label>
                <input
                  required
                  name="email"
                  type="email"
                  id="contact-email"
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
                  placeholder={t.contact_email_placeholder}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.contact_form_business}</label>
              <input
                type="text"
                name="business"
                id="contact-business"
                className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
                placeholder={t.contact_business_placeholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t.contact_form_message}</label>
              <textarea
                required
                name="message"
                rows={5}
                id="contact-message"
                className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm resize-none"
                placeholder={t.contact_message_placeholder}
              />            </div>
            <button
              type="submit"
              id="contact-submit-btn"
              disabled={loading}
              className="w-full py-5 bg-[#111827] text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {t.contact_form_submit}
            </button>
          </form>
        )}
      </div>
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#FDBF1D]/5 blur-[80px] rounded-full -z-10" />
    </div>
  );
}
