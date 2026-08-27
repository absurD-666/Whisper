import { motion } from "framer-motion";
import { Shield, MessageCircle, Zap, ArrowRight, Mail, Lock, User, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="w-full px-5 sm:px-8 py-6 flex items-center justify-between max-w-6xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Whisper</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button onClick={() => navigate("/messenger")} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Открыть мессенджер
            </button>
          ) : (
            <>
              <button onClick={() => openAuth("signin")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Войти</button>
              <button onClick={() => openAuth("signup")} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Начать</button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 pt-20 pb-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }} className="max-w-4xl w-full text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8">
            <Shield className="w-3 h-3" />
            Сквозное шифрование
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-[-0.045em] leading-[1.04]">
            Приватные сообщения,<br /><span className="text-primary">на ваших условиях.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Whisper — безопасный мессенджер со сквозным шифрованием. Без слежки, без рекламы. Групповые чаты, голосовые, общение.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button onClick={() => openAuth("signup")} disabled={isLoading} className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-all">
              {isAuthenticated ? "Открыть мессенджер" : "Начать общаться"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: 0.2 }} className="mt-24 sm:mt-32 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full">
          <Feature icon={<Shield className="w-5 h-5" />} title="Сквозное шифрование" description="Каждое сообщение зашифровано AES-256-GCM. Только вы и ваши контакты можете их прочитать." />
          <Feature icon={<MessageCircle className="w-5 h-5" />} title="Групповые чаты" description="Общайтесь в группах, пересылайте и редактируйте сообщения. Полный контроль над диалогом." />
          <Feature icon={<Zap className="w-5 h-5" />} title="Мгновенная доставка" description="Сообщения приходят в реальном времени. Индикаторы набора, статус прочтения, онлайн-статус." />
        </motion.div>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground/50">Whisper Messenger · Безопасно · Приватно · Открыто</footer>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden border-border/50">
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
    <div className="p-7 rounded-2xl bg-card border border-border/70 text-left hover:border-primary/25 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary mb-5">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
