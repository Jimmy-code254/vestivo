import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 8, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly, including your name, email address, phone number, and financial transaction data when you use Vestivo. We also collect usage data such as device information, IP addresses, and interaction patterns.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>Your information is used to operate and improve Vestivo, process contributions and payouts, send notifications and reminders, verify identity, and prevent fraud. We never sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit and at rest, secure authentication, and regular security audits. Financial data is handled with bank-level encryption protocols.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Data Sharing</h2>
            <p>We share data only with your chama group members (contribution status and payout order), payment processors for transaction handling, and law enforcement when legally required.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can export your transaction history at any time. To exercise these rights, contact us at privacy@vestivo.app.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Contact</h2>
            <p>For privacy-related inquiries, email us at <a href="mailto:privacy@vestivo.app" className="text-primary hover:underline">privacy@vestivo.app</a>.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
