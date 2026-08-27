import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background dp-atmosphere flex items-center justify-center p-5">
      <section className="relative z-10 w-full max-w-xl dp-panel rounded-3xl p-8 sm:p-12 text-center">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
        <p className="mt-8 text-xs font-medium tracking-[.18em] text-primary">ERROR 404</p>
        <h1 className="mt-4 text-5xl sm:text-7xl tracking-[-.06em]">Страница не найдена</h1>
        <p className="mt-5 text-sm sm:text-base leading-relaxed text-muted-foreground">Адрес изменился или страница больше недоступна. Ваши разговоры остаются на месте.</p>
        <Button onClick={() => navigate("/")} className="mt-8 h-11 px-5 rounded-xl"><ArrowLeft className="w-4 h-4" />На главную</Button>
      </section>
    </motion.main>
  );
}
