import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Страница не найдена</p>
      <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">На главную</button>
    </motion.div>
  );
}
