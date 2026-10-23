import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <section ref={ref} className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center gradient-hero rounded-3xl p-12 md:p-16 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-light/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gold/5 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Ready to Start with Vestivo?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Create a group in under a minute. Invite members. Let the system handle the rest.
          </p>
          <Link to="/create">
            <Button variant="gold" size="lg" className="text-base px-10 py-6">
              Create Your Chama Now
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
});

CTASection.displayName = "CTASection";
export default CTASection;
