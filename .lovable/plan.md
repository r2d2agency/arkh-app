
## ✅ O QUE JÁ EXISTE

| Módulo | Status |
|--------|--------|
| Auth email/senha | ✅ Pronto |
| Multi-tenant (Super Admin, Admin Igreja, Membro) | ✅ Pronto |
| Super Admin (Dashboard, Churches, Users, AI, Agents, Plans, Logs, Settings) | ✅ Pronto |
| Painel Admin Igreja (Cultos, Membros, Grupos, Customizar, Config) | ✅ Pronto |
| Pipeline IA (YouTube → Transcrição → IA → Resumo) | ✅ Pronto (recém melhorado) |
| Seleção de provedor IA por culto | ✅ Pronto |
| Prompt customizável por igreja | ✅ Pronto |
| Correlação entre pregações | ✅ Pronto |
| Member Home (saudação, humor, devocional, atalhos, cultos recentes) | ✅ Pronto |
| Tela de detalhe do culto (vídeo, resumo, tópicos, versículos, anotações) | ✅ Básico (precisa atualizar para novo formato IA) |
| Reflexão do dia (humor → versículo + reflexão) | ✅ Básico (sem IA real) |
| Explorar (busca + categorias) | ✅ Básico (sem IA real) |
| Meu Caderno (anotações localStorage) | ✅ Básico (sem persistência DB) |
| Notificações | ✅ Página existe |
| Perfil | ✅ Página existe |
| Bottom nav PWA-style | ✅ Pronto |
| Admin sidebar overlay para mobile | ✅ Pronto |

## ❌ O QUE FALTA (por prioridade)

### FASE 1 - CORE (Experiência membro completa)
1. **Atualizar ServiceDetail** — usar novo formato IA (aplicações práticas, perguntas reflexivas, conexões, contexto teológico, estrutura do sermão)
2. **Persistir Caderno no DB** — migrar de localStorage para tabela study_notes
3. **Salvar versículos do culto** — botão salvar versículo → caderno
4. **Reflexão com IA real** — integrar com provedor IA para reflexão personalizada baseada no humor
5. **Busca inteligente real** — buscar nos cultos processados (full-text search nos campos IA)

### FASE 2 - ESTUDO
6. **Estudos bíblicos manuais** — CRUD para igreja criar estudos (título, tópicos, versículos, perguntas)
7. **Trilhas de estudo** — sequência de conteúdos com progresso
8. **Vínculos inteligentes** — conectar cultos, estudos e versículos
9. **Bíblia integrada** — API de versículos para consulta inline

### FASE 3 - COMUNIDADE
10. **Grupos completos** — recados, conteúdos, estudos, enquetes (sem chat)
11. **Enquetes** — criar perguntas/votações, IA sugere perguntas do culto
12. **Agenda/Eventos** — cultos, encontros, reuniões

### FASE 4 - AVANÇADO
13. **Modo áudio** — player de background
14. **Escola bíblica** — classes, professores, lições
15. **Guias de estudo** — sequência com progresso
16. **Onboarding** — coletar interesses espirituais
17. **PWA completo** — manifest, icons, install prompt

### FASE 5 - REFINAMENTO
18. **Devocional dinâmico com IA** — baseado nos cultos da igreja
19. **Sugestões personalizadas** — baseado nos interesses do membro
20. **Continuar assistindo** — tracking de progresso de vídeo

## RECOMENDAÇÃO

Começar pela **FASE 1** — isso transforma a experiência do membro de "básica" para "funcional e rica". São ~5 tarefas focadas que fazem toda a diferença.
