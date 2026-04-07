import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Video, Plus, Search, Trash2, ExternalLink, Clock, User, Calendar, Sparkles, Loader2, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Service {
  id: string;
  title: string;
  youtube_url: string;
  preacher: string;
  service_date: string;
  ai_start_time: string;
  ai_end_time: string;
  ai_status: string;
  ai_summary?: string;
  processing_logs?: ProcessingLog[];
  processing_error?: string;
  created_at: string;
}

interface ProcessingLog {
  step: string;
  message: string;
  status: string;
  timestamp: string;
}

const defaultForm = {
  title: '',
  youtube_url: '',
  preacher: '',
  service_date: new Date().toISOString().split('T')[0],
  ai_start_time: '00:00:00',
  ai_end_time: '',
};

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Aguardando', variant: 'secondary' },
  processing: { label: 'Processando...', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  error: { label: 'Erro', variant: 'destructive' },
};

const logIcons: Record<string, typeof Info> = {
  info: Info,
  warn: AlertCircle,
  error: AlertCircle,
  success: CheckCircle,
};

const ChurchServices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [logData, setLogData] = useState<{ logs: ProcessingLog[]; status: string; error?: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ ...defaultForm });

  const isAdmin = user?.role === 'admin_church' || user?.role === 'leader';

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await api.get<Service[]>('/api/church/services');
        setServices(data);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchServices();
  }, []);

  // Poll processing status
  useEffect(() => {
    if (!selectedServiceId || !logDialogOpen) return;
    
    const poll = async () => {
      try {
        const data = await api.get<any>(`/api/church/services/${selectedServiceId}/status`);
        setLogData({
          logs: data.processing_logs || [],
          status: data.ai_status,
          error: data.processing_error,
        });
        // Update service in list
        if (data.ai_status === 'completed' || data.ai_status === 'error') {
          setServices(prev => prev.map(s => s.id === selectedServiceId ? { ...s, ai_status: data.ai_status } : s));
        }
      } catch (e) { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [selectedServiceId, logDialogOpen]);

  const handleCreate = async () => {
    if (!form.title || !form.youtube_url) {
      toast({ title: 'Preencha o título e o link do YouTube', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const newService = await api.post<Service>('/api/church/services', form);
      setServices(prev => [newService, ...prev]);
      setForm({ ...defaultForm });
      setOpen(false);
      toast({ title: 'Culto adicionado com sucesso!' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar culto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/church/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Culto removido' });
    } catch {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleProcess = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await api.post(`/api/church/services/${id}/process`, {});
      setServices(prev => prev.map(s => s.id === id ? { ...s, ai_status: 'processing' } : s));
      toast({ title: 'Processamento IA iniciado!' });
      // Open log dialog
      setSelectedServiceId(id);
      setLogData({ logs: [], status: 'processing' });
      setLogDialogOpen(true);
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao processar', variant: 'destructive' });
    } finally {
      setProcessingIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const openLogs = (id: string) => {
    setSelectedServiceId(id);
    setLogData(null);
    setLogDialogOpen(true);
  };

  const filtered = services.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.preacher?.toLowerCase().includes(search.toLowerCase())
  );

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const parts = t.split(':');
    if (parts.length === 3 && parts[0] === '00') return `${parts[1]}:${parts[2]}`;
    return t;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cultos</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Adicione links do YouTube para transcrição e estudo com IA' : 'Assista os cultos e acompanhe os estudos'}
          </p>
        </div>
        {isAdmin && (
          <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo culto
          </Button>
        )}
      </div>

      {services.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cultos..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-xl text-center space-y-4">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading font-semibold text-lg">Nenhum culto adicionado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isAdmin ? 'Adicione seu primeiro culto colando o link do YouTube.' : 'Nenhum culto disponível ainda.'}
          </p>
          {isAdmin && (
            <Button className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro culto
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(service => {
            const ytId = getYouTubeId(service.youtube_url);
            const status = statusMap[service.ai_status] || statusMap.pending;
            const isProcessing = processingIds.has(service.id) || service.ai_status === 'processing';
            return (
              <Card key={service.id} className="rounded-xl overflow-hidden border-border/60">
                {ytId && (
                  <img
                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                    alt={service.title}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold truncate flex-1">{service.title}</h3>
                    <Badge 
                      variant={status.variant} 
                      className={`text-[10px] shrink-0 cursor-pointer ${service.ai_status === 'processing' ? 'animate-pulse' : ''}`}
                      onClick={() => openLogs(service.id)}
                    >
                      {isProcessing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {service.preacher && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {service.preacher}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(service.service_date || service.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {(service.ai_start_time || service.ai_end_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(service.ai_start_time)} - {formatTime(service.ai_end_time)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {isAdmin && service.ai_status === 'pending' && (
                      <Button
                        size="sm"
                        className="rounded-lg bg-gold hover:bg-gold-dark text-foreground font-medium"
                        onClick={() => handleProcess(service.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        Processar IA
                      </Button>
                    )}
                    {isAdmin && service.ai_status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-destructive text-destructive"
                        onClick={() => handleProcess(service.id)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" /> Reprocessar
                      </Button>
                    )}
                    {(service.ai_status === 'processing' || service.ai_status === 'completed' || service.ai_status === 'error') && (
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openLogs(service.id)}>
                        <FileText className="w-3 h-3 mr-1" /> Logs
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-lg" asChild>
                      <a href={service.youtube_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> Assistir
                      </a>
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="rounded-lg text-destructive ml-auto" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Novo Culto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do culto</Label>
              <Input placeholder="Ex: Culto de domingo 06/04" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do culto</Label>
                <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Pregador</Label>
                <Input placeholder="Nome do pregador" value={form.preacher} onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link do YouTube</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Intervalo para IA processar
              </Label>
              <p className="text-xs text-muted-foreground">
                Defina o trecho da pregação. O membro assiste o culto inteiro.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input type="time" step="1" value={form.ai_start_time} onChange={e => setForm(f => ({ ...f, ai_start_time: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input type="time" step="1" value={form.ai_end_time} onChange={e => setForm(f => ({ ...f, ai_end_time: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Logs Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="rounded-xl max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Logs de Processamento
            </DialogTitle>
            <DialogDescription>
              Acompanhe o progresso do processamento com IA em tempo real.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {!logData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : logData.logs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {logData.status === 'pending' ? 'Processamento ainda não iniciado' : 'Aguardando logs...'}
              </div>
            ) : (
              logData.logs.map((log, i) => {
                const LogIcon = logIcons[log.status] || Info;
                const colors: Record<string, string> = {
                  info: 'text-primary',
                  warn: 'text-yellow-500',
                  error: 'text-destructive',
                  success: 'text-green-500',
                };
                return (
                  <div key={i} className="flex items-start gap-2 px-1">
                    <LogIcon className={`w-4 h-4 mt-0.5 shrink-0 ${colors[log.status] || 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.message}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {logData?.status === 'processing' && (
              <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </div>
            )}
            {logData?.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <strong>Erro:</strong> {logData.error}
              </div>
            )}
            {logData?.status === 'completed' && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600">
                ✅ Processamento concluído! Os estudos e resumos já estão disponíveis.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChurchServices;
