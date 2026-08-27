import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen grid md:grid-cols-2 bg-background">
      <section className="p-8 sm:p-14 flex flex-col justify-between border-r border-foreground/20">
        <span className="font-serif text-xl">Whisper</span>
        <div><p className="text-[10px] uppercase tracking-[.28em] text-primary mb-6">Ошибка / 404</p><h1 className="text-[clamp(4rem,11vw,9rem)] leading-[.78] tracking-[-.07em]">Здесь<br/>тихо.</h1></div>
        <button onClick={() => navigate("/")} className="group w-fit flex items-center gap-8 border-b border-foreground pb-3 text-xs uppercase tracking-[.2em] hover:text-primary hover:border-primary">Вернуться на главную <span className="group-hover:translate-x-2 transition-transform">→</span></button>
      </section>
      <aside className="bg-foreground text-background p-8 sm:p-14 flex items-end"><p className="font-serif text-3xl max-w-sm">Страница исчезла, но ваши разговоры по-прежнему на месте.</p></aside>
    </motion.main>
  );
}
