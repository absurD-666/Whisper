import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="premium-surface rounded-3xl px-12 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-4">Ошибка 404</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">Страница не найдена</h1>
        <p className="text-sm text-muted-foreground mb-7">Возможно, адрес изменился или был удалён.</p>
        <button onClick={() => navigate("/")} className="text-sm font-medium bg-primary text-primary-foreground rounded-xl px-5 py-2.5 hover:opacity-90">На главную</button>
      </div>
    </motion.div>
  );
}
