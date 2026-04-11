import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, Minimize2, Maximize2, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface RelatedService {
  id: string;
  title: string;
  date?: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  related_services?: RelatedService[];
}

interface AssistantStatus {
  available: boolean;
  church_enabled: boolean;
  plan_enabled: boolean;
  daily_limit: number;
  used_today: number;
  remaining: number;
}

interface AIAssistantProps {
  contextType?: 'general' | 'service' | 'study' | 'notebook';
  contextId?: string;
  contextTitle?: string;
}

export default function AIAssistant({ contextType = 'general', contextId, contextTitle }: AIAssistantProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const checkStatus = async () => {
    try {
      const data = await api.get<AssistantStatus>('/api/church/assistant/status');
      setStatus(data);
    } catch {
      setStatus({ available: false, church_enabled: false, plan_enabled: false, daily_limit: 0, used_today: 0, remaining: 0 });
    }
  };

  useEffect(() => {
    checkStatus();
  }, [location.pathname]);

  useEffect(() => {
    const refreshStatus = () => { checkStatus(); };
    window.addEventListener('focus', refreshStatus);
    window.addEventListener('ai-assistant-settings-changed', refreshStatus as EventListener);
    return () => {
      window.removeEventListener('focus', refreshStatus);
      window.removeEventListener('ai-assistant-settings-changed', refreshStatus as EventListener);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);

    try {
      const data = await api.post<{ conversation_id: string; message: string; related_services?: RelatedService[] }>('/api/church/assistant/chat', {
        message: msg,
        conversation_id: conversationId,
        context_type: contextType,
        context_id: contextId,
      });
      setConversationId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, related_services: data.related_services }]);
      setStatus(prev => prev ? { ...prev, used_today: prev.used_today + 1, remaining: Math.max(0, prev.remaining - 1) } : prev);
    } catch (err: any) {
      if (err.message?.includes('Limite')) {
        toast.error('Limite diário de interações atingido');
      } else if (err.message?.includes('plano')) {
        toast.error('IA Assistente não disponível no plano da sua igreja');
      } else {
        toast.error('Erro ao enviar mensagem');
      }
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSuggestions = () => {
    if (contextType === 'service') {
      return ['Explique o ponto principal', 'Contexto bíblico', 'Aplicação prática', 'Versículos relacionados'];
    }
    if (contextType === 'study') {
      return ['Resuma este estudo', 'Gere perguntas', 'Temas relacionados', 'Aplicações'];
    }
    if (contextType === 'notebook') {
      return ['Organize minhas notas', 'Crie um estudo estruturado', 'Sugira versículos', 'Melhore o texto'];
    }
    return ['O que a Bíblia fala sobre fé?', 'Explique Romanos 8', 'Estudo sobre oração', 'Contexto de João 3:16'];
  };

  if (!status?.available) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 shadow-2xl transition-all hover:scale-105 active:scale-95 font-bold text-base text-white"
          style={{ background: 'linear-gradient(135deg, hsl(215 65% 45%) 0%, hsl(215 65% 35%) 100%)' }}
        >
          <Sparkles className="h-5 w-5" />
          <span>Assistente</span>
          {status.remaining > 0 && status.daily_limit > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white text-xs ml-1 border-0">{status.remaining}</Badge>
          )}
        </button>
      )}

      {open && (
        <div
          className={`fixed z-50 flex flex-col bg-card border border-border shadow-2xl transition-all duration-300 ${
            expanded
              ? 'inset-0 rounded-none'
              : 'bottom-24 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[70vh] rounded-2xl'
          }`}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0" style={{ background: 'linear-gradient(135deg, hsl(215 65% 45%) 0%, hsl(215 65% 35%) 100%)' }}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-base truncate">Assistente ARKHÉ</h3>
              <p className="text-xs text-white/60 truncate">
                {contextTitle ? `📖 ${contextTitle}` : 'Pergunte sobre a Bíblia, estudos e mais'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Nova conversa">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-foreground text-lg mb-1">Olá! 👋</h4>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    Sou o assistente ARKHÉ. Posso ajudar com estudos bíblicos, explicações e muito mais.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
                  {getSuggestions().map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {status.daily_limit > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {status.remaining} de {status.daily_limit} interações restantes hoje
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.related_services && msg.related_services.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground font-medium">📖 Pregações relacionadas:</span>
                        {msg.related_services.map(svc => (
                          <button
                            key={svc.id}
                            onClick={() => { navigate(`/church/services/${svc.id}`); setOpen(false); }}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium text-left"
                          >
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span className="truncate">{svc.title}</span>
                            {svc.date && <span className="text-muted-foreground shrink-0">({new Date(svc.date).toLocaleDateString('pt-BR')})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border shrink-0">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo..."
                rows={1}
                className="min-h-[42px] max-h-[120px] resize-none rounded-xl text-sm"
                disabled={sending}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="h-[42px] w-[42px] rounded-xl shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
