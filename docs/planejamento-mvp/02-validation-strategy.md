# 02 - Estratégia de Validação

> **Princípio:** Não construa nada até ter evidências de que as pessoas querem e pagariam por isso.

## 🎯 Hipóteses a Validar (ANTES de construir)

### Hipótese #1: O Problema Existe e É Grande
```
"Podcasters gastam 4+ horas editando episódios de 30min
e consideram isso um dos maiores pain points."
```

**Como Validar:**
- [ ] 10 entrevistas com podcasters (1-10k ouvintes)
- [ ] Survey com 50+ respondentes
- [ ] Análise de Reddit, Twitter, fóruns (pain points mencionados)

**Critério de Sucesso:**
- 7/10 entrevistados confirmam: edição é top 3 pain points
- Survey: 60%+ gastam 3+ horas editando
- Reddit/Twitter: 20+ posts nos últimos 3 meses sobre "podcast editing sucks"

---

### Hipótese #2: Template Mapping É Valioso
```
"Podcasters pagariam por uma ferramenta que mapeia conteúdo
existente em estruturas prontas de podcast."
```

**Como Validar:**
- [ ] Mostrar protótipo (Figma) em entrevistas
- [ ] Medir reação: "quanto você pagaria?"
- [ ] Teste A/B: landing page com/sem mencionar templates

**Critério de Sucesso:**
- 6/10 entrevistados dizem "eu pagaria $15-30/mês por isso"
- Landing page com templates tem 2x+ conversion vs genérica
- 3+ pessoas pedem "quando lança?"

---

### Hipótese #3: Mercado Suficientemente Grande
```
"Existem 10,000+ podcasters no Brasil dispostos a pagar $20/mês
por uma ferramenta de edição com IA."
```

**Como Validar:**
- [ ] Research de mercado (Spotify, Apple Podcasts)
- [ ] Análise de concorrentes (Descript revenue estimado)
- [ ] Cálculo de TAM/SAM/SOM

**Dados a Coletar:**
- Quantos podcasts ativos no Brasil? (est. 50k+)
- Quantos editam manualmente? (est. 70% = 35k)
- Quantos pagariam $20/mês? (est. 20% = 7k)
- **TAM**: 7k × $20 × 12 = $1.68M/ano

**Critério de Sucesso:**
- SOM (Serviceable Obtainable Market) > $100k/ano
- Competitor revenue > $1M/ano (prova que mercado paga)

---

## 📋 Plano de Validação (2 Semanas)

### Semana 1: Research & Interviews

**Dia 1-2: Recruitment**
- [ ] Postar em grupos de podcasters (Facebook, Discord, Reddit)
- [ ] DM para 30 podcasters no Twitter
- [ ] Email para 20 contacts pessoais que fazem podcast
- **Meta**: 15 pessoas agendadas

**Dia 3-5: Entrevistas (10x)**
Template de perguntas:
```markdown
## Entrevista de Validação - AeroPod

Olá! Obrigado por aceitar conversar. Estou validando uma ideia de ferramenta para podcasters e quero entender seus desafios.

**Contexto:**
1. Há quanto tempo faz podcast?
2. Frequência: quantos episódios/mês?
3. Duração típica dos episódios?
4. Você edita ou tem editor?

**Pain Points:**
5. Qual a parte mais CHATA/DEMORADA do processo de podcast?
6. Quanto tempo gasta editando um episódio de 30min?
7. O que você faria se tivesse 4h a mais por semana?

**Solução:**
8. [Mostrar protótipo] Se existisse uma ferramenta que faz X, você usaria?
9. Quanto você pagaria por mês por isso?
10. O que te faria cancelar depois de 1 mês?

**Objeções:**
11. Por que você não usa Descript / Riverside / Outro?
12. O que é mais importante: velocidade ou qualidade?

**Close:**
13. Posso te adicionar na waitlist? (coletar email)
14. Conhece outros podcasters que se beneficiariam? (referral)
```

**Análise:**
- Transcrever todas entrevistas
- Identificar patterns (pain points repetidos)
- Score cada entrevista (1-5): quão animados ficaram?

---

**Dia 6-7: Survey Online**

