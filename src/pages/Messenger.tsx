import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Search, Send, ArrowLeft, LogOut,
  UserPlus, Settings, Users, Mic, MicOff,
  X, Play, Pause, Hash, Volume2,
  Smile, Forward, Pin, PinOff, Edit3, MoreHorizontal,
  Sun, Moon, Shield, ShieldOff, Trash2, Check, ImagePlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type View = "chats" | "contacts" | "settings" | "chat";

const EMOJI_LIST = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
  "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😋",
  "😛","😜","🤪","😝","🤗","🤔","😐","😑","😏","😒",
  "🙄","😬","😌","😔","😪","😴","😷","🤢","🤮","🥵",
  "🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","😕","😟",
  "🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰",
  "😥","😢","😭","😱","😖","😣","😞","😓","😩","😫",
  "😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡",
  "👻","👽","👾","🤖","❤️","🧡","💛","💚","💙","💜",
  "🖤","🤍","🤎","💔","💕","💞","💓","💗","💖","💘",
  "💝","👍","👎","👊","✊","🤛","🤜","👏","🙌","👐",
  "🤝","🙏","💪","👀","🔥","⭐","🌟","💫","🎉","🎊",
  "💯","✅","❌","⚡","💎","🌈","☀️","🌙","⛅","🌸",
];

// ─── Theme ───
function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

// ─── Sound ───
function playNotifSound() {
  try {
    const ctx = new AudioContext();
    // Soft two-tone chime
    const notes = [
      { freq: 698, start: 0, dur: 0.15 },     // F5
      { freq: 880, start: 0.12, dur: 0.2 },   // A5
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);
      gain.gain.setValueAtTime(0, ctx.currentTime + n.start);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.start + n.dur);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur);
    }
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

// ─── Helpers ───
function getInitials(name: string) { return name.slice(0, 2).toUpperCase(); }
function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts); const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}
function formatDuration(sec: number) { return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`; }

// ─── Avatar ───
function Avatar({ nickname, online, size = "md", avatarStorageId, onClick }: { nickname: string; online?: boolean; size?: "sm" | "md" | "lg"; avatarStorageId?: string | null; onClick?: () => void }) {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-lg" }[size];
  const avatarUrl = useQuery(api.users.getAvatarUrl, avatarStorageId ? { storageId: avatarStorageId } : "skip");
  return (
    <div className={`relative shrink-0 ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      {avatarUrl ? <img src={avatarUrl} alt={nickname} className={`${sz} rounded-full object-cover`} /> : <div className={`${sz} rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center`}>{getInitials(nickname)}</div>}
      {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />}
    </div>
  );
}

// ─── Image Preview Overlay ───
function ImagePreview({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
      <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 25 }} src={url} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
    </motion.div>
  );
}

// ─── Image Message ───
function ImageMessage({ storageId }: { storageId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedUrl = useQuery(api.chat.getStorageUrl, { storageId });

  useEffect(() => {
    if (fetchedUrl) { setUrl(fetchedUrl); setLoading(false); }
  }, [fetchedUrl]);

  if (loading) return <div className="w-48 h-32 bg-primary/10 rounded-xl animate-pulse" />;
  if (!url) return <div className="w-48 h-32 bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground">Нет файла</div>;
  return <img src={url} alt="Фото" className="max-w-[260px] max-h-[300px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" />;
}

// ─── Voice Recorder ───
function VoiceRecorder({ onSend }: { onSend: (blob: Blob, duration: number) => void }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef(0);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: mimeType }); setPreview(blob); setPreviewUrl(URL.createObjectURL(blob)); stream.getTracks().forEach(t => t.stop()); };
      recorderRef.current = recorder; recorder.start(); startTimeRef.current = Date.now(); setRecording(true); setDuration(0);
      timerRef.current = setInterval(() => { setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)); }, 200);
    } catch {}
  };
  const stopRecording = () => { recorderRef.current?.stop(); setRecording(false); if (timerRef.current) clearInterval(timerRef.current); };
  const sendVoice = () => { if (preview) { onSend(preview, duration); setPreview(null); setPreviewUrl(""); setDuration(0); } };
  if (preview) return (<div className="flex items-center gap-3 w-full"><button onClick={() => { setPreview(null); setPreviewUrl(""); setDuration(0); }} className="p-2 text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button><audio src={previewUrl} controls className="h-8 flex-1" /><span className="text-xs text-muted-foreground font-mono">{formatDuration(duration)}</span><Button size="icon" className="w-8 h-8 rounded-full bg-primary" onClick={sendVoice}><Send className="w-3.5 h-3.5" /></Button></div>);
  if (recording) return (<div className="flex items-center gap-3 w-full"><div className="flex items-center gap-2 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-mono">{formatDuration(duration)}</span></div><div className="flex-1 h-8 bg-card rounded-full overflow-hidden flex items-center px-4"><Volume2 className="w-3.5 h-3.5 text-red-500 animate-pulse" /></div><Button size="icon" variant="destructive" className="w-8 h-8 rounded-full" onClick={stopRecording}><MicOff className="w-3.5 h-3.5" /></Button></div>);
  return (<Button size="icon" variant="ghost" className="shrink-0 text-muted-foreground hover:text-primary" onClick={startRecording}><Mic className="w-5 h-5" /></Button>);
}

