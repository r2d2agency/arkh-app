import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  HelpCircle, Search, ChevronLeft, Video, BookOpen, Users, GraduationCap,
  BarChart3, Calendar, Heart, Bell, Palette, Settings, Shield, Home,
  FileText, Sparkles, UserCheck, Lock, Share2, Bookmark,
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
  tags: string[];
}

interface FaqSection {
  title: string;
  icon: any;
  color: string;
  roles: string[];
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: 'Início e Navegação',
    icon: Home,
    color: 'text-primary',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como funciona a tela inicial?',
        a: 'A tela inicial mostra uma saudação personalizada, o devocional do dia (gerado por IA a partir dos cultos da sua igreja), seus atalhos rápidos para Cultos, Estudos, Escola Bíblica e Caderno, as turmas da EBD disponíveis, e os últimos cultos publicados. Se você tiver vídeos em progresso, a seção "Continuar Assistindo" também aparecerá.',
        tags: ['home', 'início', 'navegação'],
      },
      {
        q: 'O que é o humor do dia?',
        a: 'Na tela inicial você pode selecionar como está se sentindo (grato, em paz, motivado, feliz, desanimado, ansioso, confuso, cansado). Ao escolher, você pode clicar em "Receber reflexão personalizada" para ver um versículo e uma reflexão específica para o seu estado emocional.',
        tags: ['humor', 'reflexão', 'sentimento'],
      },
      {
        q: 'Como acesso as notificações?',
        a: 'Toque no ícone de sino (🔔) no canto superior direito da tela. Lá você verá avisos da igreja, atualizações de grupos, aprovações de matrícula e outras comunicações.',
        tags: ['notificações', 'sino', 'avisos'],
      },
    ],
  },
  {
    title: 'Cultos e Pregações',
    icon: Video,
    color: 'text-primary',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como assistir a um culto?',
        a: 'Acesse "Cultos" no menu inferior ou na tela inicial. Toque em qualquer culto para abrir a página de detalhes com o vídeo do YouTube, resumo gerado por IA, tópicos principais, versículos-chave e aplicações práticas.',
        tags: ['culto', 'vídeo', 'assistir'],
      },
      {
        q: 'O que são os ícones de IA nos cultos?',
        a: 'Quando um culto é processado pela IA, ele recebe um badge "IA" que indica que possui resumo inteligente, tópicos, versículos-chave, aplicações práticas, perguntas reflexivas e conexões com outras pregações. Tudo isso é gerado automaticamente a partir do vídeo.',
        tags: ['ia', 'inteligência artificial', 'resumo'],
      },
      {
        q: 'Como salvar um versículo de um culto?',
        a: 'Na página de detalhes do culto, os versículos-chave aparecem com um botão de salvar (ícone de bookmark). Ao tocar, o versículo é adicionado ao seu Caderno de Anotações para consulta futura.',
        tags: ['versículo', 'salvar', 'bookmark'],
      },
      {
        q: 'O que é "Continuar Assistindo"?',
        a: 'Se você parou de assistir um culto no meio, ele aparece na seção "Continuar Assistindo" na tela inicial com uma barra de progresso mostrando quanto já assistiu. Toque para retomar de onde parou.',
        tags: ['continuar', 'progresso', 'assistindo'],
      },
      {
        q: 'Como favoritar um culto?',
        a: 'Na página de detalhes do culto, toque no ícone de coração (❤️) para adicionar aos seus favoritos. Acesse todos os seus favoritos pelo ícone de coração no perfil ou atalho "Favoritos".',
        tags: ['favorito', 'coração', 'salvar'],
      },
    ],
  },
  {
    title: 'Estudos Bíblicos',
    icon: BookOpen,
    color: 'text-accent',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como acessar os estudos?',
        a: 'Toque em "Estudar" no menu inferior. Lá você encontra todos os estudos bíblicos publicados pela sua igreja, organizados por categoria e dificuldade.',
        tags: ['estudo', 'bíblico', 'acessar'],
      },
      {
        q: 'O que são as trilhas de estudo?',
        a: 'Trilhas são sequências organizadas de conteúdos (estudos e cultos) com um tema central. Você pode acompanhar seu progresso em cada trilha e avançar no seu próprio ritmo.',
        tags: ['trilha', 'progresso', 'sequência'],
      },
    ],
  },
  {
    title: 'Escola Bíblica (EBD)',
    icon: GraduationCap,
    color: 'text-emerald-500',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como me inscrever em uma turma da EBD?',
        a: 'Acesse a Escola Bíblica pelo ícone de chapéu (🎓) no topo da tela ou pelo atalho na Home. Veja as turmas disponíveis e toque em "Solicitar Matrícula". Sua solicitação ficará pendente até o professor ou admin da igreja aprovar.',
        tags: ['ebd', 'inscrição', 'matrícula', 'escola'],
      },
      {
        q: 'Como sei que fui aprovado na turma?',
        a: 'O status muda de "Aguardando aprovação" (badge amarelo) para "Matriculado" (badge verde). Você também receberá uma notificação. Após aprovado, pode acessar todas as aulas e conteúdos da turma.',
        tags: ['aprovação', 'status', 'matrícula'],
      },
      {
        q: 'Posso cancelar minha solicitação?',
        a: 'Sim! Enquanto sua solicitação estiver pendente, você pode tocar em "Cancelar Solicitação" para desistir.',
        tags: ['cancelar', 'desistir', 'solicitação'],
      },
      {
        q: 'Como vejo meu progresso na turma?',
        a: 'Dentro da turma, uma barra de progresso mostra quantas aulas você já participou do total. Cada aula com presença registrada aparece com um check verde.',
        tags: ['progresso', 'presença', 'aulas'],
      },
    ],
  },
  {
    title: 'Caderno de Anotações',
    icon: FileText,
    color: 'text-primary',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como funciona o Caderno?',
        a: 'O Caderno é seu espaço pessoal para anotar insights dos cultos, salvar versículos e registrar reflexões. Todas as anotações são salvas no banco de dados e sincronizadas entre dispositivos.',
        tags: ['caderno', 'anotações', 'notas'],
      },
      {
        q: 'Posso fazer anotações durante o culto?',
        a: 'Sim! Na página de detalhes do culto, há um campo de anotações. Tudo que você escrever fica vinculado àquele culto e aparece no seu Caderno.',
        tags: ['anotar', 'culto', 'escrever'],
      },
    ],
  },
  {
    title: 'Grupos',
    icon: Users,
    color: 'text-purple-500',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como participar de um grupo?',
        a: 'Os grupos são gerenciados pelo admin da igreja. Se você faz parte de um grupo (célula, departamento, etc.), ele aparecerá na sua lista. Dentro do grupo você pode ver recados, conteúdos compartilhados e enquetes.',
        tags: ['grupo', 'participar', 'célula'],
      },
    ],
  },
  {
    title: 'Enquetes',
    icon: BarChart3,
    color: 'text-blue-500',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como votar em uma enquete?',
        a: 'Acesse "Enquetes" e veja as votações abertas. Toque na opção desejada para registrar seu voto. Dependendo da configuração, você pode ver os resultados em tempo real.',
        tags: ['enquete', 'votar', 'votação'],
      },
    ],
  },
  {
    title: 'Agenda e Eventos',
    icon: Calendar,
    color: 'text-orange-500',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como ver os próximos eventos?',
        a: 'Toque em "Agenda" no menu inferior. Lá você vê o calendário com cultos, encontros, reuniões e eventos especiais da igreja.',
        tags: ['agenda', 'eventos', 'calendário'],
      },
    ],
  },
  {
    title: 'Devocional com IA',
    icon: Sparkles,
    color: 'text-primary',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'O que é o Devocional do Dia?',
        a: 'O devocional é gerado diariamente pela inteligência artificial com base nos últimos cultos da sua igreja. Ele traz um versículo e uma reflexão conectada ao que foi pregado, ajudando você a se aprofundar no conteúdo durante a semana.',
        tags: ['devocional', 'ia', 'diário'],
      },
      {
        q: 'O devocional muda todos os dias?',
        a: 'Sim! Um novo devocional é gerado a cada dia. Se a igreja tiver cultos processados pela IA, o devocional será baseado neles. Caso contrário, um versículo padrão será exibido.',
        tags: ['devocional', 'diário', 'atualização'],
      },
    ],
  },
  {
    title: 'Reflexão Personalizada',
    icon: Heart,
    color: 'text-pink-500',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como funciona a reflexão do humor?',
        a: 'Na tela inicial, escolha como você está se sentindo e toque em "Receber reflexão personalizada". Você receberá um versículo e uma reflexão específica para o seu estado emocional, com espaço para escrever livremente o que está no seu coração.',
        tags: ['reflexão', 'humor', 'personalizada'],
      },
    ],
  },
  {
    title: 'Explorar e Buscar',
    icon: Search,
    color: 'text-primary',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como buscar nos cultos?',
        a: 'Acesse "Explorar" pelos atalhos rápidos na Home. Digite qualquer tema, versículo, nome de pregador ou assunto. A busca procura em todos os cultos processados pela IA — nos títulos, resumos, tópicos e versículos-chave.',
        tags: ['busca', 'explorar', 'pesquisar'],
      },
    ],
  },
  {
    title: 'Perfil e Conta',
    icon: Lock,
    color: 'text-muted-foreground',
    roles: ['member', 'leader', 'admin_church'],
    items: [
      {
        q: 'Como alterar minha senha?',
        a: 'Vá ao Perfil (menu inferior) e toque em "Alterar Senha". Informe sua senha atual e a nova senha (mínimo 6 caracteres).',
        tags: ['senha', 'alterar', 'segurança'],
      },
      {
        q: 'Como sair do app?',
        a: 'No Perfil, role até o final e toque em "Sair". Você será redirecionado para a tela de login.',
        tags: ['sair', 'logout', 'desconectar'],
      },
    ],
  },

  // ====== ADMIN SECTIONS ======
  {
    title: 'Gerenciar Cultos (Admin)',
    icon: Video,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como adicionar um novo culto?',
        a: 'Abra o menu de administração (ícone de escudo dourado 🛡️ no topo). Vá em "Gerenciar Cultos" e toque em "Novo Culto". Informe o título, URL do YouTube, pregador, data e horários de recorte da IA (início/fim da pregação). Ao salvar, o culto fica disponível para os membros.',
        tags: ['culto', 'adicionar', 'criar', 'youtube'],
      },
      {
        q: 'Como processar um culto com IA?',
        a: 'Na lista de cultos, cada culto tem um botão "Processar com IA". Você pode selecionar qual provedor de IA usar. O processamento extrai a transcrição do vídeo e gera: resumo, tópicos principais, versículos-chave, aplicações práticas, perguntas reflexivas e conexões com outras pregações.',
        tags: ['processar', 'ia', 'transcrição'],
      },
      {
        q: 'Posso editar um culto depois de criado?',
        a: 'Sim! Toque no ícone de lápis ao lado do culto para editar título, URL, pregador, data e horários. Se alterar a URL, pode reprocessar com IA.',
        tags: ['editar', 'culto', 'alterar'],
      },
      {
        q: 'O que são os horários de recorte IA?',
        a: 'Os campos "Início IA" e "Fim IA" definem o intervalo do vídeo que a IA deve transcrever. Útil para pular louvores e avisos, processando apenas a pregação. Formato: minutos (ex: 15 para começar aos 15 minutos).',
        tags: ['recorte', 'horário', 'início', 'fim'],
      },
    ],
  },
  {
    title: 'Gerenciar Estudos (Admin)',
    icon: BookOpen,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como criar um estudo bíblico?',
        a: 'No menu admin, vá em "Estudos Bíblicos". Toque em "Novo Estudo" e preencha: título, descrição, categoria, dificuldade, conteúdo e versículos. Marque como "Publicado" para ficar visível aos membros.',
        tags: ['estudo', 'criar', 'bíblico'],
      },
      {
        q: 'Como criar uma trilha de estudo?',
        a: 'Nas configurações de estudos, você pode criar trilhas que organizam estudos e cultos em uma sequência com tema definido. Os membros podem acompanhar seu progresso na trilha.',
        tags: ['trilha', 'criar', 'sequência'],
      },
    ],
  },
  {
    title: 'Escola Bíblica - Admin',
    icon: GraduationCap,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como criar uma turma da EBD?',
        a: 'Menu admin → "Escola Bíblica" → "Nova Classe". Preencha: título, descrição, professor(a), categoria (crianças, jovens, adultos, novos membros, líderes), horário, máximo de alunos. Ative a turma para ficar visível.',
        tags: ['ebd', 'turma', 'criar', 'classe'],
      },
      {
        q: 'Como adicionar aulas a uma turma?',
        a: 'Abra a turma e vá na aba "Aulas". Toque em "Nova Aula" e preencha: título, descrição, conteúdo, versículo-chave, data da aula e ordem. Você pode adicionar recursos (PDFs, links).',
        tags: ['aula', 'adicionar', 'conteúdo'],
      },
      {
        q: 'Como aprovar matrículas de alunos?',
        a: 'Quando um membro solicita matrícula, aparece na aba "Alunos" da turma uma seção "Solicitações pendentes" com badge amarelo. Toque no ícone ✅ (verde) para aprovar ou ❌ (vermelho) para recusar. O professor da turma também pode aprovar.',
        tags: ['aprovar', 'matrícula', 'aluno', 'pendente'],
      },
      {
        q: 'Como registrar presença?',
        a: 'Dentro de cada aula, há a opção de registrar presença dos alunos matriculados. Selecione os presentes e salve. O progresso de cada aluno é atualizado automaticamente.',
        tags: ['presença', 'frequência', 'registrar'],
      },
      {
        q: 'Quem pode gerenciar turmas?',
        a: 'Admins da igreja e líderes podem criar, editar e excluir turmas. Professores designados podem aprovar/recusar matrículas e registrar presença nas suas turmas.',
        tags: ['permissão', 'gerenciar', 'professor'],
      },
    ],
  },
  {
    title: 'Membros (Admin)',
    icon: UserCheck,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como convidar um novo membro?',
        a: 'Menu admin → "Membros" → "Convidar Membro". Informe nome, email e papel (membro, líder). Uma senha temporária será gerada. Compartilhe com o membro para que ele faça o primeiro login.',
        tags: ['convidar', 'membro', 'novo'],
      },
      {
        q: 'Como compartilhar o link de cadastro?',
        a: 'Em "Membros", copie o link de convite da igreja (ex: /join/nome-da-igreja). Qualquer pessoa com o link pode se cadastrar como membro.',
        tags: ['link', 'cadastro', 'convite', 'compartilhar'],
      },
      {
        q: 'Como alterar o papel de um membro?',
        a: 'Na lista de membros, toque no membro e altere o papel para: Membro, Líder ou Admin. Apenas admins podem promover outros membros.',
        tags: ['papel', 'cargo', 'promover', 'líder'],
      },
    ],
  },
  {
    title: 'Grupos (Admin)',
    icon: Users,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como criar um grupo?',
        a: 'Menu admin → "Grupos" → "Novo Grupo". Preencha nome e descrição. Adicione membros ao grupo. Dentro do grupo você pode postar recados, compartilhar conteúdos e criar enquetes.',
        tags: ['grupo', 'criar', 'célula'],
      },
    ],
  },
  {
    title: 'Enquetes (Admin)',
    icon: BarChart3,
    color: 'text-accent',
    roles: ['leader', 'admin_church'],
    items: [
      {
        q: 'Como criar uma enquete?',
        a: 'Menu admin → "Enquetes" → "Nova Enquete". Defina a pergunta, adicione as opções de resposta, configure se permite múltipla escolha e se os resultados são visíveis. Publique para os membros votarem.',
        tags: ['enquete', 'criar', 'votação'],
      },
    ],
  },
  {
    title: 'Personalizar Igreja (Admin)',
    icon: Palette,
    color: 'text-accent',
    roles: ['admin_church'],
    items: [
      {
        q: 'Como personalizar a aparência da igreja?',
        a: 'Menu admin → "Personalizar". Lá você pode alterar o nome da igreja, logo, e outras configurações visuais.',
        tags: ['personalizar', 'aparência', 'logo'],
      },
    ],
  },
  {
    title: 'Configurações de IA (Admin)',
    icon: Settings,
    color: 'text-accent',
    roles: ['admin_church'],
    items: [
      {
        q: 'Como configurar o prompt da IA?',
        a: 'Menu admin → "Configurações". Na seção de IA, você pode personalizar o prompt usado pela inteligência artificial ao processar cultos. Ajuste a temperatura (criatividade) e o máximo de tokens.',
        tags: ['ia', 'prompt', 'configurar'],
      },
      {
        q: 'Posso escolher qual IA usar?',
        a: 'Sim! Ao processar um culto, você pode selecionar qual provedor de IA utilizar (OpenAI, Google, etc.). Os provedores são configurados pelo Super Admin do sistema.',
        tags: ['ia', 'provedor', 'selecionar'],
      },
    ],
  },
];

const HelpPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const userRole = user?.role || 'member';

  const filteredSections = faqSections
    .filter(section => section.roles.includes(userRole))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q) ||
          item.tags.some(t => t.includes(q))
        );
      }),
    }))
    .filter(section => section.items.length > 0);

  const totalQuestions = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <Link to="/church" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            {userRole === 'admin_church' ? 'Guia completo para administradores' :
             userRole === 'leader' ? 'Guia para líderes e membros' :
             'Guia do membro'}
          </p>
        </div>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Shield className="w-3 h-3 mr-1" />
          {userRole === 'admin_church' ? 'Administrador' :
           userRole === 'leader' ? 'Líder' : 'Membro'}
        </Badge>
        <span className="text-xs text-muted-foreground">{totalQuestions} perguntas disponíveis</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por tema, funcionalidade..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-11 rounded-xl bg-muted/50 border-0"
        />
      </div>

      {/* FAQ Sections */}
      {filteredSections.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchQuery}"</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section, idx) => (
            <Card key={idx} className="rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <section.icon className={`w-4 h-4 ${section.color}`} />
                <h2 className="font-heading text-sm font-semibold">{section.title}</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">{section.items.length}</Badge>
              </div>
              <Accordion type="multiple" className="px-2">
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`${idx}-${i}`} className="border-border/30">
                    <AccordionTrigger className="text-sm text-left font-medium py-3 px-2 hover:no-underline hover:text-primary">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-2 pb-4">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <Card className="p-4 rounded-2xl border-primary/10 bg-primary/5 text-center space-y-2">
        <p className="text-sm font-medium">Não encontrou o que procura?</p>
        <p className="text-xs text-muted-foreground">
          Fale com o administrador da sua igreja ou entre em contato pelo suporte.
        </p>
      </Card>
    </div>
  );
};

export default HelpPage;