Criar survey no Typeform/Google Forms:
```markdown
## Survey: Edição de Podcast em 2025

**Screener:**
□ Faço podcast atualmente (1+ episódios/mês)
□ Fiz podcast no passado (parei)
□ Planejo fazer podcast
□ Nunca fiz e não planejo (agradecer e desqualificar)

**Edição:**
1. Quem edita seus episódios?
   - Eu mesmo
   - Outra pessoa do time
   - Editor freelancer
   - Ferramenta automática (qual?)

2. Tempo gasto editando episódio de 30min:
   - < 1h
   - 1-2h
   - 2-4h
   - 4-6h
   - 6h+

3. Principais desafios na edição (escolha até 3):
   - Demora muito
   - Não sei cortar direito
   - Difícil organizar/estruturar
   - Qualidade de áudio ruim
   - Falta de ferramentas boas
   - Caro contratar editor

4. Ferramentas que usa hoje:
   - Audacity (grátis)
   - GarageBand (grátis)
   - Adobe Audition ($)
   - Descript ($$)
   - Riverside ($)
   - Outro: _____

5. Quanto paga/pagaria por ferramenta de edição com IA?
   - $0 (só uso grátis)
   - $5-10/mês
   - $10-20/mês
   - $20-50/mês
   - $50+/mês

6. [Mostrar conceito] Você usaria uma ferramenta que...
   Analisa seu áudio, detecta segmentos, e mapeia em estruturas prontas de podcast (ex: educacional, entrevista)?
   - Com certeza
   - Provavelmente
   - Talvez
   - Provavelmente não
   - Com certeza não

7. Email (se quiser entrar na waitlist): _______
```

**Distribuição:**
- Grupos de podcasters (Brasil Podcasters, etc)
- Reddit: r/podcasting, r/podcasters
- Twitter com thread explicando
- **Meta**: 100 respostas em 7 dias

---

### Semana 2: Landing Page + Waitlist

**Dia 8-9: Criar Landing Page**

Estrutura (inspiração: Lemon Squeezy sales pages):
```
────────────────────────────────────
HERO SECTION
────────────────────────────────────
[Logo AeroPod]

Edite seu podcast em 15 minutos,
não 4 horas.

IA que estrutura, corta e organiza seu episódio
automaticamente. Escolha um formato, cole o áudio,
receba episódio pronto.

[Entrar na Waitlist] [Ver Demo ▶]
                 ↓
            (video 60s)

────────────────────────────────────
PROBLEMA
────────────────────────────────────
Você ama fazer podcast.
Mas ODEIA editar.

❌ Gasta 4-6 horas editando 30min de áudio
❌ Nunca sabe o que cortar ou manter
❌ Estrutura confusa, episódio "enrolado"
❌ Ferramentas complicadas (Audacity, Adobe)

Resultado: publica menos do que gostaria
          ou desiste do podcast.

────────────────────────────────────
SOLUÇÃO
────────────────────────────────────
AeroPod faz 80% do trabalho por você:

1️⃣ Cole seu áudio bruto (MP3, WAV, etc)
2️⃣ Escolha um formato (educacional, entrevista, storytelling)
3️⃣ IA analisa e estrutura automaticamente
4️⃣ Revise (se quiser) e exporte MP3 pronto

De 4 horas → 15 minutos. ⏱️

[Entrar na Waitlist]

────────────────────────────────────
COMO FUNCIONA (com screenshots)
────────────────────────────────────
[Screenshot 1: Upload]
Cole seu áudio, a gente transcreve e analisa

[Screenshot 2: Template]
Escolha um formato (ex: Podcast Educacional)

[Screenshot 3: Mapeamento]
IA mapeia seu conteúdo na estrutura ideal:
✅ Introdução (0:45)
✅ Contexto (3:20)
⚠️ Exemplo (faltando - grave 2min)
✅ Conclusão (1:30)

[Screenshot 4: Export]
Baixe MP3 editado e estruturado

────────────────────────────────────
SOCIAL PROOF
────────────────────────────────────
"Cortou meu tempo de edição de 5h para 20min.
Sério, mudou minha vida de podcaster."
- João Silva, @joaotech (10k ouvintes/mês)

"Finalmente consigo publicar semanalmente.
Antes era quinzenal porque edição tomava muito tempo."
- Maria Costa, Podcast XYZ

[Ver mais depoimentos]

────────────────────────────────────
COMPARAÇÃO
────────────────────────────────────
           Audacity  Descript  AeroPod
Grátis        ✅        ❌       ✅*
IA            ❌        ⚠️       ✅
Templates     ❌        ❌       ✅
Fácil         ❌        ⚠️       ✅

*Plano grátis: 1 episódio/mês

────────────────────────────────────
PRICING (PREVIEW)
────────────────────────────────────
🆓 Grátis: 1 episódio/mês (até 15min)
💎 Pro: $19/mês - ilimitado (até 1h)

Early birds (primeiros 100): 50% OFF vitalício!

[Garantir Meu Desconto →]

────────────────────────────────────
FAQ
────────────────────────────────────
Q: Quando lança?
A: Março 2025. Entre na waitlist para early access.

Q: Funciona em português?
A: Sim! PT-BR e EN.

Q: Posso usar meu próprio áudio?
A: Sim, upload de MP3/WAV/M4A.

Q: Preciso de conhecimento técnico?
A: Zero. Se sabe usar email, sabe usar AeroPod.

────────────────────────────────────
FINAL CTA
────────────────────────────────────
Pare de gastar horas editando.
Comece a publicar mais.

[Entrar na Waitlist - É Grátis]

Junte-se a 500+ podcasters esperando o lançamento.

[Twitter] [Instagram] [Email]
────────────────────────────────────
```

