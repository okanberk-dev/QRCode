// Buaze.com — Site canvas: tüm sayfalar

const { HomePage, PricingPage, HowItWorksPage, SolutionPage } = window.MarketingPages;
const { QRGeneratorPage, AboutPage, ContactPage, BlogPage, LoginPage, RegisterPage } = window.SitePages2;
const { AdminDashboard, AdminReviews, AdminQRBuilder, AdminAnalytics, AdminLocations, AdminSettings } = window.AdminPages;
const {
  DeliverySolutionPage, InternationalHomePage, FeaturesPage, IntegrationsPage,
  CustomerStoriesPage, FAQPage, CareersPage, HelpCenterPage, LegalPage,
  OnboardingPage, ROICalculatorPage,
  AdminCampaigns, AdminTeam, AdminBilling, AdminNotifications,
} = window.SitePages3;
const {
  HotelSolutionPage, ClinicSolutionPage, LegalSolutionPage, SpaSolutionPage, RetailSolutionPage,
  FeatureAIPage, ComparePage, BlogPostPage,
  ResetPasswordPage, NotFoundPage, AdminAPIPage,
} = window.SitePages4;
const { BrowserFrame } = window.BuazeSite;
const HomePageV2 = window.HomePageV2;
const OnboardingV2 = window.OnboardingV2;

