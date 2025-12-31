# 01 - MVP Core Features

> **Princípio:** Construir o MÍNIMO que entrega o MÁXIMO de valor para resolver o problema principal.

## 🎯 Problema Principal que o MVP Resolve

```
Problema:
"Gasto 4-6 horas editando cada episódio de podcast de 30 minutos.
Nunca sei se o episódio está bom, se tem partes demais ou de menos,
e se a estrutura faz sentido."

Solução (1 frase):
"Cole seu áudio, escolha um formato (ex: educacional),
e receba um episódio editado e estruturado em 15 minutos."
```

## ✅ Features OBRIGATÓRIAS (Sem essas, não é viável)

### 1. Upload & Processamento de Áudio ⚡ Prioridade MÁXIMA

**O que faz:**
- Usuário faz upload de MP3/WAV/M4A
- Sistema processa em background
- Retorna transcrição + segmentos detectados

**Specs Técnicas:**
```typescript
// Upload
- Max file size: 500MB (≈ 3h de áudio)
- Formatos: mp3, wav, m4a, ogg
- Upload direto para R2/S3 (não passar pelo servidor)
- Progress bar com % e tempo estimado

// Processamento
- Queue system (Inngest ou QStash)
- Whisper API para transcrição
- Custom ML para speaker diarization
- Embedding generation para busca semântica
- Tempo estimado: 2-5min para 30min de áudio
```

**User Flow:**
```
1. Click "Novo Projeto"
2. Drag & drop ou click para upload
3. [Uploading... 45% - 2min restantes]
4. [Processing... Transcrevendo áudio...]
5. [Processing... Detectando segmentos...]
6. ✅ "Pronto! Vamos estruturar seu episódio"
```

**Acceptance Criteria:**
- [ ] Upload funciona em Chrome, Safari, Firefox
- [ ] Progress bar é preciso (±10% de erro)
- [ ] Retry automático se upload falhar
- [ ] Notification quando processamento termina
- [ ] Funciona com áudio de até 2h
- [ ] Custo de processing < $0.50 por episódio

---

### 2. Transcrição Automática + Segmentação Semântica ⚡ Prioridade MÁXIMA

**O que faz:**
- Transcreve áudio com timestamps
- Detecta mudanças de tópico
- Agrupa sentenças em segmentos coerentes
- Classifica tipo de conteúdo (intro, explicação, exemplo, etc)

**Specs Técnicas:**
```typescript
interface Segment {
  id: string;
  startTime: number; // seconds
  endTime: number;
  text: string; // transcrição completa
  summary: string; // 1 frase resumo (gerado por IA)
  topic: string; // ex: "Introdução", "Conceito de IA"
  type: "intro" | "content" | "example" | "transition" | "outro";
  score: number; // 0-1, relevância/qualidade
  speaker?: string; // "Speaker 1", "Speaker 2"
}

// IA Classification Prompt
const classifySegment = `
Analise este trecho de podcast e retorne:
1. Tipo (intro/content/example/transition/outro)
2. Tópico principal (1-3 palavras)
3. Score de qualidade (0-1)

Trecho: "${segmentText}"

Retorne JSON: {"type": "...", "topic": "...", "score": 0.X}
`;
```

**Algoritmo de Segmentação:**
```python
# Pseudocódigo

1. Pegar transcrição completa do Whisper
2. Para cada sentença:
   - Gerar embedding (OpenAI text-embedding-3-small)
   - Comparar similaridade com sentença anterior
   - Se similaridade < 0.7 → novo segmento
3. Agrupar segmentos muito curtos (< 30s) com vizinhos
4. Para cada segmento:
   - Gerar summary (1 frase)
   - Classificar tipo
   - Extrair tópico
   - Calcular score (baseado em: clareza, concisão, relevância)
```

