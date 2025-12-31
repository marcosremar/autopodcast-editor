/**
 * Script para popular templates padrão no banco de dados
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { templates, templateSections } from "../src/lib/db/schema";
import type { EditingRules } from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("🌱 Populando templates padrão...\n");

  try {
    // 1. ENTREVISTA PROFISSIONAL
    console.log("📝 Criando template: Entrevista Profissional");
    const [interviewTemplate] = await db
      .insert(templates)
      .values({
        name: "Entrevista Profissional",
        description:
          "Template ideal para podcasts de entrevista com convidados. Estrutura completa com introdução, apresentação do entrevistado, e conclusão profissional.",
        category: "interview",
        isSystem: true,
        estimatedDuration: 2400, // 40 minutos
        metadata: {
          tags: ["entrevista", "convidado", "profissional"],
          difficulty: "beginner",
          recommendedFor: ["podcasts de negócios", "entrevistas", "conversas"],
        },
      })
      .returning();

    const interviewEditingRules: EditingRules = {
      fadeIn: 1.5,
      fadeOut: 2.0,
      normalizeVolume: true,
      targetVolume: -16,
      compression: { threshold: -20, ratio: 3 },
      silenceTrimming: { enabled: true, threshold: -50 },
      transition: { type: "crossfade", duration: 0.5 },
      removeHesitations: true,
    };

    await db.insert(templateSections).values([
      {
        templateId: interviewTemplate.id,
        name: "Vinheta",
        description: "Música ou vinheta de abertura do podcast",
        order: 1,
        isRequired: false,
        minDuration: 5,
        maxDuration: 15,
        suggestedDuration: 10,
        type: "intro",
        aiPrompt: "Música instrumental ou vinheta de abertura sem fala",
        editingRules: { fadeIn: 0, fadeOut: 1.0 },
        exampleText: "[Música de abertura do podcast]",
        icon: "music",
        color: "purple",
      },
      {
        templateId: interviewTemplate.id,
        name: "Introdução",
        description:
          "Apresentação do podcast, tema do episódio e contexto da entrevista",
        order: 2,
        isRequired: true,
        minDuration: 30,
        maxDuration: 90,
        suggestedDuration: 60,
        type: "intro",
        aiPrompt:
          "Host apresentando o podcast e tema do episódio, sem ainda apresentar o convidado",
        editingRules: interviewEditingRules,
        exampleText:
          "Bem-vindos ao [Nome do Podcast]! Hoje vamos falar sobre [tema]...",
        icon: "wave",
        color: "blue",
      },
      {
        templateId: interviewTemplate.id,
        name: "Apresentação do Convidado",
        description: "Apresentação formal do entrevistado e suas credenciais",
        order: 3,
        isRequired: true,
        minDuration: 20,
        maxDuration: 60,
        suggestedDuration: 40,
        type: "main_content",
        aiPrompt: "Host apresentando o convidado, suas credenciais e experiência",
        editingRules: interviewEditingRules,
        exampleText:
          "Nosso convidado de hoje é [nome], que é [cargo/especialidade]...",
        icon: "user",
        color: "green",
      },
      {
        templateId: interviewTemplate.id,
        name: "Entrevista Principal",
        description: "Conversa principal entre host e convidado",
        order: 4,
        isRequired: true,
        minDuration: 600,
        maxDuration: 3600,
        suggestedDuration: 1800,
        type: "main_content",
        aiPrompt: "Perguntas e respostas entre host e convidado",
        editingRules: interviewEditingRules,
        exampleText: "[Conversa entre host e convidado com perguntas e respostas]",
        icon: "message-circle",
        color: "blue",
      },
      {
        templateId: interviewTemplate.id,
        name: "Call-to-Action",
        description:
          "Convite para redes sociais, newsletter ou próximo episódio",
        order: 5,
        isRequired: false,
        minDuration: 15,
        maxDuration: 45,
        suggestedDuration: 30,
        type: "cta",
        aiPrompt:
          "Host pedindo para seguir redes sociais, inscrever-se, ou anunciando próximo episódio",
        editingRules: interviewEditingRules,
        exampleText:
          "Se você gostou deste episódio, não esqueça de seguir nas redes sociais...",
        icon: "megaphone",
        color: "orange",
      },
      {
        templateId: interviewTemplate.id,
        name: "Conclusão",
        description: "Encerramento do episódio e despedida",
        order: 6,
        isRequired: true,
        minDuration: 20,
        maxDuration: 60,
        suggestedDuration: 40,
        type: "outro",
        aiPrompt: "Host agradecendo e encerrando o episódio",
        editingRules: { ...interviewEditingRules, fadeOut: 3.0 },
        exampleText: "Foi um prazer ter você aqui! Até o próximo episódio!",
        icon: "wave",
        color: "blue",
      },
    ]);
    console.log("  ✓ 6 seções criadas\n");

    // 2. MONÓLOGO EDUCACIONAL
    console.log("📝 Criando template: Monólogo Educacional");
    const [monologueTemplate] = await db
      .insert(templates)
      .values({
        name: "Monólogo Educacional",
        description:
          "Template para podcasts educacionais em formato solo. Ideal para ensinar conceitos, compartilhar conhecimento e exemplos práticos.",
        category: "monologue",
        isSystem: true,
        estimatedDuration: 1800, // 30 minutos
        metadata: {
          tags: ["educacional", "solo", "tutorial"],
          difficulty: "beginner",
          recommendedFor: ["aulas", "tutoriais", "explicações"],
        },
      })
      .returning();

    const monologueEditingRules: EditingRules = {
      fadeIn: 1.5,
      fadeOut: 2.0,
      normalizeVolume: true,
      targetVolume: -16,
      removeHesitations: true,
      removeFiller: true,
    };

    await db.insert(templateSections).values([
      {
        templateId: monologueTemplate.id,
        name: "Gancho Inicial",
        description: "Abertura chamativa para capturar atenção imediatamente",
        order: 1,
        isRequired: true,
        minDuration: 15,
        maxDuration: 45,
        suggestedDuration: 30,
        type: "intro",
        aiPrompt: "Abertura impactante com pergunta ou fato interessante",
        editingRules: monologueEditingRules,
        exampleText: "Você sabia que [fato surpreendente]?",
        icon: "zap",
        color: "yellow",
      },
      {
        templateId: monologueTemplate.id,
        name: "Introdução ao Tópico",
        description: "Contextualização do tema que será abordado",
        order: 2,
        isRequired: true,
        minDuration: 30,
        maxDuration: 90,
        suggestedDuration: 60,
        type: "intro",
        aiPrompt: "Apresentação do tema e objetivos do episódio",
        editingRules: monologueEditingRules,
        exampleText: "Hoje vou ensinar sobre [tema] e por que isso é importante...",
        icon: "book",
        color: "blue",
      },
      {
        templateId: monologueTemplate.id,
        name: "Conteúdo Principal",
        description: "Explicação detalhada do tema com conceitos e informações",
        order: 3,
        isRequired: true,
        minDuration: 600,
        maxDuration: 3600,
        suggestedDuration: 1200,
        type: "main_content",
        aiPrompt: "Explicação educacional do tema principal",
        editingRules: monologueEditingRules,
        exampleText: "[Explicação detalhada do conteúdo]",
        icon: "graduation-cap",
        color: "blue",
      },
      {
        templateId: monologueTemplate.id,
        name: "Exemplo Prático",
        description: "Demonstração prática ou caso de uso real",
        order: 4,
        isRequired: false,
        minDuration: 60,
        maxDuration: 180,
        suggestedDuration: 120,
        type: "main_content",
        aiPrompt: "Exemplo prático ou demonstração de aplicação",
        editingRules: monologueEditingRules,
        exampleText: "Vamos ver um exemplo prático de como aplicar isso...",
        icon: "code",
        color: "green",
      },
      {
        templateId: monologueTemplate.id,
        name: "Recapitulação",
        description: "Resumo dos pontos principais e conclusões",
        order: 5,
        isRequired: true,
        minDuration: 30,
        maxDuration: 90,
        suggestedDuration: 60,
        type: "outro",
        aiPrompt: "Resumo dos principais pontos aprendidos",
        editingRules: monologueEditingRules,
        exampleText: "Para resumir, hoje aprendemos sobre...",
        icon: "list",
        color: "purple",
      },
      {
        templateId: monologueTemplate.id,
        name: "Call-to-Action",
        description: "Convite para ação ou engajamento",
        order: 6,
        isRequired: false,
        minDuration: 15,
        maxDuration: 45,
        suggestedDuration: 30,
        type: "cta",
        aiPrompt: "Convite para engajamento, comentários ou inscrição",
        editingRules: monologueEditingRules,
        exampleText: "Se este conteúdo foi útil, deixe um comentário...",
        icon: "megaphone",
        color: "orange",
      },
    ]);
    console.log("  ✓ 6 seções criadas\n");

    // 3. DEBATE/PAINEL
    console.log("📝 Criando template: Debate/Painel");
    const [debateTemplate] = await db
      .insert(templates)
      .values({
        name: "Debate/Painel",
        description:
          "Template para debates e painéis com múltiplos participantes discutindo diferentes perspectivas sobre um tema.",
        category: "debate",
        isSystem: true,
        estimatedDuration: 3600, // 60 minutos
        metadata: {
          tags: ["debate", "painel", "discussão", "múltiplas vozes"],
          difficulty: "intermediate",
          recommendedFor: ["debates", "mesas redondas", "painéis"],
        },
      })
      .returning();

    const debateEditingRules: EditingRules = {
      fadeIn: 1.5,
      fadeOut: 2.0,
      normalizeVolume: true,
      targetVolume: -16,
      compression: { threshold: -18, ratio: 2.5 },
      transition: { type: "crossfade", duration: 0.3 },
    };

    await db.insert(templateSections).values([
      {
        templateId: debateTemplate.id,
        name: "Abertura",
        description: "Apresentação do debate e moderador",
        order: 1,
        isRequired: true,
        minDuration: 30,
        maxDuration: 60,
        suggestedDuration: 45,
        type: "intro",
        aiPrompt: "Moderador apresentando o debate",
        editingRules: debateEditingRules,
        exampleText: "Bem-vindos a este debate sobre [tema]...",
        icon: "users",
        color: "blue",
      },
      {
        templateId: debateTemplate.id,
        name: "Apresentação dos Participantes",
        description: "Apresentação de cada participante do debate",
        order: 2,
        isRequired: true,
        minDuration: 60,
        maxDuration: 180,
        suggestedDuration: 120,
        type: "intro",
        aiPrompt: "Moderador apresentando cada participante",
        editingRules: debateEditingRules,
        exampleText: "Temos conosco [nome], que defende [posição]...",
        icon: "user-check",
        color: "green",
      },
      {
        templateId: debateTemplate.id,
        name: "Tema e Contexto",
        description: "Contextualização do tema a ser debatido",
        order: 3,
        isRequired: true,
        minDuration: 120,
        maxDuration: 300,
        suggestedDuration: 180,
        type: "main_content",
        aiPrompt: "Explicação do contexto e tema do debate",
        editingRules: debateEditingRules,
        exampleText: "O tema de hoje é [tema]. Vamos entender o contexto...",
        icon: "flag",
        color: "purple",
      },
      {
        templateId: debateTemplate.id,
        name: "Debate Principal",
        description: "Discussão entre os participantes com diferentes perspectivas",
        order: 4,
        isRequired: true,
        minDuration: 1200,
        maxDuration: 4800,
        suggestedDuration: 2400,
        type: "main_content",
        aiPrompt: "Troca de argumentos e discussão entre participantes",
        editingRules: debateEditingRules,
        exampleText: "[Debate entre participantes com argumentos diversos]",
        icon: "message-square",
        color: "red",
      },
      {
        templateId: debateTemplate.id,
        name: "Rodada Final",
        description: "Considerações finais de cada participante",
        order: 5,
        isRequired: true,
        minDuration: 180,
        maxDuration: 300,
        suggestedDuration: 240,
        type: "outro",
        aiPrompt: "Cada participante dando suas considerações finais",
        editingRules: debateEditingRules,
        exampleText: "Para encerrar, vamos ouvir as considerações finais...",
        icon: "check-circle",
        color: "green",
      },
      {
        templateId: debateTemplate.id,
        name: "Encerramento",
        description: "Conclusão do moderador e despedida",
        order: 6,
        isRequired: true,
        minDuration: 30,
        maxDuration: 90,
        suggestedDuration: 60,
        type: "outro",
        aiPrompt: "Moderador agradecendo e encerrando",
        editingRules: { ...debateEditingRules, fadeOut: 3.0 },
        exampleText: "Foi um ótimo debate! Agradecemos a participação de todos...",
        icon: "wave",
        color: "blue",
      },
    ]);
    console.log("  ✓ 6 seções criadas\n");

    // 4. REVIEW/ANÁLISE
    console.log("📝 Criando template: Review/Análise");
    const [reviewTemplate] = await db
      .insert(templates)
      .values({
        name: "Review/Análise",
        description:
          "Template para análises detalhadas e reviews de produtos, serviços, livros, filmes, etc.",
        category: "review",
        isSystem: true,
        estimatedDuration: 1200, // 20 minutos
        metadata: {
          tags: ["review", "análise", "crítica", "avaliação"],
          difficulty: "beginner",
          recommendedFor: ["reviews", "análises", "críticas"],
        },
      })
      .returning();

    const reviewEditingRules: EditingRules = {
      fadeIn: 1.5,
      fadeOut: 2.0,
      normalizeVolume: true,
      targetVolume: -16,
      removeHesitations: true,
      transition: { type: "crossfade", duration: 0.5 },
    };

    await db.insert(templateSections).values([
      {
        templateId: reviewTemplate.id,
        name: "Gancho",
        description: "Abertura chamativa relacionada ao item sendo analisado",
        order: 1,
        isRequired: true,
        minDuration: 10,
        maxDuration: 30,
        suggestedDuration: 20,
        type: "intro",
        aiPrompt: "Abertura impactante sobre o item a ser analisado",
        editingRules: reviewEditingRules,
        exampleText: "Este [produto/filme/livro] promete [benefício]. Será que cumpre?",
        icon: "zap",
        color: "yellow",
      },
      {
        templateId: reviewTemplate.id,
        name: "Introdução",
        description: "Apresentação do item sendo analisado",
        order: 2,
        isRequired: true,
        minDuration: 30,
        maxDuration: 60,
        suggestedDuration: 45,
        type: "intro",
        aiPrompt: "Apresentação básica do item: o que é, para quem é",
        editingRules: reviewEditingRules,
        exampleText: "Hoje vou analisar [item], que é [descrição básica]...",
        icon: "info",
        color: "blue",
      },
      {
        templateId: reviewTemplate.id,
        name: "Contexto/Background",
        description: "Contexto histórico ou background relevante",
        order: 3,
        isRequired: false,
        minDuration: 60,
        maxDuration: 180,
        suggestedDuration: 120,
        type: "main_content",
        aiPrompt: "Contexto histórico, comparações ou background",
        editingRules: reviewEditingRules,
        exampleText: "Antes de analisar, é importante entender o contexto...",
        icon: "clock",
        color: "purple",
      },
      {
        templateId: reviewTemplate.id,
        name: "Análise Detalhada",
        description: "Análise aprofundada de características e aspectos",
        order: 4,
        isRequired: true,
        minDuration: 300,
        maxDuration: 1200,
        suggestedDuration: 600,
        type: "main_content",
        aiPrompt: "Análise detalhada de características, funcionalidades, qualidade",
        editingRules: reviewEditingRules,
        exampleText: "[Análise detalhada dos aspectos principais]",
        icon: "search",
        color: "blue",
      },
      {
        templateId: reviewTemplate.id,
        name: "Prós e Contras",
        description: "Lista equilibrada de pontos positivos e negativos",
        order: 5,
        isRequired: true,
        minDuration: 120,
        maxDuration: 300,
        suggestedDuration: 180,
        type: "main_content",
        aiPrompt: "Listagem de pontos positivos e negativos",
        editingRules: reviewEditingRules,
        exampleText: "Os pontos positivos são: [...]. Já os negativos: [...]",
        icon: "scale",
        color: "orange",
      },
      {
        templateId: reviewTemplate.id,
        name: "Veredicto Final",
        description: "Conclusão e recomendação final",
        order: 6,
        isRequired: true,
        minDuration: 60,
        maxDuration: 120,
        suggestedDuration: 90,
        type: "outro",
        aiPrompt: "Veredicto final e recomendação",
        editingRules: reviewEditingRules,
        exampleText: "No final das contas, eu [recomendo/não recomendo] porque...",
        icon: "award",
        color: "green",
      },
      {
        templateId: reviewTemplate.id,
        name: "Call-to-Action",
        description: "Convite para comentários, sugestões ou próximos reviews",
        order: 7,
        isRequired: false,
        minDuration: 15,
        maxDuration: 30,
        suggestedDuration: 20,
        type: "cta",
        aiPrompt: "Convite para engajamento e sugestões",
        editingRules: { ...reviewEditingRules, fadeOut: 3.0 },
        exampleText: "Deixe nos comentários qual produto você quer ver analisado...",
        icon: "megaphone",
        color: "orange",
      },
    ]);
    console.log("  ✓ 7 seções criadas\n");

    console.log("✅ Templates populados com sucesso!");
    console.log("\nResumo:");
    console.log("  • Entrevista Profissional (6 seções)");
    console.log("  • Monólogo Educacional (6 seções)");
    console.log("  • Debate/Painel (6 seções)");
    console.log("  • Review/Análise (7 seções)");
    console.log("\nTotal: 4 templates, 25 seções");
  } catch (error: any) {
    console.error("✗ Erro ao popular templates:", error.message);
    throw error;
  }

  await client.end();
}

main().catch(console.error);
