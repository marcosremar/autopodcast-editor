"use client";

import { motion } from "framer-motion";
import { Clock, Brain, Shuffle } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Horas ouvindo gravacao",
    description:
      "Voce precisa ouvir cada minuto da gravacao para encontrar os melhores momentos.",
  },
  {
    icon: Brain,
    title: "Decidindo o que cortar",
    description:
      "Escolher entre tantas opcoes e exaustivo. O que e tangente? O que e repetitivo?",
  },
  {
    icon: Shuffle,
    title: "Reorganizando trechos",
    description:
      "Mesmo apos cortar, ainda precisa reorganizar para criar uma narrativa coerente.",
  },
];

export function Problem() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Editar podcast e{" "}
            <span className="text-red-500">exaustivo</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Cada 30 minutos de episodio exige 3-4 horas de trabalho manual
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-6 border shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <problem.icon className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
              <p className="text-muted-foreground">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-lg text-muted-foreground">
            <span className="font-semibold text-foreground">Resultado:</span>{" "}
            Voce publica menos do que gostaria, ou desiste do podcast.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
