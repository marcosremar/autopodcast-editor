# 06 - Roadmap & Timeline

> **Princípio:** Ship fast, learn fast, iterate fast.

## 📅 Timeline Geral (12 Semanas até Public Launch)

```
Semana 1-2:   Validação
Semana 3-6:   MVP Development
Semana 7-10:  Private Beta
Semana 11-12: Public Launch
Semana 13+:   Growth & Scale
```

---

## 🔬 FASE 0: Validação (Semanas 1-2)

**Objetivo:** Confirmar que vale a pena construir

### Semana 1: Research & Interviews

| Dia | Tarefa | Responsável | Deliverable |
|-----|--------|-------------|-------------|
| Seg | Recrutar 15 podcasters | Marcos | 15 calls agendadas |
| Ter-Sex | Realizar 10 entrevistas | Marcos | 10 transcrições |
| Sab | Análise de entrevistas | Marcos | Report de insights |
| Dom | Descanso / Planning | - | - |

**Checklist Diária:**
- [ ] 3 DMs no Twitter para podcasters
- [ ] 2 posts em comunidades (Reddit, Facebook)
- [ ] 2 entrevistas realizadas
- [ ] Transcrição e notas das entrevistas

---

### Semana 2: Survey + Landing Page

| Dia | Tarefa | Deliverable | Status |
|-----|--------|-------------|--------|
| Seg | Criar survey (Typeform) | Link funcionando | ⬜ |
| Ter | Distribuir survey | 50+ respostas | ⬜ |
| Qua | Landing page (design) | Figma mockup | ⬜ |
| Qui | Landing page (dev) | Deploy em Vercel | ⬜ |
| Sex | Traffic para LP | 100+ visitas | ⬜ |
| Sab | Análise de dados | Validation report | ⬜ |
| Dom | **GO/NO-GO Decision** | ✅ ou 🛑 | ⬜ |

**Success Criteria:**
- 100+ survey responses
- 200+ landing page emails
- 8/10 entrevistas positivas

**Decision Point:**
- ✅ GO → Começar desenvolvimento (Semana 3)
- 🛑 NO-GO → Pivotar ou abandonar

---

## 🔨 FASE 1: MVP Development (Semanas 3-6)

**Objetivo:** Construir mínimo viável que funciona end-to-end

### Semana 3: Foundation

**Sprint Goal:** Setup completo + Upload funcionando

**Tasks:**

**Backend/Infra:**
- [ ] Setup Vercel project
- [ ] Setup Postgres (Neon ou Supabase)
- [ ] Setup R2 bucket (Cloudflare) para áudio
- [ ] Drizzle schema: `projects`, `segments`, `templates`
- [ ] Auth funcionando (NextAuth ou Clerk)

**Frontend:**
- [ ] Layout base (dashboard skeleton)
- [ ] Upload component com drag & drop
- [ ] Progress bar de upload
- [ ] Integração upload → R2

**AI/Processing:**
- [ ] Setup Whisper API
- [ ] Queue system (Inngest ou QStash)
- [ ] Background job: transcrição

**Acceptance Test:**
- Usuário consegue:
  1. Fazer login
  2. Criar projeto
  3. Upload MP3 (até 100MB)
  4. Ver "processando..." status
  5. Ver transcrição completa quando pronto

**Daily Standup:**
- O que fiz ontem?
- O que farei hoje?
- Algum blocker?

---

### Semana 4: Segmentação + Template

**Sprint Goal:** IA detecta segmentos + Template educacional pronto

**Tasks:**

**Segmentação:**
- [ ] Algoritmo de detecção de segmentos
  - Embedding generation (OpenAI)
  - Similarity comparison
  - Segment boundaries
- [ ] IA classification (tipo, tópico, score)
- [ ] Persist segments no DB

**Template:**
- [ ] Data structure do template educacional
- [ ] Seed DB com template
- [ ] UI para mostrar template

**Backend:**
- [ ] Endpoint: `POST /api/segments/detect`
- [ ] Endpoint: `GET /api/templates`

**Acceptance Test:**
- Usuário vê:
  1. Lista de segmentos detectados
  2. Cada segmento com: timestamp, texto, tópico
  3. Template educacional disponível

---

### Semana 5: Mapeamento Automático

**Sprint Goal:** IA mapeia segmentos → slots do template

**Tasks:**

**IA Mapping:**
- [ ] Prompt engineering para mapeamento
- [ ] Integração com Claude/GPT-4
- [ ] Parse JSON response
- [ ] Validação de mapeamento
- [ ] Detecção de issues (missing, too short, etc)

**Backend:**
- [ ] Endpoint: `POST /api/mapping/auto`
- [ ] Persist mapping no DB
- [ ] Issues detection logic

**Acceptance Test:**
- Usuário clica "Mapear com Template Educacional"
- IA retorna mapeamento em < 30s
- Confidence score visível
- Issues claramente indicados

---

### Semana 6: UI de Mapeamento + Export

**Sprint Goal:** Interface visual + Export MP3 funcionando

**Tasks:**

