"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Vagas limitadas para o beta</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
          >
            Seja um dos primeiros a testar
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl opacity-90 mb-12"
          >
            Entre na lista de espera e ganhe acesso antecipado quando lancarmos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-background/10 backdrop-blur-sm rounded-xl p-6">
              <WaitlistForm />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-sm opacity-70"
          >
            Sem spam. Apenas um email quando lancarmos.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
