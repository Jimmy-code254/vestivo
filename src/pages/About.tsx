import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, Users, TrendingUp, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const values = [
  { icon: Shield, title: "Trust First", desc: "Every transaction is transparent and visible to all group members." },
  { icon: Users, title: "Community Driven", desc: "Built by Africans for African savings traditions, modernized." },
  { icon: TrendingUp, title: "Financial Growth", desc: "Helping families and communities build wealth through collective saving." },
  { icon: Lock, title: "Secure by Design", desc: "Bank-grade encryption and automated systems eliminate human error." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">About Vestivo</h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
            We're on a mission to digitize and automate the age-old African tradition of rotational savings groups — making them trustworthy, transparent, and accessible to everyone.
          </p>
        </motion.div>

        <section className="mb-16">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Our Story</h2>
          <p className="text-foreground/80 mb-4">
            Chama groups have been a cornerstone of African financial culture for generations. Families, friends, and colleagues pool money together, trusting each other to contribute and receive payouts in turn. But traditional chamas face challenges: missed payments, disputes over payout order, and lack of transparency.
          </p>
          <p className="text-foreground/80">
            Vestivo was born to solve these problems. Our fully automated platform removes the need for a central administrator, ensuring every member is treated fairly through transparent algorithms and automated enforcement.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Our Values</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="p-5 border border-border shadow-card">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <v.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-card-foreground mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
