'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';

type AdminLocale = 'tr' | 'en';

interface AdminTranslationContextType {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  t: (key: string) => string;
}

const adminTranslations = {
  tr: {
    dashboard: 'Dashboard',
    restaurants: 'Restoranlar',
    qr_codes: 'QR Kodlar',
    users: 'Yetkililer',
    customers: 'Müşteriler',
    logout: 'Çıkış Yap',
    system_language: 'Sistem Dili / Language',
    welcome: 'Hoş geldin',
    satisfaction: 'Memnuniyet Oranı',
    manage: 'Yönetim',
    actions: 'Eylemler',
    status: 'Durum',
    active: 'Aktif',
    passive: 'Pasif',
    cancel: 'İptal',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    add_new: 'Yeni Ekle',
    search_placeholder: 'İsim veya e-posta ile ara...',
    latest_feedbacks: 'Son Değerlendirmeler',
    see_all: 'Hepsini Gör',
  },
  en: {
    dashboard: 'Dashboard',
    restaurants: 'Restaurants',
    qr_codes: 'QR Codes',
    users: 'Staff',
    customers: 'Customers',
    logout: 'Log Out',
    system_language: 'Sistem Dili / Language',
    welcome: 'Welcome',
    satisfaction: 'Satisfaction Rate',
    manage: 'Management',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    passive: 'Passive',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add_new: 'Add New',
    search_placeholder: 'Search by name or email...',
    latest_feedbacks: 'Latest Feedbacks',
    see_all: 'See All',
  }
};

const AdminTranslationContext = createContext<AdminTranslationContextType | undefined>(undefined);

export function AdminTranslationProvider({ children, initialLocale = 'tr' }: { children: ReactNode, initialLocale?: string }) {
  const [locale, setLocaleState] = useState<AdminLocale>(initialLocale as AdminLocale);

  const setLocale = (newLocale: AdminLocale) => {
    setLocaleState(newLocale);
    document.cookie = `ADMIN_LOCALE=${newLocale}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const t = (key: string) => {
    return (adminTranslations as any)[locale]?.[key] || key;
  };

  return (
    <AdminTranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </AdminTranslationContext.Provider>
  );
}

export function useAdminTranslation() {
  const context = useContext(AdminTranslationContext);
  if (!context) {
    throw new Error('useAdminTranslation must be used within an AdminTranslationProvider');
  }
  return context;
}