**Acceptance Criteria:**
- [ ] 95%+ de acurácia na transcrição (benchmark: Whisper)
- [ ] Segmentação detecta mudanças de tópico com 80%+ de acerto
- [ ] Cada segmento tem 30s - 3min (sweet spot)
- [ ] Classification acerta tipo em 70%+ dos casos
- [ ] Tempo de processamento < 5min para 30min de áudio

---

### 3. Template: "Podcast Educacional" ⚡ Prioridade ALTA

**O que faz:**
- 1 (um) template pré-definido apenas
- Estrutura de 7 slots otimizada para ensinar algo
- Usado como base para mapear os segmentos do usuário

**Estrutura do Template:**
```typescript
const templateEducacional = {
  id: "educacional-basico",
  name: "Podcast Educacional",
  description: "Ideal para ensinar um conceito, habilidade ou processo",
  targetDuration: { min: 15, max: 30 }, // minutos
  audience: "Pessoas querendo aprender algo específico",

  slots: [
    {
      id: "hook",
      order: 1,
      name: "Hook (Gancho)",
      description: "Frase impactante que prende atenção",
      examples: [
        "Você sabia que 90% das pessoas cometem esse erro?",
        "Imagine conseguir fazer isso em 5 minutos ao invés de 2 horas...",
        "O que eu vou te ensinar hoje mudou minha carreira."
      ],
      duration: { min: 0.5, max: 1 }, // minutos
      required: true,
      aiPrompt: "Identifique o trecho onde o host tenta capturar atenção com uma afirmação impactante, estatística surpreendente ou promessa de valor."
    },

    {
      id: "intro",
      order: 2,
      name: "Apresentação",
      description: "Quem você é e o que vai ensinar",
      examples: [
        "Olá, sou João, desenvolvedor há 10 anos, e hoje vou te ensinar...",
        "No episódio de hoje, você vai aprender exatamente como..."
      ],
      duration: { min: 1, max: 2 },
      required: true,
      aiPrompt: "Identifique onde o host se apresenta e declara explicitamente o que será ensinado no episódio."
    },

    {
      id: "contexto",
      order: 3,
      name: "Contexto/Problema",
      description: "Por que isso importa? Qual problema resolve?",
      duration: { min: 2, max: 4 },
      required: true,
      aiPrompt: "Identifique trechos onde o host explica o contexto, a importância do tema, ou o problema que será resolvido."
    },

    {
      id: "solucao",
      order: 4,
      name: "Solução/Explicação Principal",
      description: "Ensine o conceito/processo principal",
      duration: { min: 8, max: 15 },
      required: true,
      aiPrompt: "Identifique a parte central onde o host explica o conceito principal, dá o passo-a-passo, ou ensina a solução."
    },

    {
      id: "exemplo",
      order: 5,
      name: "Exemplo Prático",
      description: "Demonstração real de aplicação",
      duration: { min: 2, max: 5 },
      required: false, // não obrigatório no MVP
      aiPrompt: "Identifique onde o host dá um exemplo concreto, case study, ou demonstração prática."
    },

    {
      id: "recap",
      order: 6,
      name: "Recapitulação",
      description: "Resumo dos pontos principais",
      duration: { min: 1, max: 2 },
      required: true,
      aiPrompt: "Identifique onde o host resume ou lista os principais aprendizados/takeaways."
    },

    {
      id: "cta",
      order: 7,
      name: "Call-to-Action",
      description: "Próximo passo para o ouvinte",
      examples: [
        "Se gostou, deixe uma avaliação no Spotify",
        "Acesse o link na descrição para...",
        "Nos vemos no próximo episódio!"
      ],
      duration: { min: 0.5, max: 1 },
      required: true,
      aiPrompt: "Identifique onde o host pede alguma ação (seguir, avaliar, acessar link, etc) ou se despede."
    }
  ]
};
```

**Por que apenas 1 template no MVP?**
- Validar o CONCEITO de templates antes de criar 10
- Foco laser: se educacional não funciona, outros também não
- Mais fácil de testar e iterar
- Educacional é o formato mais comum (maior TAM)

