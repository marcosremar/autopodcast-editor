"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Funciona com qualquer tipo de podcast?",
    answer:
      "Sim! Funciona com podcasts solo (monologo), entrevistas e conversas. A IA se adapta ao formato e identifica os melhores momentos independente do estilo.",
  },
  {
    question: "E se a IA errar na selecao?",
    answer:
      "Voce tem controle total. Apos a IA fazer a selecao inicial, voce pode revisar, adicionar ou remover trechos antes de exportar. Pense nisso como um primeiro rascunho que voce refina.",
  },
  {
    question: "Posso ajustar manualmente o resultado?",
    answer:
      "Com certeza! A interface permite que voce reordene segmentos, adicione trechos que foram removidos, exclua trechos que nao quer, e ate regrave partes especificas.",
  },
  {
    question: "Quanto tempo leva para processar?",
    answer:
      "Em media, 5-10 minutos para cada hora de audio. Um podcast de 2 horas leva cerca de 15-20 minutos para ser processado completamente.",
  },
  {
    question: "Preciso seguir um roteiro ao gravar?",
    answer:
      "Nao! Essa e uma das grandes vantagens. Voce pode gravar falando livremente, sem roteiro. A IA vai organizar seu conteudo em uma narrativa coerente.",
  },
  {
    question: "Qual a qualidade do audio exportado?",
    answer:
      "Exportamos em MP3 320kbps por padrao, qualidade profissional para qualquer plataforma de podcast. A edicao usa crossfades suaves para transicoes imperceptiveis.",
  },
  {
    question: "Posso cancelar a assinatura a qualquer momento?",
    answer:
      "Sim, sem compromisso. Voce pode cancelar a qualquer momento e continua tendo acesso ate o fim do periodo pago.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full py-4 flex items-center justify-between text-left"
        onClick={onToggle}
      >
        <span className="font-medium pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden"
      >
        <p className="pb-4 text-muted-foreground">{answer}</p>
      </motion.div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
            Perguntas frequentes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Tudo que voce precisa saber antes de comecar
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto bg-card rounded-xl border p-6"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
