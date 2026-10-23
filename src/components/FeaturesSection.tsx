import { forwardRef } from "react";
import { Shield, Users, TrendingUp, Bell, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Auto-Registration",
    description: "Set member limits and the system auto-locks when full. No manual approvals needed.",
  },
  {
    icon: Shield,
    title: "Transparent Payout Order",
    description: "Randomly assigned, visible to all. Fair rotation everyone can trust.",
  },
  {
    icon: TrendingUp,
    title: "Smart Round Management",
    description: "Rounds advance only when all members pay. Automatic cycle resets & reshuffles.",
  },
  {
    icon: Bell,
    title: "Auto Reminders",
    description: "SMS and in-app notifications before every due date. No one forgets.",
  },
  {
    icon: BarChart3,
    title: "Live Dashboard",
    description: "Track contributions, balances, payout order, and cycle progress in real time.",
  },
  {
    icon: ArrowRight,
    title: "Exit & Penalties",
    description: "Automated penalty calculations. Defaulters flagged. Group stability maintained.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <section ref={ref} className="py-24 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Fully Automated. Zero Admin.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Every step — from registration to payouts — is handled by the system. No leaders, no drama.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";
export default FeaturesSection;
