'use client';

import LeadsTable from '@/components/shared/LeadsTable';

export default function AdminLeadsPage() {
  return (
    <LeadsTable 
      apiPath="/api/feedback"
      title="Tüm Müşteri Listesi"
      subtitle="Sistemdeki tüm restoranlardan toplanan müşteri iletişim bilgileri."
      isSuperAdmin={true}
    />
  );
}