**Acceptance Criteria:**
- [ ] Template está bem documentado (exemplos claros)
- [ ] Cada slot tem AI prompt testado e funcionando
- [ ] Validação de duração funciona corretamente
- [ ] UI mostra template de forma clara e atrativa

---

### 4. Mapeamento Automático (IA) ⚡ Prioridade MÁXIMA

**O que faz:**
- IA analisa os segmentos detectados
- Mapeia cada segmento para um slot do template
- Retorna JSON com mapeamento + explicação

**Flow:**
```
1. Usuário clica "Estruturar com Template Educacional"
2. Sistema envia para IA:
   - Template completo
   - Lista de segmentos detectados
   - Contexto do episódio (título, descrição se houver)
3. IA retorna mapeamento
4. Sistema valida e apresenta para usuário
```

**Prompt para IA:**
```typescript
const mappingPrompt = `
Você é um editor de podcast expert. Analise os segmentos abaixo e mapeie cada um para os slots do template "Podcast Educacional".

TEMPLATE:
${JSON.stringify(template.slots, null, 2)}

SEGMENTOS DISPONÍVEIS:
${segments.map((s, i) => `
[${i}] (${s.startTime}s - ${s.endTime}s, ${s.duration}s)
Tópico: ${s.topic}
Texto: "${s.summary}"
`).join('\n')}

INSTRUÇÕES:
1. Para cada slot do template, identifique qual(is) segmento(s) melhor se encaixam
2. Um slot pode ter múltiplos segmentos
3. Um segmento pode não se encaixar em nenhum slot (marque como "unused")
4. Valide a duração: cada slot tem duração min/max recomendada
5. Se um slot required estiver vazio, sinalize como "missing"

RETORNE JSON:
{
  "mapping": [
    {
      "slotId": "hook",
      "segmentIds": ["seg-1"],
      "confidence": 0.9,
      "reasoning": "Segmento 1 tem uma afirmação impactante sobre..."
    },
    ...
  ],
  "issues": [
    {
      "type": "missing" | "too_short" | "too_long" | "low_confidence",
      "slotId": "...",
      "message": "Descrição do problema",
      "suggestion": "Como resolver"
    }
  ],
  "unusedSegments": ["seg-5", "seg-8"],
  "overallScore": 0.75 // 0-1, quão bem os segmentos encaixam no template
}
`;
```

**Validação Pós-Mapeamento:**
```typescript
function validateMapping(mapping, template, segments) {
  const issues = [];

  // 1. Check required slots
  template.slots.filter(s => s.required).forEach(slot => {
    const mapped = mapping.find(m => m.slotId === slot.id);
    if (!mapped || mapped.segmentIds.length === 0) {
      issues.push({
        type: "missing",
        slotId: slot.id,
        message: `Slot obrigatório "${slot.name}" não foi preenchido`,
        suggestion: `Grave um trecho de ${slot.duration.min}-${slot.duration.max}min sobre: ${slot.description}`
      });
    }
  });

  // 2. Check duration
  mapping.forEach(m => {
    const slot = template.slots.find(s => s.id === m.slotId);
    const totalDuration = m.segmentIds
      .map(id => segments.find(s => s.id === id).duration)
      .reduce((a, b) => a + b, 0);

    const durationMinutes = totalDuration / 60;

    if (durationMinutes < slot.duration.min) {
      issues.push({
        type: "too_short",
        slotId: m.slotId,
        message: `"${slot.name}" tem ${durationMinutes.toFixed(1)}min, ideal é ${slot.duration.min}-${slot.duration.max}min`,
        suggestion: "Considere adicionar mais detalhes ou exemplos nesta parte"
      });
    }

    if (durationMinutes > slot.duration.max) {
      issues.push({
        type: "too_long",
        slotId: m.slotId,
        message: `"${slot.name}" tem ${durationMinutes.toFixed(1)}min, ideal é ${slot.duration.min}-${slot.duration.max}min`,
        suggestion: "Muito longo, considere cortar partes menos relevantes"
      });
    }
  });

  // 3. Check confidence
  mapping.forEach(m => {
    if (m.confidence < 0.6) {
      issues.push({
        type: "low_confidence",
        slotId: m.slotId,
        message: `Mapeamento de "${slot.name}" tem baixa confiança (${(m.confidence * 100).toFixed(0)}%)`,
        suggestion: "Revise manualmente se este é o trecho correto"
      });
    }
  });

  return issues;
}
```

