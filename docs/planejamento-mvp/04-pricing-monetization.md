# 04 - Pricing & Monetização

## 💰 Estrutura de Pricing (MVP)

### Free Tier (Acquisition)
```
✅ 1 episódio/mês
✅ Até 15 minutos de áudio
✅ 1 template (Educacional)
✅ Transcrição + segmentação automática
✅ Export MP3 básico
❌ Sem watermark removal
❌ Sem support prioritário
```

**Por que Free Tier?**
- Baixar barreira de entrada
- Let users "taste" o produto
- Viral growth (compartilhamento)
- Convert quando virem valor

---

### Pro - $19/mês (Revenue Core)
```
✅ Episódios ILIMITADOS
✅ Até 1h de áudio por episódio
✅ Todos os templates
✅ Template mapping avançado
✅ Sem watermark
✅ Export em alta qualidade
✅ Support por email
✅ Access a new features first
```

**Target:** Podcasters sérios (1+ episódio/semana)

**Valor:** Economiza 4-6h/episódio = 16-24h/mês
- Freelancer cobra $50/h editing = $800-1200/mês economizado
- ROI: 42-63x

---

## 📊 Unit Economics

```
COGS (Cost of Goods Sold) por Customer/Mês:

Infra (Vercel, DB, storage): $2
AI APIs (Whisper, GPT-4): $5
Email/Support tools: $1
TOTAL COGS: $8/customer/mês

Gross Margin: ($19 - $8) / $19 = 58%

LTV (Customer Lifetime Value):
- Average lifetime: 12 meses
- Churn: 10%/mês
- LTV = $19 × 12 × (1-0.1) = $205

CAC (Customer Acquisition Cost):
- Organic (SEO, community): ~$0-5
- Paid (ads, partnerships): ~$30-50
- Blended CAC target: $20

LTV:CAC = 205:20 = 10.25x ✅ (excelente!)
```

---

## 🎯 Conversion Funnel

```
Landing Page Visitors
      ↓ (10% conversion)
Free Signups (100)
      ↓ (40% activation)
Active Users (40)
      ↓ (25% convert to paid)
Paying Customers (10)

MRR: 10 × $19 = $190
```

**Otimização:**
- Activation: 40% → 60% (melhorar onboarding)
- Conversion: 25% → 35% (mostrar valor mais rápido)
- Result: 100 visitors → 21 customers (+110%)

---

## 💳 Payment Strategy

**Stripe Integration:**
- Monthly recurring billing
- Auto-retry failed payments (3x)
- Dunning emails (cartão expirando)
- Easy cancellation (reduzir friction)

**Pricing Psychology:**
```
❌ $20.00/mês (parece caro)
✅ $19/mês (psicologicamente menor)

❌ Cobrar anualmente só
✅ Mensal first, anual opcional (67% discount = $12.50/mês)

❌ "Premium Plan"
✅ "Pro" (sounds better)
```

---

## 🚀 Growth Levers

1. **Referral:** Refer 3 friends = 1 mês grátis
2. **Annual Discount:** $228/ano → $150/ano (save $78)
3. **Early Bird:** Primeiros 100 customers = 50% OFF lifetime
4. **Student Discount:** 30% OFF com email .edu

---

## 📈 Revenue Projections (Conservador)

```
Mês 1: 5 Pro = $95 MRR
Mês 2: 15 Pro = $285 MRR
Mês 3: 35 Pro = $665 MRR
Mês 6: 100 Pro = $1,900 MRR
Mês 12: 300 Pro = $5,700 MRR

ARR (12 meses): $68,400
```

---

**Key Insight:** Pricing de $19/mês é sweet spot. Baixo o suficiente para converter creators individuais, alto o suficiente para ser sustentável.
