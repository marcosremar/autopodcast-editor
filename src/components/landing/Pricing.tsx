"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "Para experimentar",
    price: "R$ 0",
    period: "1 episodio trial",
    features: [
      "1 episodio unico",
      "Ate 30min de audio",
      "Transcricao automatica",
      "Selecao inteligente",
      "Export em MP3",
    ],
    cta: "Experimentar gratis",
    popular: false,
  },
  {
    name: "Starter",
    description: "Para criadores iniciantes",
    price: "R$ 29",
    period: "/mes",
    features: [
      "5 episodios/mes",
      "Ate 2h de audio cada",
      "Tudo do Free +",
      "Deteccao de erros",
      "Regravacao inline",
      "Suporte por email",
    ],
    cta: "Comecar agora",
    popular: false,
  },
  {
    name: "Pro",
    description: "Para criadores serios",
    price: "R$ 79",
    period: "/mes",
    features: [
      "20 episodios/mes",
      "Ate 3h de audio cada",
      "Tudo do Starter +",
      "Reorganizacao narrativa",
      "Prioridade no processamento",
      "Suporte prioritario",
    ],
    cta: "Escolher Pro",
    popular: true,
  },
  {
    name: "Unlimited",
    description: "Para agencias e redes",
    price: "R$ 149",
    period: "/mes",
    features: [
      "Episodios ilimitados",
      "Ate 3h de audio cada",
      "Tudo do Pro +",
      "API access",
      "White-label export",
      "Suporte dedicado",
    ],
    cta: "Falar com vendas",
    popular: false,
  },
];

export function Pricing() {
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
            Planos para todo tamanho de podcast
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Comece gratis, escale conforme cresce
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={`relative bg-card rounded-xl border p-6 ${
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary"
                  : "shadow-sm"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Mais popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled
              >
                {plan.cta}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Disponivel em breve
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