**Acceptance Criteria:**
- [ ] IA mapeia corretamente em 80%+ dos casos (validar com 20 episódios teste)
- [ ] Confidence score é calibrado (>0.7 = geralmente correto)
- [ ] Issues detectados são úteis e acionáveis
- [ ] Tempo de mapeamento < 30s
- [ ] Custo de mapeamento < $0.10 por episódio

---

### 5. Interface Visual de Mapeamento ⚡ Prioridade ALTA

**O que faz:**
- Mostra template (lado esquerdo) e segmentos (lado direito)
- Visualiza mapeamento com cores e conexões
- Permite ajustes manuais (drag & drop)
- Indica issues com ícones e cores

**Wireframe (ASCII):**
```
┌────────────────────────────────────────────────────────────────┐
│  Estruturar Episódio: "Como usar IA no dia a dia"             │
│  Template: Podcast Educacional                      [Voltar]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  TEMPLATE                        SEUS SEGMENTOS               │
│  ────────────                    ──────────────                │
│                                                                │
│  ✅ 1. Hook (0:30-1:00)          ┌──────────────┐             │
│     "Frase impactante..."        │ Seg #1 (0:45)│◄────┐       │
│     [Preview 🎧]                  │ "Você sabia" │     │       │
│                                  └──────────────┘     │       │
│                                                       │       │
│  ✅ 2. Apresentação (1-2min)     ┌──────────────┐     │       │
│     "Quem você é..."             │ Seg #2 (1:20)│◄────┤       │
│     [Preview 🎧]                  │ "Olá, sou..."│     │       │
│                                  └──────────────┘     │       │
│                                                       │       │
│  ⚠️ 3. Contexto (2-4min)         ┌──────────────┐     │       │
│     "Por que importa"            │ Seg #3 (1:45)│◄────┤       │
│     [Preview 🎧] [Gravar +]       │ "A IA está" │     │       │
│     ⚠️ Muito curto (1:45min)      └──────────────┘     │       │
│                                                       │       │
│  ✅ 4. Solução (8-15min)         ┌──────────────┐     │       │
│     "Ensine o conceito"          │ Seg #4 (4:20)│◄────┤       │
│     [Preview 🎧]                  │ "Primeiro..."│     │       │
│                                  ├──────────────┤     │       │
│                                  │ Seg #5 (5:10)│◄────┤       │
│                                  │ "Segundo..." │     │       │
│                                  ├──────────────┤     │       │
│                                  │ Seg #6 (3:30)│◄────┤       │
│                                  │ "Por fim..." │     │       │
│                                  └──────────────┘     │       │
│                                                       │       │
│  ❌ 5. Exemplo (2-5min)          [Nenhum segmento]    │       │
│     "Demonstração prática"                            │       │
│     [Gravar Agora] [Pular]                            │       │
│                                                       │       │
│  ✅ 6. Recap (1-2min)            ┌──────────────┐     │       │
│     "Resumo dos pontos"          │ Seg #7 (1:30)│◄────┤       │
│     [Preview 🎧]                  │ "Recapitula" │     │       │
│                                  └──────────────┘     │       │
│                                                       │       │
│  ✅ 7. CTA (0:30-1min)           ┌──────────────┐     │       │
│     "Próximo passo"              │ Seg #8 (0:50)│◄────┘       │
│     [Preview 🎧]                  │ "Se gostou" │             │
│                                  └──────────────┘             │
│                                                                │
│  ┌────────────────────────────────────────┐                  │
│  │ Segmentos Não Usados (2)               │                  │
│  ├────────────────────────────────────────┤                  │
│  │ • Seg #9 (2:10) - "Tangente sobre XYZ" │                  │
│  │ • Seg #10 (1:30) - "Repetição de ideia"│                  │
│  └────────────────────────────────────────┘                  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  📊 Status: 6/7 slots preenchidos                             │
│  ⏱️ Duração Total: 19:30min ✓ (meta: 15-30min)                │
│  ⚠️ 1 issue: Contexto muito curto                              │
│  ❌ 1 slot faltando: Exemplo prático                           │
│                                                                │
│  [Pré-visualizar Episódio] [Ajustar Manualmente] [Exportar]  │
└────────────────────────────────────────────────────────────────┘
```

