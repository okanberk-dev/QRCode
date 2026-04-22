'use client';

import LeadsTable from '@/components/shared/LeadsTable';
import { use } from 'react';

export default function RestaurantLeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  
  return (
    <LeadsTable 
      apiPath="/api/feedback"
      title={locale === 'tr' ? 'Müşteri Listesi' : 'Customer List'}
      subtitle={locale === 'tr' ? 'Size geri bildirim bırakan ve iletişim izni veren müşterileriniz.' : 'Customers who left feedback and gave contact consent.'}
      isSuperAdmin={false}
    />
  );
}
