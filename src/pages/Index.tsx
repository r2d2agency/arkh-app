import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Phone, Users, ChevronRight, X, Filter, Navigation, Church, ExternalLink, Loader2, Shield, Lock, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ChurchItem {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_url?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  region?: string;
  lat?: number;
  lng?: number;
  whatsapp?: string;
  phone?: string;
  photos?: string[];
  member_count?: number;
}

const STATES_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function Index() {
  const navigate = useNavigate();
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [selected, setSelected] = useState<ChurchItem | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: "", email: "", password: "", password_confirm: "" });
  const [acceptLgpd, setAcceptLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async (params?: Record<string, string>) => {
    try {
      setLoading(true);
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const data = await api.get<ChurchItem[]>(`/api/catalog${qs}`);
      setChurches(data);
    } catch {
      setChurches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (stateFilter) params.state = stateFilter;
    if (nearbyMode && userLat && userLng) {
      params.lat = String(userLat);
      params.lng = String(userLng);
      params.radius = "50";
    }
    loadChurches(params);
  };

  useEffect(() => {
    handleSearch();
  }, [stateFilter, nearbyMode]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setNearbyMode(true);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getMapUrl = (church: ChurchItem) => {
    if (church.lat && church.lng) {
      return `https://www.google.com/maps?q=${church.lat},${church.lng}`;
    }
    if (church.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.address)}`;
    }
    return null;
  };

  const getWhatsAppUrl = (whatsapp: string) => {
    const num = whatsapp.replace(/\D/g, "");
    return `https://wa.me/${num.startsWith("55") ? num : "55" + num}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative bg-gradient-to-br from-primary/90 to-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgOHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6bS00LTh2MmgtMnYtMmgyem0wIDR2MmgtMnYtMmgyem0tNCAwdjJoLTJ2LTJoMnptMCA0djJoLTJ2LTJoMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Church className="h-10 w-10 text-primary-foreground" />
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground font-heading tracking-tight">
              ARKHÉ
            </h1>
          </div>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Encontre uma igreja perto de você. Conecte-se, participe e cresça em comunidade.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/login")}
              className="font-semibold"
            >
              Entrar na minha conta
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/register")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold"
            >
              Criar conta
            </Button>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar igreja, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATES_BR.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={nearbyMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (nearbyMode) {
                setNearbyMode(false);
              } else {
                requestLocation();
              }
            }}
            disabled={geoLoading}
          >
            <Navigation className="h-4 w-4 mr-1" />
            {geoLoading ? "Localizando..." : nearbyMode ? "Próximas" : "Perto de mim"}
          </Button>

          <Button size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-1" />
            Buscar
          </Button>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : churches.length === 0 ? (
          <div className="text-center py-20">
            <Church className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhuma igreja encontrada</h2>
            <p className="text-muted-foreground">Tente buscar com outros termos ou remova os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {churches.map((church) => (
              <Card
                key={church.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-border/60"
                onClick={() => { setSelected(church); setPhotoIdx(0); }}
              >
                <div className="relative h-48 bg-muted overflow-hidden">
                  {church.cover_url || church.logo_url ? (
                    <img
                      src={church.cover_url || church.logo_url}
                      alt={church.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Church className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  {church.city && (
                    <Badge className="absolute bottom-3 left-3 bg-background/90 text-foreground backdrop-blur-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {church.city}{church.state ? ` - ${church.state}` : ""}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                    {church.name}
                  </h3>
                  {church.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {church.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{church.member_count || 0} membros</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Church Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.logo_url && (
                    <img src={selected.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  )}
                  {selected.name}
                </DialogTitle>
              </DialogHeader>

              {/* Cover / Photo Gallery */}
              {(selected.cover_url || (selected.photos && selected.photos.length > 0)) && (
                <div className="relative rounded-lg overflow-hidden h-56 bg-muted">
                  {(() => {
                    const allPhotos = [
                      ...(selected.cover_url ? [selected.cover_url] : []),
                      ...(selected.photos || []),
                    ];
                    if (allPhotos.length === 0) return null;
                    return (
                      <>
                        <img
                          src={allPhotos[photoIdx % allPhotos.length]}
                          alt={selected.name}
                          className="w-full h-full object-cover"
                        />
                        {allPhotos.length > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {allPhotos.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setPhotoIdx(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === photoIdx % allPhotos.length ? "bg-primary-foreground scale-125" : "bg-primary-foreground/50"}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {selected.description && (
                <p className="text-muted-foreground">{selected.description}</p>
              )}

              <div className="space-y-3">
                {selected.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{selected.address}</p>
                      {selected.city && (
                        <p className="text-xs text-muted-foreground">
                          {selected.city}{selected.state ? ` - ${selected.state}` : ""}
                        </p>
                      )}
                      {getMapUrl(selected) && (
                        <a
                          href={getMapUrl(selected)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver no mapa
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selected.whatsapp && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-600 shrink-0" />
                    <a
                      href={getWhatsAppUrl(selected.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline font-medium"
                    >
                      WhatsApp: {selected.whatsapp}
                    </a>
                  </div>
                )}

                {selected.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary shrink-0" />
                    <a href={`tel:${selected.phone}`} className="text-sm text-foreground hover:underline">
                      {selected.phone}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{selected.member_count || 0} membros</span>
                </div>
              </div>

              {/* Map embed */}
              {selected.lat && selected.lng && (
                <div className="rounded-lg overflow-hidden border border-border h-48">
                  <iframe
                    title="Mapa"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selected.lat},${selected.lng}&zoom=15`}
                    allowFullScreen
                  />
                </div>
              )}

              <Separator />

              {!showJoinForm ? (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 gap-2" onClick={() => setShowJoinForm(true)}>
                    <UserPlus className="h-4 w-4" />
                    Seja membro desta igreja
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Fechar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <UserPlus className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Cadastre-se como membro</h3>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border p-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Seus dados são protegidos conforme a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
                      Utilizamos suas informações exclusivamente para o vínculo com a igreja e comunicação interna.
                      Seus dados não serão compartilhados com terceiros.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selected) return;
                      if (joinForm.password !== joinForm.password_confirm) {
                        toast.error("As senhas não coincidem");
                        return;
                      }
                      if (joinForm.password.length < 6) {
                        toast.error("A senha deve ter no mínimo 6 caracteres");
                        return;
                      }
                      if (!acceptLgpd) {
                        toast.error("Você precisa aceitar a política de privacidade");
                        return;
                      }
                      setSubmitting(true);
                      try {
                        const data = await api.post<{
                          access_token: string;
                          refresh_token: string;
                          user: any;
                          church: any;
                        }>(`/api/join/${selected.slug}`, {
                          name: joinForm.name.trim(),
                          email: joinForm.email.trim(),
                          password: joinForm.password,
                        });
                        localStorage.setItem("access_token", data.access_token);
                        localStorage.setItem("refresh_token", data.refresh_token);
                        toast.success(`Bem-vindo à ${data.church.name}!`);
                        window.location.href = "/church";
                      } catch (err: any) {
                        toast.error(err.message || "Erro ao cadastrar");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                      <Input
                        value={joinForm.name}
                        onChange={(e) => setJoinForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Seu nome completo"
                        className="rounded-xl"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={joinForm.email}
                        onChange={(e) => setJoinForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="seu@email.com"
                        className="rounded-xl"
                        required
                        maxLength={255}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                        <Input
                          type="password"
                          value={joinForm.password}
                          onChange={(e) => setJoinForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="••••••••"
                          className="rounded-xl"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar</Label>
                        <Input
                          type="password"
                          value={joinForm.password_confirm}
                          onChange={(e) => setJoinForm((f) => ({ ...f, password_confirm: e.target.value }))}
                          placeholder="••••••••"
                          className="rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <Checkbox
                        id="lgpd"
                        checked={acceptLgpd}
                        onCheckedChange={(v) => setAcceptLgpd(v === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="lgpd" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        Declaro que li e concordo com a <strong>política de privacidade</strong> e o tratamento dos meus dados
                        pessoais conforme a <strong>LGPD (Lei nº 13.709/2018)</strong>, para fins de registro e participação
                        nesta comunidade eclesiástica.
                      </label>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Garantimos total sigilo dos seus dados. Sua senha é criptografada e nunca armazenada em texto.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <Button type="submit" className="flex-1 gap-2" disabled={submitting || !acceptLgpd}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        {submitting ? "Cadastrando..." : "Criar minha conta"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowJoinForm(false);
                          setJoinForm({ name: "", email: "", password: "", password_confirm: "" });
                          setAcceptLgpd(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>

                  <p className="text-center text-xs text-muted-foreground">
                    Já tem uma conta?{" "}
                    <a href="/login" className="text-primary hover:underline font-medium">Fazer login</a>
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ARKHÉ — Tecnologia para igrejas
        </p>
      </footer>
    </div>
  );
}
