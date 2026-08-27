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
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <header className="h-20 px-5 sm:px-10 flex items-center justify-between border-b border-foreground/20 relative z-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3" aria-label="Whisper, главная">
          <span className="w-9 h-9 bg-foreground text-background flex items-center justify-center"><MessageCircle className="w-4 h-4" /></span>
          <span className="font-serif text-xl">Whisper</span>
        </button>
        <div className="flex items-center gap-5">
          {!isAuthenticated && <button onClick={() => openAuth("signin")} className="text-xs uppercase tracking-[.18em] hover:text-primary">Войти</button>}
          <button onClick={() => isAuthenticated ? navigate("/messenger") : openAuth("signup")} className="px-5 py-3 bg-foreground text-background text-xs uppercase tracking-[.16em] hover:bg-primary transition-colors">
            {isAuthenticated ? "Открыть" : "Создать аккаунт"}
          </button>
        </div>
      </header>

      <main>
        <section className="min-h-[calc(100vh-5rem)] grid lg:grid-cols-[1.35fr_.65fr]">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }} className="px-5 sm:px-10 lg:px-16 py-16 lg:py-24 flex flex-col justify-between border-r border-foreground/20">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[.28em] text-muted-foreground"><span className="w-8 h-px bg-primary" />Частная переписка / 2026</div>
            <div className="my-16">
              <h1 className="text-[clamp(4rem,10vw,9.5rem)] leading-[.78] tracking-[-.075em] max-w-5xl">Говорите<br/><em className="font-normal text-primary">тише.</em></h1>
              <div className="mt-12 grid sm:grid-cols-[1fr_1fr] gap-8 max-w-3xl border-t border-foreground/25 pt-6">
                <p className="text-xl sm:text-2xl leading-tight">Мессенджер, который не превращает личное в продукт.</p>
                <p className="text-sm leading-relaxed text-muted-foreground">Сообщения, голос, изображения и группы — в спокойном пространстве без рекламы и лишнего шума.</p>
              </div>
            </div>
            <button onClick={() => isAuthenticated ? navigate("/messenger") : openAuth("signup")} disabled={isLoading} className="group w-fit flex items-center gap-8 border-b border-foreground pb-3 text-sm uppercase tracking-[.18em] hover:text-primary hover:border-primary">
              {isAuthenticated ? "Вернуться к разговорам" : "Начать разговор"}<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </motion.div>

          <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .25 }} className="bg-foreground text-background p-8 sm:p-12 flex flex-col justify-between min-h-[520px]">
            <div className="flex justify-between text-[10px] uppercase tracking-[.22em] opacity-60"><span>Манифест</span><span>01—03</span></div>
            <div className="space-y-10">
              <Feature icon={<Shield className="w-5 h-5" />} title="Только между вами" description="Сквозное шифрование сохраняет содержание разговора внутри разговора." />
              <Feature icon={<MessageCircle className="w-5 h-5" />} title="Живой контекст" description="Группы, ответы, пересылка и редактирование — без потери нити." />
              <Feature icon={<Zap className="w-5 h-5" />} title="Сейчас, не потом" description="Доставка в реальном времени, статусы и присутствие без навязчивости." />
            </div>
            <p className="font-serif italic text-2xl text-primary">Private by temperament.</p>
          </motion.aside>
        </section>
      </main>

      <footer className="px-5 sm:px-10 py-6 border-t border-foreground/20 flex justify-between text-[10px] uppercase tracking-[.2em] text-muted-foreground"><span>Whisper Messenger</span><span>Безопасно / Приватно</span></footer>

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
    <div className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-background/25 pt-5">
      <div className="text-primary">{icon}</div>
      <div><h3 className="font-serif text-xl">{title}</h3><p className="mt-2 text-xs leading-relaxed opacity-60">{description}</p></div>
    </div>
  );
}
