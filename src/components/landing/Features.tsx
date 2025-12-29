"use client";

import { motion } from "framer-motion";
import {
  Target,
  AlertTriangle,
  Mic2,
  ListOrdered,
  Download,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Selecao inteligente",
    description:
      "IA identifica os momentos mais interessantes e relevantes da sua gravacao.",
  },
  {
    icon: AlertTriangle,
    title: "Deteccao de erros",
    description:
      "Identifica informacoes incorretas, contradicoes e trechos confusos automaticamente.",
  },
  {
    icon: Mic2,
    title: "Regravacao inline",
    description:
      "Corrija trechos problematicos gravando direto no navegador, sem regravar tudo.",
  },
  {
    icon: ListOrdered,
    title: "Reorganizacao narrativa",
    description:
      "IA sugere a melhor ordem para seus trechos criarem uma historia coerente.",
  },
  {
    icon: Download,
    title: "Export pronto",
    description:
      "Baixe seu episodio editado em MP3, pronto para publicar em qualquer plataforma.",
  },
  {
    icon: Clock,
    title: "Economize horas",
    description:
      "O que levaria 4+ horas agora leva 15 minutos. Foque no que importa: criar conteudo.",
  },
];

export function Features() {
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
            Tudo que voce precisa para editar{" "}
            <span className="text-primary">sem editar</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Features pensadas para quem quer publicar mais, nao editar mais
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
