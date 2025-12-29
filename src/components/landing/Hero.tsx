"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { Mic, Sparkles, Check } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/30 pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Beta disponivel em breve</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            Grave 2 horas.{" "}
            <span className="text-primary">Receba 30 minutos</span> prontos para
            publicar.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            IA que edita seu podcast: seleciona os melhores momentos, remove
            enrolacao, monta a narrativa.
          </motion.p>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-md mx-auto mb-12"
          >
            <WaitlistForm />
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Sem cartao de credito</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Acesso antecipado</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Vagas limitadas</span>
            </div>
          </motion.div>
        </div>

        {/* Visual demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-16"
        >
          <div className="relative bg-card rounded-2xl shadow-2xl border p-6 md:p-8">
            {/* Timeline visualization */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Mic className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Audio original: 1h 47min</p>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-red-400/50 via-yellow-400/50 to-green-400/50" />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-primary"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </motion.div>
              </div>

              <div className="flex items-center gap-4">
                <Sparkles className="w-8 h-8 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Episodio editado: 32min</p>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 flex">
                      <div className="h-full w-[15%] bg-green-500" />
                      <div className="h-full w-[2%] bg-muted" />
                      <div className="h-full w-[25%] bg-green-500" />
                      <div className="h-full w-[2%] bg-muted" />
                      <div className="h-full w-[18%] bg-green-500" />
                      <div className="h-full w-[2%] bg-muted" />
                      <div className="h-full w-[20%] bg-green-500" />
                      <div className="h-full w-[2%] bg-muted" />
                      <div className="h-full w-[14%] bg-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">70%</p>
                <p className="text-sm text-muted-foreground">Removido</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">5h</p>
                <p className="text-sm text-muted-foreground">Economizadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">12</p>
                <p className="text-sm text-muted-foreground">Segmentos</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
