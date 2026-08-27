import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps { redirectAfterAuth?: string; }

function Auth({ redirectAfterAuth = "/messenger" }: AuthProps) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const redirect = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : redirectAfterAuth;

  const initialMode = (searchParams.get("mode") as "signin" | "signup") || "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && isAuthenticated) navigate(redirect); }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", mode === "signup" ? "signUp" : "signIn");
      if (mode === "signup") formData.set("name", name);
      await signIn("password", formData);
      navigate(redirect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Произошла ошибка";
      if (msg.includes("already")) setError("Аккаунт уже существует. Войдите.");
      else if (msg.includes("not found") || msg.includes("Invalid")) setError("Аккаунт не найден. Зарегистрируйтесь.");
      else if (msg.includes("password") || msg.includes("credentials")) setError("Неверный email или пароль.");
      else setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-6 py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Whisper</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md premium-surface rounded-3xl p-7 sm:p-10">
          <div className="space-y-7">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "signin" ? "Вход в Whisper" : "Регистрация"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Введите email и пароль."
                  : "Создайте аккаунт, чтобы начать общаться."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" autoFocus />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required autoFocus={mode === "signin"} />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={6} />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>{mode === "signin" ? "Войти" : "Зарегистрироваться"}<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="text-center">
              <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {mode === "signin"
                  ? <>Нет аккаунта? <span className="text-primary">Зарегистрироваться</span></>
                  : <>Уже есть аккаунт? <span className="text-primary">Войти</span></>}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Suspense><Auth {...props} /></Suspense>;
}