**Frontend:**
- [ ] TemplateMappingView component
- [ ] Drag & drop de segmentos
- [ ] Preview audio player
- [ ] Status badges (✅ ⚠️ ❌)
- [ ] Unused segments list

**Export:**
- [ ] FFmpeg setup
- [ ] Concatenação de áudio
- [ ] Fade in/out entre segmentos
- [ ] Normalize volume
- [ ] Generate MP3 (192kbps)
- [ ] Download automático

**Backend:**
- [ ] Endpoint: `POST /api/export`
- [ ] Background job para export
- [ ] Progress tracking

**Acceptance Test (END-TO-END):**
- Usuário consegue:
  1. Upload áudio → ✅
  2. Ver segmentos detectados → ✅
  3. Mapear com template → ✅
  4. Ajustar manualmente (drag & drop) → ✅
  5. Exportar MP3 final → ✅
  6. Download arquivo → ✅

**Definition of DONE:**
- Zero bugs críticos (P0)
- < 3 bugs médios (P1)
- Funciona em Chrome, Safari, Firefox
- Mobile responsive (não precisa funcionar perfeitamente)
- Deploy em production

---

## 🧪 FASE 2: Private Beta (Semanas 7-10)

**Objetivo:** Validar com usuários reais, iterar rápido

### Semana 7: Beta Recruitment + Onboarding

**Tasks:**
- [ ] Email para waitlist (top 100)
- [ ] Selecionar 20 beta testers (diversidade de perfis)
- [ ] Criar Discord/Slack privado
- [ ] Onboarding docs (how-to guide)
- [ ] 1:1 onboarding calls (20x 15min)

**Success Criteria:**
- 20 beta users ativados
- 15+ editaram pelo menos 1 episódio
- Feedback inicial coletado

---

### Semana 8: Iterate Baseado em Feedback

**Daily Routine:**
- **Manhã:** Ler feedback do Discord/Slack
- **Tarde:** Implementar fixes/tweaks
- **Noite:** Ship updates
- **Repeat**

**Priorização (Eisenhower Matrix):**
```
Urgente + Importante = Ship hoje
Importante + Não urgente = Backlog v2
Urgente + Não importante = Quick fix
Não urgente + Não importante = Ignore
```

**Tracking:**
- [ ] Bugs reportados: XX (meta: resolver 90% em 24h)
- [ ] Feature requests: XX (catalogar, priorizar para v2)
- [ ] Testimonials: XX (meta: coletar 5+)

---

### Semana 9-10: Polimento + Testimonials

**Goals:**
- Eliminar todos bugs críticos
- UX ultra-polido (micro-interactions, loading states)
- Coletar 10+ testimonials com screenshot/video

**Tasks:**
- [ ] Bug bash (1 dia inteiro testando)
- [ ] Performance optimization (Lighthouse score > 90)
- [ ] Acessibilidade (WCAG 2.1 AA)
- [ ] Copy/microcopy review (fazer sentido?)
- [ ] Email asking for testimonials
- [ ] Case study com 2-3 power users

**Artifacts:**
- 10+ testimonials formatados
- 2 video testimonials (Loom)
- 1 detailed case study (blog post)

---

## 🚀 FASE 3: Public Launch (Semanas 11-12)

### Semana 11: Launch Prep

**Mon-Tue: Product Hunt Prep**
- [ ] Find hunter (reach out 1 week before)
- [ ] Write copy (tagline, description)
- [ ] Create thumbnail (eye-catching)
- [ ] Record demo video (60-90s)
- [ ] Prepare first comment (storytelling)
- [ ] Alert 30 supporters (upvote day 1)

**Wed-Thu: Launch Assets**
- [ ] Twitter announcement thread
- [ ] LinkedIn post
- [ ] Email para waitlist (500+)
- [ ] Reddit posts (3-4 communities)
- [ ] Facebook groups posts

**Fri: Final Testing**
- [ ] Smoke tests em production
- [ ] Payment flow funcionando (Stripe)
- [ ] Email automations testadas
- [ ] Monitoring setup (Sentry, LogRocket)

---

### Semana 12: LAUNCH WEEK 🎉

**D-Day (Terça ou Quarta):**

```
Timeline (PST):

00:01 - Product Hunt vai ao ar
00:05 - Primeiro comment (founder story)
00:10 - 30 supporters upvotam
01:00 - Twitter announcement
02:00 - Email waitlist (batches de 100)
03:00 - Reddit posts
05:00 - LinkedIn post
08:00 - Check ranking (top 5?)
10:00 - Respond ALL comments
12:00 - Twitter updates
14:00 - Mid-day push
18:00 - Final push (email amigos, família)
22:00 - Livestream recap (Twitter Spaces?)
23:59 - Count final votes

Day 2-7:
- Follow-up emails para leads
- Convert free signups → paid
- Keep responding comments
- Share wins no Twitter
```

**Target Metrics:**
- Product Hunt: top 5 do dia
- 500+ visitas na landing page
- 100+ signups no dia do launch
- 10+ customers pagantes na semana

---

## 📈 FASE 4: Growth (Semanas 13-24)

### Semana 13-16: Otimização

**Focus Areas:**
1. **Activation:** Aumentar % de signups que editam episódio
   - Onboarding melhorado
   - Welcome email sequence
   - Tutorial interativo

