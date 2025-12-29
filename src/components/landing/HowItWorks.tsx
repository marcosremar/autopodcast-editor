"use client";

import { motion } from "framer-motion";
import { Mic, Sparkles, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "1",
    title: "Grave falando livremente",
    description:
      "Sem roteiro, sem preocupacao. Fale por quanto tempo quiser sobre seu tema.",
  },
  {
    icon: Sparkles,
    step: "2",
    title: "IA analisa e seleciona",
    description:
      "Nossa IA assiste tudo, identifica os melhores momentos e remove o que nao funciona.",
  },
  {
    icon: CheckCircle,
    step: "3",
    title: "Revise e publique",
    description:
      "Veja o resultado, faca ajustes se quiser, e exporte seu episodio pronto.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Como funciona
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Tres passos simples para transformar sua gravacao em episodio
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />

            <div className="space-y-12 md:space-y-0">
              {steps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative md:grid md:grid-cols-2 md:gap-8 ${
                    index % 2 === 0 ? "" : "md:direction-rtl"
                  }`}
                >
                  <div
                    className={`mb-8 md:mb-24 ${
                      index % 2 === 0
                        ? "md:text-right md:pr-12"
                        : "md:text-left md:pl-12 md:col-start-2"
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-4 mb-4 ${
                        index % 2 === 0 ? "md:flex-row-reverse" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        Passo {item.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:block absolute left-1/2 top-6 w-4 h-4 rounded-full bg-primary -translate-x-1/2 z-10" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
