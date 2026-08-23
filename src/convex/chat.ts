import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("voice")
    ),
    file: v.optional(
      v.object({
        type: v.string(),
        storageId: v.string(),
        name: v.string(),
      })
    ),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const convo = await ctx.db.get(args.conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (!convo.participants.includes(userId)) throw new Error("Not a participant");

    const trimmed = args.body.trim();
    if (trimmed.length === 0 && !args.file) throw new Error("Message cannot be empty");
    if (trimmed.length > 5000) throw new Error("Message too long");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      body: trimmed,
      type: args.type,
      file: args.file ?? undefined,
      duration: args.duration ?? undefined,
      read: false,
      createdAt: Date.now(),
    });

    const lastMsg =
      args.type === "voice" ? "🎤 Голосовое" :
      args.type === "image" ? "📷 Фото" :
      args.type === "file" ? "📎 Файл" :
      trimmed;

    await ctx.db.patch(args.conversationId, {
      lastMessage: lastMsg,
      lastMessageAt: Date.now(),
      lastMessageSender: userId,
      lastMessageType: args.type,
    });

    return { success: true };
  },
});

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !convo.participants.includes(userId)) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(args.limit ?? 100);

    return messages.reverse();
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const toMark = unread.filter(
      (m) => !m.read && m.senderId !== userId
    );

    for (const msg of toMark) {
      await ctx.db.patch(msg._id, { read: true });
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as any);
  },
});

// ─── Edit Message ───
export const editMessage = mutation({
  args: { messageId: v.id("messages"), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    if (msg.senderId !== userId) throw new Error("Not your message");
    const trimmed = args.body.trim();
    if (trimmed.length === 0) throw new Error("Message cannot be empty");
    await ctx.db.patch(args.messageId, { body: trimmed, edited: true, editedAt: Date.now() });
    return { success: true };
  },
});

// ─── Pin Message ───
export const pinMessage = mutation({
  args: { conversationId: v.id("conversations"), messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (!convo.participants.includes(userId)) throw new Error("Not a participant");
    if (convo.pinnedMessageId === args.messageId) {
      await ctx.db.patch(args.conversationId, { pinnedMessageId: undefined });
    } else {
      await ctx.db.patch(args.conversationId, { pinnedMessageId: args.messageId });
    }
    return { success: true };
  },
});

// ─── Unpin Message ───
export const unpinMessage = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.conversationId, { pinnedMessageId: undefined });
    return { success: true };
  },
});



// ─── Forward Message ───
export const forwardMessage = mutation({
  args: { messageId: v.id("messages"), toConversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const origMsg = await ctx.db.get(args.messageId);
    if (!origMsg) throw new Error("Original message not found");
    const convo = await ctx.db.get(args.toConversationId);
    if (!convo) throw new Error("Target conversation not found");
    if (!convo.participants.includes(userId)) throw new Error("Not a participant in target");
    const sender = await ctx.db.get(origMsg.senderId);
    await ctx.db.insert("messages", {
      conversationId: args.toConversationId,
      senderId: userId,
      body: origMsg.body,
      type: origMsg.type,
      file: origMsg.file,
      duration: origMsg.duration,
      read: false,
      createdAt: Date.now(),
      forwardedFrom: { senderName: sender?.nickname ?? "Unknown", body: origMsg.body },
    });
    const lastMsg = origMsg.type === "voice" ? "🎤 Голосовое" : origMsg.type === "image" ? "📷 Фото" : origMsg.body;
    await ctx.db.patch(args.toConversationId, {
      lastMessage: lastMsg,
      lastMessageAt: Date.now(),
      lastMessageSender: userId,
      lastMessageType: origMsg.type,
    });
    return { success: true };
  },
});

// ─── Typing Indicator ───
export const setTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, { typingIn: args.conversationId, typingAt: Date.now() });
  },
});

export const clearTyping = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, { typingIn: undefined, typingAt: undefined });
  },
});

// ─── Get Pinned Message ───
export const getPinnedMessage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !convo.pinnedMessageId) return null;
    const msg = await ctx.db.get(convo.pinnedMessageId);
    if (!msg) return null;
    const sender = await ctx.db.get(msg.senderId);
    return {
      _id: msg._id,
      body: msg.body,
      type: msg.type,
      senderName: sender?.nickname ?? "Unknown",
      createdAt: msg.createdAt,
    };
  },
});

// ─── Get users typing in a conversation ───
export const getTypingUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const convo = await ctx.db.get(args.conversationId);
    if (!convo) return [];
    const typingUsers = [];
    for (const pid of convo.participants) {
      if (pid === userId) continue;
      const user = await ctx.db.get(pid);
      if (user && user.typingIn === args.conversationId && user.typingAt && Date.now() - user.typingAt < 5000) {
        typingUsers.push(user.nickname ?? "Unknown");
      }
    }
    return typingUsers;
  },
});

// ─── Call Signaling ───















// ─── Delete Message ───
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    forEveryone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    const convo = await ctx.db.get(msg.conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (!convo.participants.includes(userId)) throw new Error("Not a participant");

    if (args.forEveryone) {
      if (msg.senderId !== userId) throw new Error("Can only delete your own messages for everyone");
      await ctx.db.delete(args.messageId);
      // Update conversation last message if needed
      if (convo.lastMessageAt === msg.createdAt) {
        await ctx.db.patch(msg.conversationId, {
          lastMessage: "Сообщение удалено",
          lastMessageAt: Date.now(),
          lastMessageSender: userId,
          lastMessageType: "text",
        });
      }
    } else {
      // Delete for self: mark with a special deleted body
      await ctx.db.patch(args.messageId, {
        body: "🗑 Сообщение удалено",
        type: "text" as const,
        file: undefined,
        edited: false,
      });
    }
    return { success: true };
  },
});

// ─── Delete Conversation ───
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo) throw new Error("Conversation not found");
    if (!convo.participants.includes(userId)) throw new Error("Not a participant");

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete the conversation
    await ctx.db.delete(args.conversationId);
    return { success: true };
  },
});

// Stubs for removed features (kept for type compatibility)
export const initiateCall = mutation({ args: { conversationId: v.id("conversations"), callType: v.string() }, handler: async () => ({ success: true }) });
export const acceptCall = mutation({ args: { conversationId: v.id("conversations") }, handler: async () => ({ success: true }) });
export const rejectCall = mutation({ args: { conversationId: v.id("conversations") }, handler: async () => ({ success: true }) });
export const endCall = mutation({ args: { conversationId: v.id("conversations") }, handler: async () => ({ success: true }) });
export const sendSignal = mutation({ args: { conversationId: v.id("conversations"), toUser: v.id("users"), type: v.string(), payload: v.string() }, handler: async () => ({ success: true }) });
export const consumeSignal = mutation({ args: { signalId: v.id("signaling") }, handler: async () => ({ success: true }) });
export const addReaction = mutation({ args: { messageId: v.id("messages"), emoji: v.string() }, handler: async () => ({ success: true }) });
export const pollSignals = query({ args: {}, handler: async () => { return []; } });