**Features da Interface:**
1. **Preview Button**: Play o áudio daquele slot específico
2. **Drag & Drop**: Arrastar segmentos entre slots
3. **Gravar +**: Abre modal de inline recording
4. **Status Icons**:
   - ✅ Green checkmark = OK
   - ⚠️ Yellow warning = Problema menor (muito curto/longo)
   - ❌ Red X = Faltando (required slot vazio)
5. **Conexões Visuais**: Linhas conectando segmentos aos slots
6. **Badges de Duração**: Mostrar duração atual vs ideal

**Componentes React:**
```typescript
<TemplateMappingView
  template={template}
  segments={segments}
  mapping={aiGeneratedMapping}
  issues={validationIssues}
  onMappingChange={(newMapping) => saveMapping(newMapping)}
  onPreview={(slotId) => playSlotAudio(slotId)}
  onRecord={(slotId) => openRecordingModal(slotId)}
  onExport={() => generateFinalEpisode()}
/>
```

**Acceptance Criteria:**
- [ ] Interface carrega em < 2s
- [ ] Drag & drop funciona suave (60fps)
- [ ] Preview audio play em < 1s
- [ ] Responsive (funciona em tablet, não precisa mobile)
- [ ] Acessível (keyboard navigation, screen readers)
- [ ] Estado é salvo automaticamente (autosave a cada 5s)

---

### 6. Export MP3 Simples ⚡ Prioridade MÉDIA

**O que faz:**
- Gera arquivo MP3 final baseado no mapeamento
- Inclui apenas os segmentos mapeados, na ordem dos slots
- Download direto do arquivo

**Flow:**
```
1. Usuário clica "Exportar"
2. Backend:
   - Pega áudio original
   - Extrai trechos mapeados (usando timestamps)
   - Concatena na ordem correta
   - Aplica fade in/out entre transições
   - Normaliza volume
   - Exporta MP3 (192kbps)
3. Progress bar mostra andamento
4. Download automático quando pronto
```

**Specs Técnicas:**
```typescript
// Usando FFmpeg
const exportCommand = `
  ffmpeg
    -i input.mp3
    -ss ${segment1.startTime}
    -t ${segment1.duration}
    -af "afade=t=in:st=${segment1.startTime}:d=0.5,afade=t=out:st=${segment1.endTime-0.5}:d=0.5"
    segment1.mp3

  ffmpeg
    -i "concat:segment1.mp3|segment2.mp3|..."
    -acodec libmp3lame
    -b:a 192k
    -ar 44100
    output.mp3
`;

// Metadata
const addMetadata = {
  title: project.title,
  artist: user.name || "Created with AeroPod",
  album: "AeroPod Podcast",
  comment: "Edited with AeroPod - https://aeropod.com"
};
```