function SiteApp() {
  return (
    <DesignCanvas title="Buaze.com · Tam Site · v2.0">

      {/* ============ PREMIUM v2 ============ */}
      <DCSection id="v2" title="00 · Premium Redesign v2" subtitle="Animasyonlu, conversion-focused · premium yeni tasarımlar">
        <DCArtboard id="home-v2" label="🆕 Ana sayfa v2 · Animasyonlu hero + canlı dashboard + bento + testimonials" width={1440} height={4000}>
          <BrowserFrame url=""><HomePageV2 /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="onboard-v2" label="🆕 Onboarding v2 · Tüm 5 adım · İşletme → Sektör → Konum → Platform → QR" width={1440} height={920}>
          <BrowserFrame url="baslangic-v2"><OnboardingV2 /></BrowserFrame>
        </DCArtboard>
      </DCSection>

      {/* ============ MARKETING ============ */}
      <DCSection id="marketing" title="01 · Marketing" subtitle="Pulse kimliği · buaze.com kamuya açık sayfalar">
        <DCArtboard id="home" label="Ana sayfa (orijinal)" width={1440} height={3200}>
          <BrowserFrame url=""><HomePage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="how" label="Nasıl çalışır" width={1440} height={2100}>
          <BrowserFrame url="nasil-calisir"><HowItWorksPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="features" label="Özellikler · /ozellikler" width={1440} height={2400}>
          <BrowserFrame url="ozellikler"><FeaturesPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="feature-ai" label="Özellik · AI Co-Pilot" width={1440} height={2000}>
          <BrowserFrame url="ozellikler/ai-copilot"><FeatureAIPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="pricing" label="Fiyatlar · /fiyatlar" width={1440} height={2000}>
          <BrowserFrame url="fiyatlar"><PricingPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="roi" label="ROI Hesaplayıcı · /roi" width={1440} height={1200}>
          <BrowserFrame url="roi"><ROICalculatorPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="qrgen" label="QR Oluşturucu · /qr" width={1440} height={1700}>
          <BrowserFrame url="qr"><QRGeneratorPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="integrations" label="Entegrasyonlar" width={1440} height={2000}>
          <BrowserFrame url="entegrasyonlar"><IntegrationsPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="compare" label="Karşılaştır · /karsilastir" width={1440} height={1600}>
          <BrowserFrame url="karsilastir"><ComparePage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="stories" label="Müşteri hikayeleri" width={1440} height={1700}>
          <BrowserFrame url="basari-hikayeleri"><CustomerStoriesPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="en-home" label="EN · Uluslararası (Yelp/Tripadvisor)" width={1440} height={1800}>
          <BrowserFrame url="en"><InternationalHomePage /></BrowserFrame>
        </DCArtboard>
      </DCSection>

      {/* ============ ÇÖZÜMLER ============ */}
      <DCSection id="solutions" title="02 · Çözümler" subtitle="Sektör bazlı sayfalar">
        <DCArtboard id="sol-restoran" label="Restoran & Kafe" width={1440} height={2200}>
          <BrowserFrame url="cozumler/restoran"><SolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-delivery" label="Paket Servis (Yemeksepeti/Getir/Trendyol)" width={1440} height={2200}>
          <BrowserFrame url="cozumler/paket-servis"><DeliverySolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-hotel" label="Otel (Booking/Tripadvisor)" width={1440} height={2000}>
          <BrowserFrame url="cozumler/otel"><HotelSolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-clinic" label="Klinik & Sağlık (KVKK)" width={1440} height={1800}>
          <BrowserFrame url="cozumler/klinik"><ClinicSolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-legal" label="Hukuk Ofisi" width={1440} height={1600}>
          <BrowserFrame url="cozumler/hukuk"><LegalSolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-spa" label="Güzellik & Spa" width={1440} height={1700}>
          <BrowserFrame url="cozumler/spa"><SpaSolutionPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="sol-retail" label="Perakende" width={1440} height={1700}>
          <BrowserFrame url="cozumler/perakende"><RetailSolutionPage /></BrowserFrame>
        </DCArtboard>
      </DCSection>

      {/* ============ İÇERİK ============ */}
      <DCSection id="content" title="03 · İçerik & Bilgi" subtitle="Blog, SSS, yardım, kariyer, hakkımızda, iletişim">
        <DCArtboard id="blog" label="Blog Listesi" width={1440} height={1900}>
          <BrowserFrame url="blog"><BlogPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="blog-post" label="Blog Yazısı (Google 2026)" width={1440} height={2000}>
          <BrowserFrame url="blog/google-yorum-2026"><BlogPostPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="faq" label="SSS" width={1440} height={1500}>
          <BrowserFrame url="sss"><FAQPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="help" label="Yardım Merkezi" width={1440} height={1700}>
          <BrowserFrame url="yardim"><HelpCenterPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="about" label="Hakkımızda" width={1440} height={2000}>
          <BrowserFrame url="hakkimizda"><AboutPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="careers" label="Kariyer" width={1440} height={1700}>
          <BrowserFrame url="kariyer"><CareersPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="contact" label="İletişim" width={1440} height={1500}>
          <BrowserFrame url="iletisim"><ContactPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="legal" label="Gizlilik Politikası" width={1440} height={1600}>
          <BrowserFrame url="gizlilik"><LegalPage /></BrowserFrame>
        </DCArtboard>
      </DCSection>

      {/* ============ AUTH & ONBOARDING ============ */}
      <DCSection id="auth" title="04 · Auth & Onboarding" subtitle="Giriş, kayıt, şifre, 404, kurulum sihirbazı">
        <DCArtboard id="register" label="Kayıt · /kayit" width={1280} height={760}>
          <BrowserFrame url="kayit"><RegisterPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="login" label="Giriş · /giris" width={1280} height={760}>
          <BrowserFrame url="giris"><LoginPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="reset" label="Şifre Sıfırla" width={1280} height={760}>
          <BrowserFrame url="sifre-sifirla"><ResetPasswordPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="onboarding" label="Onboarding Sihirbazı (adım 4/5)" width={1280} height={900}>
          <BrowserFrame url="baslangic"><OnboardingPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="notfound" label="404 Sayfası" width={1440} height={700}>
          <BrowserFrame url="404"><NotFoundPage /></BrowserFrame>
        </DCArtboard>
      </DCSection>

      {/* ============ ADMİN PANEL ============ */}
      <DCSection id="admin" title="05 · Admin Panel" subtitle="app.buaze.com · İşletme yönetim paneli">
        <DCArtboard id="admin-dash" label="Genel Bakış" width={1440} height={1200}>
          <BrowserFrame url="app · panel"><AdminDashboard /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-reviews" label="Yorum Gelen Kutusu (3-kolon + AI)" width={1440} height={900}>
          <BrowserFrame url="app · yorumlar"><AdminReviews /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-qr" label="QR Oluştur (4-adım sihirbazı)" width={1440} height={1100}>
          <BrowserFrame url="app · qr"><AdminQRBuilder /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-analytics" label="Analitik (NPS + personel + tema bulutu)" width={1440} height={1200}>
          <BrowserFrame url="app · analitik"><AdminAnalytics /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-locations" label="Konumlar" width={1440} height={900}>
          <BrowserFrame url="app · konumlar"><AdminLocations /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-campaigns" label="Kampanyalar" width={1440} height={1400}>
          <BrowserFrame url="app · kampanyalar"><AdminCampaigns /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-team" label="Ekip & Roller" width={1440} height={1300}>
          <BrowserFrame url="app · ekip"><AdminTeam /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-notif" label="Bildirimler" width={1440} height={1200}>
          <BrowserFrame url="app · bildirimler"><AdminNotifications /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-billing" label="Faturalandırma" width={1440} height={1300}>
          <BrowserFrame url="app · fatura"><AdminBilling /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-api" label="API & Webhook" width={1440} height={1100}>
          <BrowserFrame url="app · api"><AdminAPIPage /></BrowserFrame>
        </DCArtboard>
        <DCArtboard id="admin-settings" label="Ayarlar" width={1440} height={900}>
          <BrowserFrame url="app · ayarlar"><AdminSettings /></BrowserFrame>
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

const siteRoot = ReactDOM.createRoot(document.getElementById('root'));
siteRoot.render(<SiteApp />);
