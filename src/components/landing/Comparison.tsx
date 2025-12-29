"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisons = [
  {
    feature: "Remove silencio e 'ums'",
    others: true,
    us: true,
  },
  {
    feature: "Entende o conteudo semanticamente",
    others: false,
    us: true,
  },
  {
    feature: "Seleciona melhores momentos",
    others: false,
    us: true,
  },
  {
    feature: "Detecta erros e contradicoes",
    others: false,
    us: true,
  },
  {
    feature: "Reorganiza narrativa automaticamente",
    others: false,
    us: true,
  },
  {
    feature: "Regravacao inline de trechos",
    others: false,
    us: true,
  },
  {
    feature: "Funciona sem roteiro previo",
    others: false,
    us: true,
  },
];

export function Comparison() {
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
            Nao e so cortar silencio
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Comparado com editores tradicionais, nosso diferencial e a
            inteligencia
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card rounded-xl border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 border-b font-semibold">
              <div>Funcionalidade</div>
              <div className="text-center text-muted-foreground">
                Editores tradicionais
              </div>
              <div className="text-center text-primary">AeroPod</div>
            </div>

            {/* Rows */}
            {comparisons.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 gap-4 p-4 items-center ${
                  index !== comparisons.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="text-sm md:text-base">{row.feature}</div>
                <div className="flex justify-center">
                  {row.others ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex justify-center">
                  {row.us ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
