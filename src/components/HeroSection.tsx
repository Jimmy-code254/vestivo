import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center gradient-hero overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-emerald-light/10 blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-light/10 border border-emerald-light/20 mb-6">
              <Shield className="w-4 h-4 text-emerald-light" />
              <span className="text-emerald-light text-sm font-medium">
                Trusted by 1,000+ Groups
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              <span className="text-primary-foreground">Save Together,</span>
              <br />
              <span className="text-gradient-gold">Grow Together</span>
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-lg leading-relaxed">
              Vestivo automates your chama savings, loans, events, and meetings — 
              so your community can focus on what matters.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button variant="gold" size="lg" className="text-base px-8 py-6">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-10">
              {[
                { value: "KES 50M+", label: "Managed" },
                { value: "1,200+", label: "Members" },
                { value: "100%", label: "Transparent" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-display font-bold text-primary-foreground">{stat.value}</p>
                  <p className="text-primary-foreground/50 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="bg-card/10 backdrop-blur-xl border border-primary-foreground/10 rounded-2xl p-6 shadow-elevated">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-primary-foreground/50 text-sm">Current Cycle</p>
                    <p className="text-primary-foreground text-2xl font-display font-bold">Round 4 of 12</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-light/20 flex items-center justify-center">
                    <span className="text-emerald-light font-bold text-lg">33%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {["Jane M.", "Peter K.", "Sarah W.", "John O."].map((name, i) => (
                    <div key={name} className="flex items-center justify-between py-2 border-b border-primary-foreground/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? "bg-emerald-light/20 text-emerald-light" : i === 2 ? "bg-gold/20 text-gold" : "bg-primary-foreground/10 text-primary-foreground/50"}`}>
                          {i + 1}
                        </div>
                        <span className="text-primary-foreground/80 text-sm">{name}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${i < 2 ? "bg-emerald-light/10 text-emerald-light" : i === 2 ? "bg-gold/10 text-gold" : "bg-primary-foreground/5 text-primary-foreground/40"}`}>
                        {i < 2 ? "Paid" : i === 2 ? "Next Payout" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-6 bg-card rounded-xl p-4 shadow-elevated border border-border max-w-[220px]"
              >
                <p className="text-xs text-muted-foreground mb-1">🔔 Reminder</p>
                <p className="text-sm font-medium text-card-foreground">Contribution due in 2 days</p>
                <p className="text-xs text-primary font-semibold mt-1">KES 5,000</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