// ─── Audio Message Player ───
function AudioMessage({ storageId, isMe }: { storageId: string; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const url = useQuery(api.chat.getStorageUrl, { storageId });
  const togglePlay = async () => { if (!audioRef.current || !url) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { try { audioRef.current.src = url; await audioRef.current.play(); setPlaying(true); } catch { setError(true); } } };
  useEffect(() => { if (audioRef.current && url) { audioRef.current.src = url; audioRef.current.load(); } }, [url]);
  if (error) return <span className="text-xs opacity-60">⚠ Ошибка воспроизведения</span>;
  return (<div className="flex items-center gap-2 min-w-[180px]"><button onClick={togglePlay} disabled={!url} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!url ? "opacity-40" : ""} ${isMe ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"}`}>{playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}</button><audio ref={audioRef} onEnded={() => setPlaying(false)} onLoadedData={() => setReady(true)} preload="auto" style={{ display: "none" }} /><div className="flex-1 h-1 rounded-full bg-current/20 relative overflow-hidden"><div className={`absolute inset-y-0 left-0 rounded-full transition-all ${isMe ? "bg-primary-foreground/50" : "bg-primary/50"} ${playing ? "w-full animate-pulse" : ready ? "w-full opacity-30" : "w-1/3 opacity-20 animate-pulse"}`} /></div></div>);
}

// ─── Emoji Picker ───
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-full mb-2 left-0 z-40 bg-popover border border-border rounded-xl p-3 shadow-lg w-[280px]">
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_LIST.map((e) => (<button key={e} onClick={() => { onSelect(e); onClose(); }} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors">{e}</button>))}
      </div>
    </motion.div>
  );
}

// ─── Forward Dialog ───
function ForwardDialog({ messageId, conversations, onForward, onClose }: { messageId: string; conversations: any[]; onForward: (convoId: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((c) => { const name = c.isGroup ? c.name : c.otherUser?.nickname ?? ""; return name.toLowerCase().includes(search.toLowerCase()); });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card rounded-2xl w-80 max-h-96 flex flex-col border border-border/40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/30"><p className="text-sm font-semibold">Переслать в...</p><Input placeholder="Найти диалог..." value={search} onChange={(e) => setSearch(e.target.value)} className="mt-2 bg-muted/50 border-0 text-sm" /></div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (<button key={c._id} onClick={() => { onForward(c._id); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
            {c.isGroup ? <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm"><Users className="w-4 h-4" /></div> : <Avatar nickname={c.otherUser?.nickname ?? "?"} size="md" avatarStorageId={c.otherUser?.avatar} />}
            <span className="text-sm font-medium truncate">{c.isGroup ? c.name : c.otherUser?.nickname}</span>
          </button>))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Group Dialog ───
function CreateGroupDialog({ contacts, onCreate, onClose }: { contacts: any[]; onCreate: (name: string, ids: string[]) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card rounded-2xl w-80 max-h-96 flex flex-col border border-border/40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/30"><p className="text-sm font-semibold">Новый групповой чат</p><Input placeholder="Название группы..." value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-muted/50 border-0 text-sm" autoFocus /></div>
        <div className="flex-1 overflow-y-auto p-2">
          {contacts.map((c) => (<button key={c._id} onClick={() => toggle(c._id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${selected.has(c._id) ? "bg-primary/10" : "hover:bg-muted/50"}`}><Avatar nickname={c.nickname ?? "?"} size="sm" avatarStorageId={c.avatar} /><span className="text-sm font-medium flex-1 truncate">{c.nickname}</span>{selected.has(c._id) && <Check className="w-4 h-4 text-primary" />}</button>))}
        </div>
        <div className="px-4 py-3 border-t border-border/30"><Button onClick={() => { if (name.trim() && selected.size > 0) onCreate(name, [...selected]); }} disabled={!name.trim() || selected.size === 0} className="w-full">Создать ({selected.size})</Button></div>
      </motion.div>
    </motion.div>
  );
}

// ─── User Profile Dialog ───
function UserProfile({ userId, onClose, onStartChat, onBlock, isBlocked, isBlockedBy }: { userId: string; onClose: () => void; onStartChat: (id: string) => void; onBlock: (id: string) => void; isBlocked: boolean; isBlockedBy: boolean }) {
  const profile = useQuery(api.users.getUserById, { userId: userId as any });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const avatarUrl = useQuery(api.users.getAvatarUrl, profile?.avatar ? { storageId: profile.avatar } : "skip");
  if (!profile) return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={onClose}><motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card rounded-2xl p-8 w-80" onClick={(e) => e.stopPropagation()}><div className="w-2 h-2 rounded-full bg-primary/20 animate-pulse mx-auto" /></motion.div></motion.div>);
  return (
    <>
      <AnimatePresence>{previewUrl && <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}</AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-card rounded-2xl p-6 w-80 border border-border/40" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-3">
            <div className="cursor-pointer" onClick={() => avatarUrl && setPreviewUrl(avatarUrl)}>
              <Avatar nickname={profile.nickname ?? "?"} online={profile.online} size="lg" avatarStorageId={profile.avatar} />
            </div>
            <div className="text-center"><p className="text-lg font-semibold">{profile.nickname}</p><p className="text-xs text-muted-foreground mt-0.5">{profile.online ? <span className="text-emerald-500">в сети</span> : "не в сети"}</p></div>
          </div>
          {profile.bio && <div className="mt-4 px-2"><p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">О себе</p><p className="text-sm text-foreground/80">{profile.bio}</p></div>}
          <div className="mt-5 flex flex-col gap-2">
            {!isBlockedBy && <Button className="w-full" onClick={() => { onStartChat(profile._id); onClose(); }}>Написать</Button>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Закрыть</Button>
              {isBlocked ? <Button variant="outline" className="flex-1 text-emerald-500" onClick={() => { onBlock(profile._id); onClose(); }}><ShieldOff className="w-3.5 h-3.5 mr-1" />Разблокировать</Button> : <Button variant="outline" className="flex-1 text-red-500" onClick={() => { onBlock(profile._id); onClose(); }}><Shield className="w-3.5 h-3.5 mr-1" />Заблокировать</Button>}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─── Chat View ───
function ChatView({ conversationId, onBack, onViewProfile }: { conversationId: string; onBack: () => void; onViewProfile: (id: string) => void }) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgBody, setEditingMsgBody] = useState("");
  const [showForwardId, setShowForwardId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkDeleteForEveryone, setBulkDeleteForEveryone] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const convo = useQuery(api.conversations.getById, { conversationId: conversationId as any });
  const messages = useQuery(api.chat.list, { conversationId: conversationId as any, limit: 200 });
  const pinnedMsg = useQuery(api.chat.getPinnedMessage, { conversationId: conversationId as any });
  const typingUsers = useQuery(api.chat.getTypingUsers, { conversationId: conversationId as any });
  const sendMessage = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const editMessageMutation = useMutation(api.chat.editMessage);
  const pinMessageMutation = useMutation(api.chat.pinMessage);
  const unpinMessageMutation = useMutation(api.chat.unpinMessage);
  const forwardMessageMutation = useMutation(api.chat.forwardMessage);
  const deleteMessageMutation = useMutation(api.chat.deleteMessage);
  const setTypingMutation = useMutation(api.chat.setTyping);
  const clearTypingMutation = useMutation(api.chat.clearTyping);
  const currentUserId = useQuery(api.users.currentUser)?._id;
  const conversations = useQuery(api.conversations.list);

  useEffect(() => { if (conversationId) markRead({ conversationId: conversationId as any }).catch(() => {}); }, [conversationId, markRead]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 100) + "px"; }, [input]);

  const handleTyping = useCallback(() => { setTypingMutation({ conversationId: conversationId as any }).catch(() => {}); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => { clearTypingMutation().catch(() => {}); }, 3000); }, [conversationId, setTypingMutation, clearTypingMutation]);

  const handleSend = async () => { const text = input.trim(); if (!text) return; try { await sendMessage({ conversationId: conversationId as any, body: text, type: "text" }); setInput(""); clearTypingMutation().catch(() => {}); textareaRef.current?.focus(); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); } catch {} };
  const handleEdit = async () => { if (!editingMsgId || !editingMsgBody.trim()) return; await editMessageMutation({ messageId: editingMsgId as any, body: editingMsgBody.trim() }).catch(() => {}); setEditingMsgId(null); setEditingMsgBody(""); };
  const handleForward = async (toConvoId: string) => { if (!showForwardId) return; await forwardMessageMutation({ messageId: showForwardId as any, toConversationId: toConvoId as any }).catch(() => {}); setShowForwardId(null); };
  const handlePin = async (messageId: string) => { await pinMessageMutation({ conversationId: conversationId as any, messageId: messageId as any }).catch(() => {}); setActiveMenuId(null); };
  const handleSendVoice = async (blob: Blob, duration: number) => { try { const uploadUrl = await generateUploadUrl(); const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type }, body: blob }); const { storageId } = await result.json(); await sendMessage({ conversationId: conversationId as any, body: "", type: "voice", file: { type: "audio", storageId, name: "voice.webm" }, duration }); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); } catch {} };
  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploadingImg(true); try { const uploadUrl = await generateUploadUrl(); const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file }); const { storageId } = await result.json(); await sendMessage({ conversationId: conversationId as any, body: "", type: "image", file: { type: "image", storageId, name: file.name } }); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); } catch {} finally { setUploadingImg(false); if (imageInputRef.current) imageInputRef.current.value = ""; } };
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => { try { await deleteMessageMutation({ messageId: messageId as any, forEveryone }); setDeleteConfirmId(null); setActiveMenuId(null); setContextMenuMsgId(null); } catch {} };
  const handleBulkDelete = async (forEveryone: boolean) => { for (const id of bulkDeleteIds) { await deleteMessageMutation({ messageId: id as any, forEveryone }).catch(() => {}); } setBulkDeleteOpen(false); setBulkDeleteIds([]); };
  const handleContextMenu = (e: React.MouseEvent, msgId: string) => { e.preventDefault(); setContextMenuPos({ x: e.clientX, y: e.clientY }); setContextMenuMsgId(msgId); };
  const closeContextMenus = () => { setActiveMenuId(null); setContextMenuMsgId(null); setContextMenuPos(null); };



  if (!convo) return <div className="flex-1 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" /></div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {previewImage && <ImagePreview url={previewImage} onClose={() => setPreviewImage(null)} />}
      {pinnedMsg && (<div className="px-4 py-2 bg-primary/5 border-b border-border/20 flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => { const el = document.getElementById(`msg-${pinnedMsg._id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><Pin className="w-3.5 h-3.5 text-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-primary font-medium">{pinnedMsg.senderName}</p><p className="text-xs text-muted-foreground truncate">{pinnedMsg.body}</p></div><button onClick={(e) => { e.stopPropagation(); unpinMessageMutation({ conversationId: conversationId as any }); }} className="p-1 text-muted-foreground hover:text-foreground"><PinOff className="w-3.5 h-3.5" /></button></div>)}
      <header className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border/30 shrink-0">
        <button onClick={onBack} className="md:hidden p-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        {convo.isGroup ? (<div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm"><Users className="w-4 h-4" /></div><div><p className="text-sm font-semibold">{convo.name}</p><p className="text-[11px] text-muted-foreground">{convo.participants?.length} участников</p></div></div>) : convo.otherUser && (<><div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => convo.otherUser?._id && onViewProfile(convo.otherUser._id as string)}><Avatar nickname={convo.otherUser.nickname ?? "?"} online={convo.otherUser.online} size="sm" avatarStorageId={convo.otherUser.avatar} /><div><p className="text-sm font-semibold hover:underline">{convo.otherUser.nickname}</p><p className="text-[11px] text-muted-foreground">{convo.otherUser.online ? <span className="text-emerald-500">в сети</span> : "не в сети"}</p></div></div></>)}
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6" onClick={(e) => { const el = e.target as HTMLElement; if (!el.closest('[data-menu]')) closeContextMenus(); }}>
        <div className="max-w-2xl mx-auto space-y-1.5">
          {messages && messages.length === 0 && <div className="text-center py-24"><div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><MessageCircle className="w-7 h-7 text-primary/40" /></div><p className="text-sm font-medium text-foreground/60">Начните диалог</p></div>}
          {messages?.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg._id} id={`msg-${msg._id}`} className={`group relative flex ${isMe ? "justify-end" : "justify-start"}`} onContextMenu={(e) => handleContextMenu(e, msg._id)}>
                <div className={`absolute top-1 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}><button onClick={() => { setActiveMenuId(activeMenuId === msg._id ? null : msg._id); }} className="p-1 text-muted-foreground hover:text-foreground rounded"><MoreHorizontal className="w-3.5 h-3.5" /></button></div>
                {activeMenuId === msg._id && (
                  <div data-menu className={`absolute top-8 ${isMe ? "right-0" : "left-0"} z-30 bg-popover border border-border rounded-xl shadow-lg py-1 w-44`}>
                    <button onClick={() => { setActiveMenuId(null); setEditingMsgId(msg._id); setEditingMsgBody(msg.body); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" />Редактировать</button>
                    <button onClick={() => { setActiveMenuId(null); setShowForwardId(msg._id); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Forward className="w-3.5 h-3.5" />Переслать</button>
                    <button onClick={() => { handlePin(msg._id); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Pin className="w-3.5 h-3.5" />{pinnedMsg?._id === msg._id ? "Открепить" : "Закрепить"}</button>
                    <button onClick={() => { setActiveMenuId(null); setSelectedMsgIds(prev => { const next = new Set(prev); next.has(msg._id) ? next.delete(msg._id) : next.add(msg._id); return next; }); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Check className="w-3.5 h-3.5" />{selectedMsgIds.has(msg._id) ? "Снять выделение" : "Выделить"}</button>
                    <div className="border-t border-border/30 my-1" />
                    <button onClick={() => { setDeleteConfirmId(msg._id); setDeleteForEveryone(false); setActiveMenuId(null); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2 text-red-500"><Trash2 className="w-3.5 h-3.5" />Удалить</button>
                  </div>
                )}
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm transition-all ${selectedMsgIds.has(msg._id) ? "ring-2 ring-primary/50 bg-primary/10" : ""} ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`} onClick={() => { if (selectedMsgIds.size > 0 || (selectedMsgIds.size === 0 && false)) { setSelectedMsgIds(prev => { const next = new Set(prev); next.has(msg._id) ? next.delete(msg._id) : next.add(msg._id); return next; }); } }}>
                  {msg.forwardedFrom && <p className="text-[10px] opacity-60 mb-1 flex items-center gap-1"><Forward className="w-3 h-3" />Переслано от {msg.forwardedFrom.senderName}</p>}
                  {msg.replyToId && <div className="text-[10px] opacity-50 mb-1 border-l-2 border-current/30 pl-2">Ответ</div>}
                  {msg.type === "image" && msg.file && <div className="mb-1 cursor-pointer" onClick={() => { /* handled below */ }}><ImageMessage storageId={msg.file.storageId} /></div>}
                  {msg.type === "voice" && msg.file && <AudioMessage storageId={msg.file.storageId} isMe={isMe} />}
                  {msg.type === "text" && editingMsgId === msg._id ? (
                    <div className="flex flex-col gap-1">
                      <textarea value={editingMsgBody} onChange={(e) => setEditingMsgBody(e.target.value)} className="bg-transparent border border-current/20 rounded-lg p-1 text-sm resize-none outline-none" rows={2} autoFocus />
                      <div className="flex gap-1"><button onClick={handleEdit} className="text-[10px] bg-white/20 rounded px-2 py-0.5">Сохранить</button><button onClick={() => { setEditingMsgId(null); setEditingMsgBody(""); }} className="text-[10px] opacity-60 px-2 py-0.5">Отмена</button></div>
                    </div>
                  ) : msg.type === "text" ? (
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  ) : null}
                  {msg.type !== "text" && msg.body && <p className="whitespace-pre-wrap break-words mt-1">{msg.body}</p>}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.createdAt)}</span>
                    {msg.edited && <span className="text-[10px] opacity-50">(ред.)</span>}
                    {isMe && msg.read && <Check className="w-3 h-3 opacity-60" />}
                  </div>
                </div>
              </div>
            );
          })}
          {typingUsers && typingUsers.length > 0 && <div className="text-[11px] text-muted-foreground px-2 py-1 animate-pulse">{typingUsers.join(", ")} печатает...</div>}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenuPos && contextMenuMsgId && (
        <div data-menu style={{ position: "fixed", left: contextMenuPos.x, top: contextMenuPos.y, zIndex: 60 }} className="bg-popover border border-border rounded-xl shadow-lg py-1 w-44">
          <button onClick={() => { setContextMenuMsgId(null); setContextMenuPos(null); setEditingMsgId(contextMenuMsgId); setEditingMsgBody(messages?.find(m => m._id === contextMenuMsgId)?.body ?? ""); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" />Редактировать</button>
          <button onClick={() => { setContextMenuMsgId(null); setContextMenuPos(null); setShowForwardId(contextMenuMsgId); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Forward className="w-3.5 h-3.5" />Переслать</button>
          <button onClick={() => { setContextMenuMsgId(null); setContextMenuPos(null); pinMessageMutation({ conversationId: conversationId as any, messageId: contextMenuMsgId as any }).catch(() => {}); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Pin className="w-3.5 h-3.5" />{pinnedMsg?._id === contextMenuMsgId ? "Открепить" : "Закрепить"}</button>
          <button onClick={() => { setContextMenuMsgId(null); setContextMenuPos(null); setSelectedMsgIds(prev => { const next = new Set(prev); next.has(contextMenuMsgId) ? next.delete(contextMenuMsgId) : next.add(contextMenuMsgId); return next; }); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"><Check className="w-3.5 h-3.5" />Выделить</button>
          <div className="border-t border-border/30 my-1" />
          <button onClick={() => { setContextMenuMsgId(null); setContextMenuPos(null); setDeleteConfirmId(contextMenuMsgId); setDeleteForEveryone(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2 text-red-500"><Trash2 className="w-3.5 h-3.5" />Удалить</button>
        </div>
      )}

      {/* Delete Message Confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={() => setDeleteConfirmId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card rounded-2xl p-5 w-72 border border-border/40" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold mb-3">Удалить сообщение?</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-4 cursor-pointer"><input type="checkbox" checked={deleteForEveryone} onChange={(e) => setDeleteForEveryone(e.target.checked)} className="rounded" /><span>Удалить для всех</span></label>
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Отмена</Button><Button variant="destructive" className="flex-1" onClick={() => handleDeleteMessage(deleteConfirmId, deleteForEveryone)}>Удалить</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirm */}
      <AnimatePresence>
        {bulkDeleteOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={() => setBulkDeleteOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-card rounded-2xl p-5 w-72 border border-border/40" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold mb-3">Удалить {bulkDeleteIds.length} {bulkDeleteIds.length === 1 ? "сообщение" : "сообщений"}?</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-4 cursor-pointer"><input type="checkbox" checked={bulkDeleteForEveryone} onChange={(e) => setBulkDeleteForEveryone(e.target.checked)} className="rounded" /><span>Удалить для всех</span></label>
              <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setBulkDeleteOpen(false)}>Отмена</Button><Button variant="destructive" className="flex-1" onClick={() => handleBulkDelete(bulkDeleteForEveryone)}>Удалить</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Dialog */}
      <AnimatePresence>
        {showForwardId && conversations && <ForwardDialog messageId={showForwardId} conversations={conversations} onForward={handleForward} onClose={() => setShowForwardId(null)} />}
      </AnimatePresence>

      {/* Selection Toolbar */}
      {selectedMsgIds.size > 0 && (
        <div className="border-t border-primary/20 bg-primary/5 px-4 py-2.5 shrink-0 flex items-center justify-between">
          <span className="text-xs font-medium text-primary">Выбрано: {selectedMsgIds.size}</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { const ids = [...selectedMsgIds]; if (ids.length === 1) { setShowForwardId(ids[0]); } setSelectedMsgIds(new Set()); }}>Переслать</Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-red-500" onClick={() => { const ids = [...selectedMsgIds]; if (ids.length === 1) { setDeleteConfirmId(ids[0]); setDeleteForEveryone(false); } else { setBulkDeleteIds(ids); setBulkDeleteOpen(true); } setSelectedMsgIds(new Set()); }}>Удалить</Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedMsgIds(new Set())}>Отмена</Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/30 bg-card px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleSendImage} />
          <Button size="icon" variant="ghost" className="shrink-0 text-muted-foreground hover:text-primary" onClick={() => imageInputRef.current?.click()} disabled={uploadingImg}>
            {uploadingImg ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-5 h-5" />}
          </Button>
          <div className="relative flex-1">
            <AnimatePresence>{showEmoji && <EmojiPicker onSelect={(e) => setInput((v) => v + e)} onClose={() => setShowEmoji(false)} />}</AnimatePresence>
            <Button size="icon" variant="ghost" className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" onClick={() => setShowEmoji(!showEmoji)}><Smile className="w-5 h-5" /></Button>
            <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); handleTyping(); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Сообщение..." className="w-full bg-muted/50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none resize-none max-h-[100px] placeholder:text-muted-foreground/50 border border-transparent focus:border-border/40 transition-colors" rows={1} />
          </div>
          <VoiceRecorder onSend={handleSendVoice} />
          <Button size="icon" className="shrink-0 rounded-full bg-primary" onClick={handleSend} disabled={!input.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Messenger ───
export default function Messenger() {
  const { signOut } = useAuth();
  const [view, setView] = useState<View>("chats");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const theme = useTheme();

  const conversations = useQuery(api.conversations.list);
  const contacts = useQuery(api.contacts.list);
  const currentUser = useQuery(api.users.currentUser);
  const searchResults = useQuery(api.users.searchByNickname, searchQuery.length >= 2 ? { nickname: searchQuery } : "skip");
  const blockedUsers = useQuery(api.users.getBlockedUsers);
  const isBlockedQuery = useQuery(api.users.isBlocked, profileUserId ? { targetUserId: profileUserId as any } : "skip");
  const isBlockedByQuery = useQuery(api.users.isBlockedBy, profileUserId ? { targetUserId: profileUserId as any } : "skip");
  const createConversation = useMutation(api.conversations.getOrCreate);
  const createGroupMutation = useMutation(api.conversations.createGroup);
  const addContact = useMutation(api.contacts.add);
  const updateProfile = useMutation(api.users.updateProfile);
  const heartbeatMutation = useMutation(api.users.heartbeat);
  const blockUserMutation = useMutation(api.users.blockUser);
  const unblockUserMutation = useMutation(api.users.unblockUser);
  const deleteConversationMutation = useMutation(api.chat.deleteConversation);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);

  // Heartbeat
  useEffect(() => { const iv = setInterval(() => { heartbeatMutation().catch(() => {}); }, 30_000); heartbeatMutation().catch(() => {}); return () => clearInterval(iv); }, [heartbeatMutation]);

  // Sound for new messages
  const prevConvoMapRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!conversations) return;
    for (const c of conversations) {
      if (!c.lastMessageAt) continue;
      const prev = prevConvoMapRef.current.get(c._id) ?? 0;
      if (c.lastMessageAt > prev && c.lastMessageSender !== currentUser?._id) {
        playNotifSound();
      }
      prevConvoMapRef.current.set(c._id, c.lastMessageAt);
    }
  }, [conversations, currentUser]);

  const handleStartChat = async (userId: string) => {
    try { const { conversationId } = await createConversation({ otherUserId: userId as any }); setActiveChat(conversationId); setView("chat"); } catch {}
  };

  const handleAddContact = async (userId: string) => { try { await addContact({ contactId: userId as any }); } catch {} };

  const handleBlockUser = async (userId: string) => {
    if (isBlockedQuery) { await unblockUserMutation({ targetUserId: userId as any }).catch(() => {}); }
    else { await blockUserMutation({ targetUserId: userId as any }).catch(() => {}); }
  };

  const handleCreateGroup = async (name: string, ids: string[]) => {
    try { const { conversationId } = await createGroupMutation({ name, participantIds: ids as any[] }); setActiveChat(conversationId); setView("chat"); setShowCreateGroup(false); } catch {}
  };

  const handleDeleteChat = async (convoId: string) => {
    if (!confirm("Удалить диалог со всеми сообщениями?")) return;
    try {
      await deleteConversationMutation({ conversationId: convoId as any });
      if (activeChat === convoId) { setActiveChat(null); setView("chats"); }
    } catch {}
  };

  // Profile settings
  const [settingsNickname, setSettingsNickname] = useState("");
  const [settingsBio, setSettingsBio] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setSettingsNickname(currentUser.nickname ?? "");
      setSettingsBio(currentUser.bio ?? "");
    }
  }, [currentUser]);

  const currentAvatarUrl = useQuery(api.users.getAvatarUrl, currentUser?.avatar ? { storageId: currentUser.avatar } : "skip");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const uploadUrl = await generateAvatarUploadUrl();
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await updateProfile({ avatar: storageId });
    } catch {}
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };


  const handleSaveProfile = async () => {
    setSettingsSaving(true);
    try { await updateProfile({ nickname: settingsNickname.trim(), bio: settingsBio.trim() }); } catch {}
    setSettingsSaving(false);
  };



  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {previewImage && <ImagePreview url={previewImage} onClose={() => setPreviewImage(null)} />}

      <AnimatePresence>
        {profileUserId && <UserProfile userId={profileUserId} onClose={() => setProfileUserId(null)} onStartChat={handleStartChat} onBlock={handleBlockUser} isBlocked={!!isBlockedQuery} isBlockedBy={!!isBlockedByQuery} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateGroup && contacts && <CreateGroupDialog contacts={contacts} onCreate={handleCreateGroup} onClose={() => setShowCreateGroup(false)} />}
      </AnimatePresence>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border/30 flex flex-col bg-card shrink-0 h-full">
          {/* Sidebar Header */}
          <div className="px-4 py-3 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold tracking-tight">Whisper</h1>
              <div className="flex items-center gap-1">
                <button onClick={theme.toggle} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors" title={theme.dark ? "Светлая тема" : "Тёмная тема"}>
                  {theme.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button onClick={() => { setShowSettings(!showSettings); setView("settings"); }} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"><Settings className="w-4 h-4" /></button>
                <button onClick={signOut} className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted/50 transition-colors"><LogOut className="w-4 h-4" /></button>
              </div>
            </div>
            {!showSettings && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={view === "chats" ? searchQuery : ""} onChange={(e) => { setSearchQuery(e.target.value); if (searchQuery.length >= 2) setView("chats"); }} onFocus={() => { if (searchQuery.length >= 2) setView("chats"); }} placeholder="Найти пользователя..." className="w-full bg-muted/50 rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-transparent focus:border-border/40 transition-colors" />
              </div>
            )}
          </div>

          {/* Nav Tabs */}
          {!showSettings && (
            <div className="flex border-b border-border/30 shrink-0">
              {([["chats", "Чаты", MessageCircle], ["contacts", "Контакты", Users]] as [View, string, any][]).map(([v, label, Icon]) => (
                <button key={v} onClick={() => setView(v)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${view === v ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}><Icon className="w-3.5 h-3.5" />{label}</button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {showSettings ? (
              /* Settings */
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowSettings(false); setView("chats"); }} className="p-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></button>
                  <p className="text-sm font-semibold">Настройки</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    {currentAvatarUrl ? <img src={currentAvatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-primary/15 text-primary font-semibold text-2xl flex items-center justify-center">{getInitials(currentUser?.nickname ?? "?")}</div>}
                    <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><ImagePlus className="w-6 h-6 text-white" /></div>
                  </div>
                  <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  {avatarUploading && <p className="text-xs text-muted-foreground animate-pulse">Загрузка...</p>}
                </div>
                <div><label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Никнейм</label><input value={settingsNickname} onChange={(e) => setSettingsNickname(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm outline-none border border-transparent focus:border-border/40 mt-1" placeholder="Ваш никнейм" /></div>
                <div><label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">О себе</label><textarea value={settingsBio} onChange={(e) => setSettingsBio(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm outline-none border border-transparent focus:border-border/40 mt-1 resize-none" rows={3} placeholder="Расскажите о себе..." /></div>
                <Button onClick={handleSaveProfile} disabled={settingsSaving} className="w-full">{settingsSaving ? "Сохранение..." : "Сохранить"}</Button>

                {blockedUsers && blockedUsers.length > 0 && (
                  <div><p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Заблокированные</p>
                    {blockedUsers.map((u) => (<div key={u._id} className="flex items-center gap-3 py-2"><Avatar nickname={u.nickname ?? "?"} size="sm" avatarStorageId={u.avatar} /><span className="text-sm flex-1">{u.nickname}</span><button onClick={() => handleBlockUser(u._id as string)} className="text-xs text-emerald-500 hover:underline">Разблокировать</button></div>))}
                  </div>
                )}
              </div>
            ) : view === "chats" ? (
              /* Search Results or Chats */
              searchQuery.length >= 2 && searchResults ? (
                <div>
                  <p className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Результаты поиска</p>
                  {searchResults.length === 0 && <p className="px-4 py-4 text-xs text-muted-foreground">Никого не нашли</p>}
                  {searchResults.map((user) => (
                    <div key={user._id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <Avatar nickname={user.nickname} online={user.online} size="md" avatarStorageId={user.avatar} onClick={() => setProfileUserId(user._id as string)} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.nickname}</p><p className="text-[11px] text-muted-foreground">{user.online ? <span className="text-emerald-500">в сети</span> : "не в сети"}</p></div>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleStartChat(user._id)}>Написать</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {conversations && conversations.length === 0 && <div className="text-center py-12"><p className="text-sm text-muted-foreground">Нет диалогов</p><p className="text-xs text-muted-foreground/60 mt-1">Найдите пользователя, чтобы начать</p></div>}
                  {conversations?.map((c) => {
                    const name = (c.isGroup ? c.name : c.otherUser?.nickname) ?? "Unknown";
                    return (
                      <div key={c._id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group relative" onContextMenu={(e) => { e.preventDefault(); if (confirm("Удалить диалог?")) handleDeleteChat(c._id); }} onClick={() => { setActiveChat(c._id); setView("chat"); }}>
                        {c.isGroup ? <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm"><Users className="w-4 h-4" /></div> : <Avatar nickname={name} online={c.otherUser?.online} size="md" avatarStorageId={c.otherUser?.avatar} onClick={() => { if (c.otherUser?._id) setProfileUserId(c.otherUser._id as string); }} />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between"><p className="text-sm font-medium truncate">{name}</p><span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.lastMessageAt)}</span></div>
                          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground truncate">{c.lastMessage || "Нет сообщений"}</p>{(c.unreadCount ?? 0) > 0 && <span className="shrink-0 ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{c.unreadCount}</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Contacts */
              <div>
                <div className="px-4 py-2 flex items-center justify-between"><p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Контакты</p><button onClick={() => setShowCreateGroup(true)} className="p-1 text-muted-foreground hover:text-primary rounded" title="Групповой чат"><UserPlus className="w-4 h-4" /></button></div>
                {contacts && contacts.length === 0 && <p className="px-4 py-4 text-xs text-muted-foreground">Пока нет контактов. Найдите пользователя через поиск.</p>}
                {contacts?.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setProfileUserId(c._id as string); }}>
                    <Avatar nickname={c.nickname ?? "?"} online={c.online} size="md" avatarStorageId={c.avatar} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.nickname}</p><p className="text-[11px] text-muted-foreground">{c.online ? <span className="text-emerald-500">в сети</span> : "не в сети"}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full">
          {activeChat && view === "chat" ? (
            <ChatView conversationId={activeChat} onBack={() => { setActiveChat(null); setView("chats"); }} onViewProfile={(id) => setProfileUserId(id)} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <MessageCircle className="w-10 h-10 text-primary/30" />
                </div>
                <h2 className="text-xl font-bold mb-1">Whisper</h2>
                <p className="text-sm text-muted-foreground">Выберите диалог или начните новый</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
