// Pulse — Ana app: tüm artboard'ları design canvas'a yerleştir

const {
  CoverBoard, PrinciplesBoard, ConstructionBoard, VariationsBoard,
  ClearSpaceBoard, ColorBoard, TypographyBoard, VoiceBoard,
} = window.PulseArtboards1;
const {
  WebHeroBoard, DashboardBoard, MobileBoard, QRBoard,
  EmailSocialBoard, MotionBoard, HandoffBoard,
} = window.PulseArtboards2;

function PulseApp() {
  return (
    <DesignCanvas title="Buaze · Pulse · Marka kimliği v1.0">
      <DCSection id="overview" title="Genel bakış" subtitle="Manifesto, ilkeler ve sistem özeti.">
        <DCArtboard id="cover" label="Kapak · Manifesto" width={1200} height={820}>
          <CoverBoard />
        </DCArtboard>
        <DCArtboard id="principles" label="Marka ilkeleri" width={1600} height={700}>
          <PrinciplesBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="logo" title="Logo & sembol" subtitle="Konstrüksiyon, varyantlar, kullanım kuralları.">
        <DCArtboard id="construction" label="Sembol konstrüksiyonu" width={1400} height={800}>
          <ConstructionBoard />
        </DCArtboard>
        <DCArtboard id="variations" label="Logo varyantları" width={1400} height={900}>
          <VariationsBoard />
        </DCArtboard>
        <DCArtboard id="clearspace" label="Clear space & yanlış kullanım" width={1500} height={900}>
          <ClearSpaceBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="system" title="Tasarım sistemi" subtitle="Renk, tipografi, ton ve motion.">
        <DCArtboard id="color" label="Renk paleti" width={1400} height={900}>
          <ColorBoard />
        </DCArtboard>
        <DCArtboard id="typography" label="Tipografi" width={1500} height={900}>
          <TypographyBoard />
        </DCArtboard>
        <DCArtboard id="voice" label="Ses & ton" width={1400} height={800}>
          <VoiceBoard />
        </DCArtboard>
        <DCArtboard id="motion" label="Motion sistemi" width={1400} height={800}>
          <MotionBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="apps" title="Uygulamalar" subtitle="Web, ürün, mobil, basılı materyal, sosyal.">
        <DCArtboard id="web" label="Web · Landing hero" width={1440} height={900}>
          <WebHeroBoard />
        </DCArtboard>
        <DCArtboard id="dashboard" label="Ürün · Yönetim paneli" width={1440} height={900}>
          <DashboardBoard />
        </DCArtboard>
        <DCArtboard id="mobile" label="Mobil · Geri bildirim akışı" width={1200} height={700}>
          <MobileBoard />
        </DCArtboard>
        <DCArtboard id="qr" label="QR · Masaüstü kartlar" width={1200} height={550}>
          <QRBoard />
        </DCArtboard>
        <DCArtboard id="email-social" label="E-posta · Sosyal · Merch" width={1400} height={800}>
          <EmailSocialBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="handoff" title="Developer handoff" subtitle="IDE'ye (Claude Opus 4.7) vermek için hazır prompt.">
        <DCArtboard id="handoff-prompt" label="IDE prompt · Kopyala, yapıştır" width={1500} height={900}>
          <HandoffBoard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

const pulseRoot = ReactDOM.createRoot(document.getElementById('root'));
pulseRoot.render(<PulseApp />);
