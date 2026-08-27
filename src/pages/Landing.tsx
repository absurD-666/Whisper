import { motion } from "framer-motion";
import { Shield, MessageCircle, Zap, ArrowRight, Mail, Lock, User, Loader2, Search, MoreHorizontal, Paperclip, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setAuthOpen(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", authMode === "signup" ? "signUp" : "signIn");
      if (authMode === "signup") formData.set("name", name);
      await signIn("password", formData);
      setAuthOpen(false);
      navigate("/messenger");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Произошла ошибка";
      if (msg.includes("already")) setError("Аккаунт уже существует. Попробуйте войти.");
      else if (msg.includes("not found") || msg.includes("Invalid")) setError("Аккаунт не найден. Зарегистрируйтесь.");
      else if (msg.includes("password") || msg.includes("credentials")) setError("Неверный email или пароль.");
      else setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <header className="h-18 px-5 sm:px-10 lg:px-16 flex items-center justify-between border-b border-border/70 relative z-10 bg-background/80 backdrop-blur-xl">
        <button onClick={() => navigate("/")} className="flex items-center gap-3" aria-label="Whisper, главная">
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center dp-glow"><MessageCircle className="w-4 h-4" /></span>
          <span className="text-lg font-semibold tracking-[-.03em]">Whisper</span>
        </button>
        <div className="flex items-center gap-3">
          {!isAuthenticated && <button onClick={() => openAuth("signin")} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Войти</button>}
          <Button onClick={() => isAuthenticated ? navigate("/messenger") : openAuth("signup")} className="h-10 px-5 rounded-xl shadow-[0_10px_30px_rgba(91,124,255,.22)]">
            {isAuthenticated ? "Открыть приложение" : "Начать общение"}<ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="dp-atmosphere">
        <section className="min-h-[calc(100vh-4.5rem)] max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-16 py-16 lg:py-24 grid lg:grid-cols-[.9fr_1.1fr] gap-14 lg:gap-20 items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs text-primary"><Shield className="w-3.5 h-3.5" />Приватное общение нового уровня</div>
            <h1 className="mt-7 text-[clamp(3.4rem,7vw,6.8rem)] leading-[.94] tracking-[-.065em] max-w-3xl">Связь без<br/><span className="text-primary">компромиссов.</span></h1>
            <p className="mt-7 max-w-xl text-lg sm:text-xl leading-relaxed text-muted-foreground">Быстрые сообщения, голос, изображения и группы в точном, спокойном интерфейсе, созданном вокруг ваших разговоров.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => isAuthenticated ? navigate("/messenger") : openAuth("signup")} disabled={isLoading} className="h-12 px-6 rounded-xl dp-glow">{isAuthenticated ? "Вернуться к разговорам" : "Создать аккаунт"}<ArrowRight className="w-4 h-4" /></Button>
              {!isAuthenticated && <Button size="lg" variant="outline" onClick={() => openAuth("signin")} className="h-12 px-6 rounded-xl bg-card/40">У меня есть аккаунт</Button>}
            </div>
            <div className="mt-12 grid sm:grid-cols-3 gap-3">
              <Feature icon={<Shield className="w-4 h-4" />} title="Приватность" description="Ваши разговоры остаются вашими." />
              <Feature icon={<Zap className="w-4 h-4" />} title="Мгновенно" description="Доставка и статусы в реальном времени." />
              <Feature icon={<MessageCircle className="w-4 h-4" />} title="В контексте" description="Ответы, группы и медиа без шума." />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .75, delay: .12 }} className="relative">
            <div className="absolute -inset-10 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative dp-panel rounded-3xl overflow-hidden min-h-[540px] grid grid-cols-[72px_210px_1fr]">
              <div className="border-r border-border/70 p-4 flex flex-col items-center gap-4 bg-black/15">
                <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center"><MessageCircle className="w-4 h-4" /></span>
                {[MessageCircle, User, Shield].map((Icon, i) => <span key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><Icon className="w-4 h-4" /></span>)}
              </div>
              <div className="border-r border-border/70 p-4 bg-card/35">
                <div className="flex items-center justify-between"><span className="font-semibold">Сообщения</span><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></div>
                <div className="mt-4 h-9 rounded-xl border border-border bg-background/50 flex items-center gap-2 px-3 text-xs text-muted-foreground"><Search className="w-3.5 h-3.5" />Поиск</div>
                <div className="mt-4 space-y-2">
                  {["Команда продукта", "Анна", "Дизайн-система", "Максим"].map((name, i) => <div key={name} className={`p-3 rounded-xl ${i === 0 ? "bg-primary/12 border border-primary/20" : "border border-transparent"}`}><div className="flex gap-2.5"><span className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">{name.slice(0,2).toUpperCase()}</span><div className="min-w-0"><p className="text-xs font-medium truncate">{name}</p><p className="mt-1 text-[10px] text-muted-foreground truncate">Последнее сообщение...</p></div></div></div>)}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="h-16 border-b border-border/70 px-5 flex items-center justify-between"><div><p className="text-sm font-semibold">Команда продукта</p><p className="text-[10px] text-emerald-400">4 участника в сети</p></div><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></div>
                <div className="flex-1 p-5 space-y-4 flex flex-col justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-xs leading-relaxed">Новая версия интерфейса готова к проверке.</div>
                  <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-primary px-4 py-3 text-xs leading-relaxed text-white">Отлично. Всё выглядит точно и спокойно.<span className="mt-1 flex justify-end"><CheckCheck className="w-3 h-3 opacity-70" /></span></div>
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-xs">Запускаем сегодня.</div>
                </div>
                <div className="p-4 border-t border-border/70"><div className="h-11 rounded-xl border border-border bg-background/60 px-3 flex items-center gap-3 text-xs text-muted-foreground"><Paperclip className="w-4 h-4" /><span className="flex-1">Написать сообщение...</span><span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><ArrowRight className="w-3.5 h-3.5" /></span></div></div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="px-5 sm:px-10 lg:px-16 py-6 border-t border-border/70 flex justify-between text-xs text-muted-foreground"><span>© Whisper</span><span>Приватно. Быстро. Точно.</span></footer>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden dp-panel border-border/80 rounded-2xl">
          <div className="p-6 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {authMode === "signup" ? "Регистрация" : "Вход"}
            </DialogTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {authMode === "signup"
                ? "Создайте аккаунт, чтобы начать общаться."
                : "Введите email и пароль."}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="px-6 pb-6 space-y-3.5">
            {authMode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-10"
                  autoFocus
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10"
                required
                autoFocus={authMode === "signin"}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-10"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full h-10" disabled={isSubmitting || !email || !password}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{authMode === "signup" ? "Зарегистрироваться" : "Войти"}<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {authMode === "signin"
                  ? <>Нет аккаунта? <span className="text-primary">Зарегистрироваться</span></>
                  : <>Уже есть аккаунт? <span className="text-primary">Войти</span></>}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/45 p-4">
      <div className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
