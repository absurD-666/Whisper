import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db.get(userId);
    const blocked = currentUser?.blockedUsers ?? [];

    const allConvos = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .collect();

    const myConvos = allConvos.filter((c) =>
      c.participants.includes(userId) &&
      !c.participants.some((p) => blocked.includes(p) && p !== userId)
    );

    // Count unread messages per conversation
    const myConvoIds = new Set(myConvos.map(c => c._id));
    const allMessages = await ctx.db.query("messages").collect();
    const unreadMap = new Map<string, number>();
    for (const msg of allMessages) {
      if (!msg.read && msg.senderId !== userId && myConvoIds.has(msg.conversationId)) {
        unreadMap.set(msg.conversationId, (unreadMap.get(msg.conversationId) ?? 0) + 1);
      }
    }

    const enriched = await Promise.all(
      myConvos.map(async (convo) => {
        const otherIds = convo.participants.filter((p) => p !== userId);

        if (convo.name) {
          const participants = await Promise.all(
            convo.participants.map(async (pid) => {
              const u = await ctx.db.get(pid);
              return u ? { _id: u._id, nickname: u.nickname, avatar: u.avatar, online: u.lastSeen ? Date.now() - u.lastSeen < 60_000 : false } : null;
            })
          );
          return {
            _id: convo._id,
            isGroup: true,
            name: convo.name,
            participants: participants.filter(Boolean),
            otherUser: null,          lastMessage: convo.lastMessage,
          lastMessageAt: convo.lastMessageAt,
          lastMessageSender: convo.lastMessageSender,
          lastMessageType: convo.lastMessageType,
          unreadCount: unreadMap.get(convo._id) ?? 0,
          };
        }

        const otherId = otherIds[0];
        const other = otherId ? await ctx.db.get(otherId) : null;
        return {
          _id: convo._id,
          isGroup: false,
          name: undefined,
          participants: [],
          otherUser: other
            ? {
                _id: other._id,
                nickname: other.nickname,
                avatar: other.avatar,
                online: other.lastSeen ? Date.now() - other.lastSeen < 60_000 : false,
                lastSeen: other.lastSeen,
              }
            : null,
          lastMessage: convo.lastMessage,
          lastMessageAt: convo.lastMessageAt,
          lastMessageSender: convo.lastMessageSender,
          lastMessageType: convo.lastMessageType,
          unreadCount: unreadMap.get(convo._id) ?? 0,
        };
      })
    );

    return enriched;
  },
});

export const getOrCreate = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === args.otherUserId) throw new Error("Cannot chat with yourself");

    const user = await ctx.db.get(userId);
    const blocked = user?.blockedUsers ?? [];
    if (blocked.includes(args.otherUserId)) throw new Error("User is blocked");

    const target = await ctx.db.get(args.otherUserId);
    const targetBlocked = target?.blockedUsers ?? [];
    if (targetBlocked.includes(userId)) throw new Error("Cannot create conversation with this user");

    const allConvos = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => q.eq("participants", [userId, args.otherUserId]))
      .collect();

    const existing = allConvos.find((c) => c.participants.length === 2);
    if (existing) return { conversationId: existing._id };

    const allConvos2 = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => q.eq("participants", [args.otherUserId, userId]))
      .collect();

    const existing2 = allConvos2.find((c) => c.participants.length === 2);
    if (existing2) return { conversationId: existing2._id };

    const conversationId = await ctx.db.insert("conversations", {
      participants: [userId, args.otherUserId],
    });

    return { conversationId };
  },
});

export const getById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const convo = await ctx.db.get(args.conversationId);
    if (!convo) return null;
    if (!convo.participants.includes(userId)) return null;

    const otherIds = convo.participants.filter((p) => p !== userId);

    if (convo.name) {
      const participants = await Promise.all(
        convo.participants.map(async (pid) => {
          const u = await ctx.db.get(pid);
          return u ? { _id: u._id, nickname: u.nickname, avatar: u.avatar, bio: u.bio, online: u.lastSeen ? Date.now() - u.lastSeen < 60_000 : false, lastSeen: u.lastSeen } : null;
        })
      );
      return {
        _id: convo._id,
        isGroup: true,
        name: convo.name,
        participants: participants.filter(Boolean),
        otherUser: null,
        lastMessage: convo.lastMessage,
        lastMessageAt: convo.lastMessageAt,
        pinnedMessageId: convo.pinnedMessageId,
      };
    }

    const otherId = otherIds[0];
    const other = otherId ? await ctx.db.get(otherId) : null;
    return {
      _id: convo._id,
      isGroup: false,
      name: undefined,
      participants: [],
      otherUser: other
        ? {
            _id: other._id,
            nickname: other.nickname,
            avatar: other.avatar,
            bio: other.bio,
            online: other.lastSeen ? Date.now() - other.lastSeen < 60_000 : false,
            lastSeen: other.lastSeen,
          }
        : null,
      lastMessage: convo.lastMessage,
      lastMessageAt: convo.lastMessageAt,
      pinnedMessageId: convo.pinnedMessageId,
    };
  },
});

// ─── Group Chat ───

export const createGroup = mutation({
  args: {
    name: v.string(),
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const name = args.name.trim();
    if (name.length < 2 || name.length > 50) throw new Error("Group name must be 2-50 characters");
    const uniqueParticipants = [...new Set([userId, ...args.participantIds])];
    if (uniqueParticipants.length < 2) throw new Error("Group needs at least 2 participants");

    const conversationId = await ctx.db.insert("conversations", {
      name,
      participants: uniqueParticipants,
    });

    return { conversationId };
  },
});

export const addParticipant = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !convo.name) throw new Error("Not a group chat");
    if (!convo.participants.includes(currentUserId)) throw new Error("Not a participant");
    if (convo.participants.includes(args.userId)) return { success: true };
    await ctx.db.patch(args.conversationId, {
      participants: [...convo.participants, args.userId],
    });
    return { success: true };
  },
});

export const removeParticipant = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !convo.name) throw new Error("Not a group chat");
    if (!convo.participants.includes(currentUserId)) throw new Error("Not a participant");
    const updated = convo.participants.filter((p) => p !== args.userId);
    if (updated.length < 2) throw new Error("Group needs at least 2 participants");
    await ctx.db.patch(args.conversationId, { participants: updated });
    return { success: true };
  },
});

export const updateGroupName = mutation({
  args: { conversationId: v.id("conversations"), name: v.string() },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !convo.name) throw new Error("Not a group chat");
    if (!convo.participants.includes(currentUserId)) throw new Error("Not a participant");
    const name = args.name.trim();
    if (name.length < 2 || name.length > 50) throw new Error("Name must be 2-50 characters");
    await ctx.db.patch(args.conversationId, { name });
    return { success: true };
  },
});
