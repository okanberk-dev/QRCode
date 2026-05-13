import { redirect } from 'next/navigation';

// /admin/audits hub — şu an direct list'e yönlendiriyor. İleride dashboard
// (template kullanımı + popüler şablonlar + ortalama skor) eklenecek.
export default function AuditsIndexPage() {
  redirect('/admin/audits/templates');
}