**Acceptance Criteria:**
- [ ] Export funciona para episódios de até 1h
- [ ] Tempo de export < 2min para 30min de áudio
- [ ] Qualidade de áudio não degrada (ABX test)
- [ ] Transições são suaves (fade in/out de 0.5s)
- [ ] Download automático após export
- [ ] Filename: `{project-title}-aeropod-{date}.mp3`

---

## ❌ Features EXPLICITAMENTE EXCLUÍDAS do MVP

> Importante: Não adicionar essas features até validar que o core funciona

### Não Incluir (Fase 1):
- ❌ Gravação remota
- ❌ Múltiplos templates
- ❌ Templates customizáveis
- ❌ Collaboration (múltiplos usuários no mesmo projeto)
- ❌ Comentários e annotations
- ❌ Version history
- ❌ Analytics dashboard
- ❌ Auto-publish em plataformas
- ❌ Clips para social media
- ❌ Transcrição editável
- ❌ Text-to-speech
- ❌ Background music library
- ❌ Sound effects
- ❌ Intro/Outro templates
- ❌ Advanced audio editing (EQ, compression, etc)
- ❌ Mobile app
- ❌ Offline mode
- ❌ API pública
- ❌ Webhooks
- ❌ White-label

### Por que Excluir?
1. **Foco**: Validar template mapping primeiro
2. **Velocidade**: MVP em 4 semanas, não 6 meses
3. **Recursos**: Time pequeno, budget limitado
4. **Aprendizado**: Usuários vão pedir o que realmente precisam

---

## 🎯 Definition of Done (MVP está pronto quando...)

### Técnico:
- [ ] Todos os 6 features core funcionam end-to-end
- [ ] Zero bugs críticos (P0)
- [ ] < 5 bugs médios (P1)
- [ ] Tempo total de upload → export < 20min para 30min de áudio
- [ ] Uptime > 95% (monitorado com UptimeRobot)
- [ ] Custo por episódio processado < $1.00

### UX:
- [ ] Onboarding completo em < 5min sem ajuda
- [ ] Time to first value < 10min (upload até ver mapeamento)
- [ ] 3+ pessoas conseguiram editar episódio completo sem bugs
- [ ] NPS > 30 com beta testers

### Produto:
- [ ] 1 template completo e testado
- [ ] Documentação básica (FAQ, tutoriais)
- [ ] Landing page com proposta de valor clara
- [ ] Pricing definido e sistema de pagamento funcionando

### Legal/Compliance:
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] GDPR compliance básico (data deletion)
- [ ] Stripe KYC completo

---

## 📊 Métricas de Sucesso do MVP

### Semana 1 pós-launch:
```
Target (Conservador):
- 50 signups
- 25 uploads
- 10 episódios exportados
- 2 paying customers

Target (Otimista):
- 100 signups
- 60 uploads
- 30 episódios exportados
- 8 paying customers
```

### Mês 1:
```
- 200 signups
- 100 episódios processados
- 15 paying customers ($285 MRR)
- Activation rate > 40%
- Week 1 retention > 50%
```

---

## 🚀 Ordem de Implementação (Sprint by Sprint)

### Sprint 1 (Semana 1):
- [ ] Setup infra (DB, storage, auth)
- [ ] Upload de áudio funcional
- [ ] Transcrição com Whisper
- [ ] DB schema para projects, segments, templates

### Sprint 2 (Semana 2):
- [ ] Segmentação semântica (algoritmo + IA)
- [ ] Template Educacional (data structure)
- [ ] Mapeamento automático (IA integration)

### Sprint 3 (Semana 3):
- [ ] UI do mapeamento visual
- [ ] Preview de áudio por slot
- [ ] Validação e issues detection

### Sprint 4 (Semana 4):
- [ ] Export MP3
- [ ] Polimento de UX
- [ ] Bug fixes
- [ ] Deploy to production
- [ ] Beta testing com 5-10 pessoas

---

**Próximo:** [02-validation-strategy.md](./02-validation-strategy.md) - Como validar se vale a pena construir isso
