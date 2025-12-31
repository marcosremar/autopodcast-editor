# 🧪 Aeropod - Test Suite

Organização completa dos testes do sistema de templates.

## 📁 Estrutura de Testes

```
tests/
├── api/
│   └── test-template-system.sh    # Suite completa de testes API
├── README.md                       # Este arquivo
```

## 🚀 Como Executar os Testes

### Pré-requisitos
- Dev server rodando (`npm run dev`)
- PostgreSQL com banco de dados configurado
- Templates seeded no banco

### Executar Todos os Testes
```bash
./tests/api/test-template-system.sh
```

### Executar Testes Específicos
```bash
# Apenas Phase 1
curl -s http://localhost:3000/api/templates | jq

# Apenas Phase 3
curl -s http://localhost:3000/api/projects/[id]/missing-sections | jq

# Verificar um template específico
curl -s http://localhost:3000/api/templates/[template-id] | jq
```

## 📊 Cobertura de Testes

### ✅ Phase 1: Template System Basics (6 testes)
- GET /api/templates
- GET /api/templates/[id]
- POST /api/projects/[id]/select-template
- GET /api/projects/[id]/sections
- Validações de integridade

### ✅ Phase 2: AI Content Detection (1 teste)
- GET /api/projects/[id]/detect-type

### ✅ Phase 3: Section Management (2 testes)
- GET /api/projects/[id]/missing-sections
- GET /api/projects/[id]/sections/[sectionId]

### ✅ Phase 4: Section Approval (4 testes)
- PATCH update to review
- PATCH approve section
- Verify locking protection
- PATCH reopen section

### ✅ Integration Tests (2 testes)
- Complete workflow
- Stats calculation

## 📈 Últimos Resultados

**Data:** 30 de Dezembro de 2025
**Total:** 15 testes
**Passaram:** ✅ 15
**Falharam:** ❌ 0
**Taxa de Sucesso:** 100%

## 📝 Relatórios

### Relatório Completo
- **Arquivo:** `/RELATORIO_TESTES_TEMPLATE_SYSTEM.md`
- **Conteúdo:** Análise detalhada de todos os testes, resultados, e conclusões

### Relatório de Execução
- **Diretório:** `/tmp/aeropod-test-report/`
- **Formato:** Markdown com timestamp
- **Exemplo:** `test-report-20251230_223428.md`

## 🎯 Endpoints Testados

| Endpoint | Método | Status | Testes |
|----------|--------|--------|--------|
| /api/templates | GET | ✅ | 2 |
| /api/templates/[id] | GET | ✅ | 2 |
| /api/projects/[id]/select-template | POST | ✅ | 1 |
| /api/projects/[id]/sections | GET | ✅ | 1 |
| /api/projects/[id]/sections/[sectionId] | GET | ✅ | 1 |
| /api/projects/[id]/sections/[sectionId] | PATCH | ✅ | 4 |
| /api/projects/[id]/missing-sections | GET | ✅ | 2 |
| /api/projects/[id]/detect-type | GET | ✅ | 1 |

## 🔍 Cenários Testados

### Fluxos Principais
1. ✅ Listar templates disponíveis
2. ✅ Visualizar detalhes de template com seções
3. ✅ Aplicar template a um projeto
4. ✅ Verificar criação automática de seções
5. ✅ Acompanhar progresso de seções
6. ✅ Aprovar seções individualmente
7. ✅ Proteger seções aprovadas de modificação
8. ✅ Reabrir seções para revisão

### Edge Cases
1. ✅ Aplicar template múltiplas vezes
2. ✅ Modificar seção aprovada (deve falhar)
3. ✅ Reabrir seção aprovada (deve funcionar)
4. ✅ Calcular estatísticas com 0% progresso
5. ✅ Identificar seções faltantes

## 🐛 Debugging

### Logs de Teste
Os logs são salvos automaticamente em:
```bash
/tmp/test-output.log
```

### Ver Logs em Tempo Real
```bash
tail -f /tmp/test-output.log
```

### Verificar Estado do Banco
```bash
# Templates
psql -d aeropod -c "SELECT id, name, category FROM templates;"

# Seções de um projeto
psql -d aeropod -c "SELECT name, status, order FROM project_sections WHERE project_id = '[id]';"

# Estatísticas
psql -d aeropod -c "SELECT status, COUNT(*) FROM project_sections GROUP BY status;"
```

## 🔧 Troubleshooting

### Testes Falhando?

1. **Verificar dev server:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Verificar banco de dados:**
   ```bash
   psql -d aeropod -c "SELECT COUNT(*) FROM templates;"
   # Deve retornar 4
   ```

3. **Re-seed templates:**
   ```bash
   npx tsx scripts/seed-templates.ts
   ```

4. **Limpar duplicatas:**
   ```bash
   # Executar script de limpeza se necessário
   ```

## 📚 Documentação Adicional

- **Relatório Completo:** `/RELATORIO_TESTES_TEMPLATE_SYSTEM.md`
- **Plan File:** `~/.claude/plans/warm-floating-coral.md`
- **Script de Testes:** `/tests/api/test-template-system.sh`

## 🎉 Status Atual

✅ **TODOS OS TESTES APROVADOS**

O sistema de templates está 100% funcional e pronto para uso!

---

*Última atualização: 30 de Dezembro de 2025*