2. **Conversion:** Free → Paid
   - Mostrar valor rapidamente
   - Limitação clara do free tier
   - Incentivo (50% OFF primeiro mês)

3. **Retention:** Reduzir churn
   - Identificar pontos de drop-off
   - Engagement emails (tips)
   - "Missing you" campaigns

**Weekly Metrics to Watch:**
```
Week 13: Activation X% → target X+5%
Week 14: Conversion X% → target X+3%
Week 15: Churn X% → target X-2%
Week 16: MRR $XXX → target +20%
```

---

### Semana 17-20: Content & SEO

**Content Calendar (2x/semana):**
- [ ] "7 Templates de Podcast (PDF grátis)"
- [ ] "Como Estruturar Podcast Educacional (Guia)"
- [ ] "IA vs Manual: Qual Mais Rápido?"
- [ ] "Case Study: X economizou 20h/mês"

**SEO:**
- [ ] 10 keywords mapeadas
- [ ] Internal linking entre posts
- [ ] Backlinks (guest posts, parcerias)

**Goal:** 1000+ organic visits/mês até Semana 20

---

### Semana 21-24: Partnerships & Scale

**Partnerships:**
- [ ] Reach out para 10 potenciais parceiros
- [ ] 3 calls de discovery
- [ ] 1 partnership fechado (ideal)

**Referral Program:**
- [ ] Launch referral program
- [ ] 10+ active referrers
- [ ] Viral coefficient > 1.1

**Ads Experiment (se MRR > $1k):**
- Budget: $500
- Channels: Meta, Google, Twitter
- CAC target: < $50
- Test, measure, scale

**Goal End of Month 6:**
- 500 total users
- 100 paying customers
- $2,000 MRR
- Churn < 10%
- NPS > 40

---

## 🗓️ Weekly Rituals

### Monday Morning (Planning)
```
- Review previous week metrics
- Set goals for current week (OKRs)
- Prioritize tasks (top 3 must-dos)
- Update roadmap if needed
```

### Friday Afternoon (Retrospective)
```
- What went well?
- What didn't go well?
- What to improve next week?
- Celebrate wins (however small)
```

### Sunday Night (Prep)
```
- Read industry news (podcasting trends)
- Plan content for week
- Respond to community (Reddit, Twitter)
```

---

## 📊 Success Metrics by Phase

### End of Phase 1 (Week 6):
- ✅ MVP funcionando end-to-end
- ✅ 3 pessoas testaram com sucesso
- ✅ Zero bugs críticos

### End of Phase 2 (Week 10):
- ✅ 20 beta testers ativos
- ✅ 10+ testimonials coletados
- ✅ NPS > 30
- ✅ 2 case studies publicados

### End of Phase 3 (Week 12):
- ✅ Product Hunt top 5
- ✅ 200+ signups (total)
- ✅ 15+ paying customers ($285 MRR)

### End of Phase 4 (Week 24):
- ✅ 500 total users
- ✅ 100 paying customers ($2k MRR)
- ✅ Churn < 10%
- ✅ 1000+ organic visits/mês

---

## 🚨 Red Flags & Contingency Plans

### Red Flag #1: Low Signups Post-Launch
**If:** < 50 signups in Week 12
**Then:**
- Analyze traffic sources (where are people NOT coming from?)
- A/B test landing page copy/design
- Double down on communities (more helpful content)
- Consider paid ads experiment ($100)

### Red Flag #2: High Churn (> 15%)
**If:** Losing 15%+ customers monthly
**Then:**
- Interview churned users (exit surveys)
- Identify pattern (why they left?)
- Fix core issue before acquiring more
- Potentially pause paid acquisition

### Red Flag #3: Zero Conversion (Free → Paid)
**If:** 100+ free users, 0 paid after 30 days
**Then:**
- Pricing too high? Test $9/mês
- Value not clear? Improve onboarding
- Free tier too generous? Add limitations
- Talk to 10 free users: "what's missing?"

---

## ✅ Go-Live Checklist (Before Public Launch)

### Legal
- [ ] Terms of Service (use template + lawyer review)
- [ ] Privacy Policy (GDPR compliant)
- [ ] Cookie consent banner
- [ ] DMCA policy (user-generated content)

### Payment
- [ ] Stripe account verified (KYC complete)
- [ ] Test payment flow (credit card → success)
- [ ] Webhook setup (subscription events)
- [ ] Invoices auto-generated

### Technical
- [ ] SSL certificate active (https)
- [ ] Error monitoring (Sentry)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Backups automáticos (DB daily)
- [ ] Rate limiting (prevent abuse)

### Support
- [ ] Help docs / FAQ (10+ articles)
- [ ] Contact email (hello@aeropod.com)
- [ ] Intercom or crisp.chat
- [ ] Canned responses preparados

### Marketing
- [ ] Landing page final review
- [ ] Email sequences configuradas
- [ ] Analytics setup (PostHog, GA4)
- [ ] Social media accounts criados (@aeropod)

---

**Fim do Roadmap. Próximos passos: Executar Fase 0 (Validação)!** 🚀
