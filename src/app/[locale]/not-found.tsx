import BrandedNotFound from '@/components/marketing/BrandedNotFound';

// notFound() from a page in this segment renders here, inside the segment's
// root layout (unmatched URLs use app/global-not-found.tsx instead).
export default function NotFound() {
  return <BrandedNotFound />;
}
