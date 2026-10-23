import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <footer ref={ref} className="bg-card border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">Vestivo</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The most trusted automated savings, loans, and community finance platform in Africa.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link to="/wallet" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Wallet</Link></li>
              <li><Link to="/loans" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Loans</Link></li>
              <li><Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Events</Link></li>
              <li><Link to="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create Chama</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Vestivo. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Built for trust. Powered by automation.</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
