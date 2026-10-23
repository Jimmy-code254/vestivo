import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 8, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using Vestivo, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. Platform Description</h2>
            <p>Vestivo is an automated rotational savings, loans, and community finance platform. We facilitate group savings by automating contribution tracking, payout scheduling, and member management.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. User Obligations</h2>
            <p>Users must provide accurate information during registration, make contributions on time according to their chama schedule, not attempt to manipulate or defraud other members, and comply with all applicable local laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Penalties & Exit Policy</h2>
            <p>Members who exit a chama mid-cycle may face penalties of 5–10% of the total cycle value or forfeiture of their last contribution. These penalties help maintain group stability and protect remaining members.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>Vestivo facilitates group savings but is not a financial institution. We are not liable for losses arising from member defaults, disputes between members, or technical issues beyond our control.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or are reported by other members for misconduct.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Contact</h2>
            <p>For questions about these terms, email us at <a href="mailto:legal@vestivo.app" className="text-primary hover:underline">legal@vestivo.app</a>.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