**Stack Técnico:**
- Next.js + Tailwind + shadcn/ui
- Resend para emails
- Postgres para waitlist
- Vercel Analytics

---

**Dia 10-12: Tráfego para Landing Page**

**Canais:**
1. **Organic Social**
   - Thread no Twitter explicando problema
   - Posts no LinkedIn (personal brand)
   - Reels/TikToks curtos (15s hook)

2. **Communities**
   - r/podcasting, r/Brasil
   - Grupos do Facebook
   - Discord de criadores

3. **Direct Outreach**
   - DM 50 podcasters: "oi, criei isso, o que acha?"
   - Email para contatos pessoais

4. **Paid (se budget permitir)**
   - $100 em Meta Ads (CPL estimado: $2 = 50 leads)
   - Target: homens/mulheres 25-45, interesse em podcast

**Meta**: 200 emails na waitlist em 5 dias

---

**Dia 13-14: Análise de Resultados**

Coletar dados:
```
QUALITATIVO:
- Entrevistas: X/10 animados
- Survey: X% dizem "com certeza" usariam
- Comments nas redes: sentiment analysis

QUANTITATIVO:
- Waitlist: X emails (meta: 200)
- Conversion rate: X% (meta: 15%)
- Survey responses: X (meta: 100)
- Pre-sales offers: X pessoas (meta: 5)

FINANCEIRO:
- Willingness to pay: média $X/mês
- TAM estimado: $X/ano
- CAC estimado: $X (ads spent / signups)
```

**Decisão GO/NO-GO:**
```
✅ GO se:
- 200+ waitlist emails
- 70%+ survey diz "com certeza" ou "provavelmente"
- 8/10 entrevistas positivas
- 3+ pessoas oferecem pagar antecipado

🔄 MAYBE (precisa ajustar):
- 100-200 emails (interest existe mas fraco)
- 50-70% survey positivo
- 5-7/10 entrevistas positivas
→ Ajustar proposta de valor e re-validar

🛑 NO-GO se:
- < 100 emails mesmo com esforço
- < 50% survey positivo
- < 5/10 entrevistas positivas
- Zero disposição para pagar
→ Pivotar ou abandonar
```

---

## 💡 Hacks de Validação Rápida

### 1. "Concierge MVP" (Manual)
Antes de construir IA:
- Oferecer para 5 podcasters: "envie seu áudio, eu edito manualmente usando template"
- Cobrar $10 por episódio
- Aprender workflow manual antes de automatizar
- Validar se resultado final é valioso

### 2. "Wizard of Oz" (Fake Door)
- Landing page com "Get Started"
- Quando clica → "Coming Soon! Email para waitlist?"
- Medir clicks = validar intenção

### 3. Pre-Sales
- Oferecer: "Pague $99 hoje, ganhe 12 meses quando lançar"
- Se 10 pessoas pagam = $990 = validado
- Use para financiar MVP

### 4. Competitor Analysis
```bash
# Scrape Descript reviews
- Ler 100 reviews no G2, Capterra
- Identificar: o que amam? o que odeiam?
- Feature gaps: o que pedem e não tem?

# Resultado esperado:
- 30% reclamam: "muito complicado"
- 20% pedem: "templates/estruturas prontas"
- 15% dizem: "caro demais"
→ AeroPod resolve os 3!
```

---

## 📊 Template de Report de Validação

```markdown
# Validation Report - AeroPod MVP

**Data:** [DD/MM/YYYY]
**Responsável:** [Nome]

## Summary
[3-5 linhas resumindo se validou ou não]

## Metrics

### Waitlist
- Emails coletados: XXX
- Conversion rate (visitas → email): X%
- Fonte principal: [Twitter/Reddit/Ads]

### Interviews (10)
- Confirmam problema: X/10
- Pagariam pela solução: X/10
- Score médio de entusiasmo (1-5): X.X

### Survey (XXX respostas)
- Gastam 3+ horas editando: X%
- Pagariam $20/mês: X%
- "Com certeza" usariam: X%

### Willingness to Pay
- Média: $X/mês
- Mediana: $X/mês
- Range: $X - $X

## Insights

**Principais Pain Points:**
1. [Insight 1]
2. [Insight 2]
3. [Insight 3]

**Objeções Comuns:**
1. [Objeção 1 + como resolver]
2. [Objeção 2 + como resolver]

**Feature Requests:**
- [Feature mais pedida] (XX menções)
- [Feature 2] (XX menções)

## Competitor Analysis
- Descript: $XXXk MRR estimado, X users
- Riverside: $XXM ARR estimado
- Market gap identificado: [XXXXX]

## Decision

□ GO - Construir MVP
  Rationale: [explicar]

□ PIVOT - Ajustar proposta
  Changes: [listar]

□ NO-GO - Não vale a pena
  Reasons: [explicar]

## Next Steps
- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

**Assinatura:** [Nome + Data]
```

---

**Próximo:** [03-go-to-market.md](./03-go-to-market.md) - Como conquistar os primeiros 100 usuários
