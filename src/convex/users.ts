import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};

export const setNickname = mutation({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const nick = args.nickname.trim().toLowerCase();
    if (nick.length < 3 || nick.length > 20) {
      throw new Error("Nickname must be 3-20 characters");
    }
    if (!/^[a-z0-9_]+$/.test(nick)) {
      throw new Error("Nickname: only lowercase letters, numbers, underscores");
    }

    // Check uniqueness
    const existing = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) => q.eq("nickname", nick))
      .unique();
    if (existing && existing._id !== userId) {
      throw new Error("This nickname is already taken");
    }

    await ctx.db.patch(userId, { nickname: nick });
    return { success: true };
  },
});

export const updateProfile = mutation({
  args: {
    nickname: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const updates: Record<string, string> = {};
    if (args.nickname !== undefined) updates.nickname = args.nickname.trim();
    if (args.bio !== undefined) updates.bio = args.bio.trim();
    if (args.avatar !== undefined) updates.avatar = args.avatar;

    await ctx.db.patch(userId, updates);
  },
});

export const searchByNickname = query({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const nick = args.nickname.trim().toLowerCase();
    if (nick.length < 2) return [];

    const currentUserId = await getAuthUserId(ctx);

    const all = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) =>
        q.gte("nickname", nick).lte("nickname", nick + "\uffff")
      )
      .collect();

    return all
      .filter((u) => u.nickname && u._id !== currentUserId)
      .map((u) => ({
        _id: u._id,
        nickname: u.nickname!,
        avatar: u.avatar,
        bio: u.bio,
        online: u.lastSeen ? Date.now() - u.lastSeen < 60_000 : false,
      }));
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      online: user.lastSeen ? Date.now() - user.lastSeen < 60_000 : false,
      lastSeen: user.lastSeen,
    };
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, {
      lastSeen: Date.now(),
    });
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { avatar: args.storageId });
  },
});

export const getAvatarUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId as any);
    return url ?? null;
  },
});

// ─── Block/Unblock User ───
export const blockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const blocked = user.blockedUsers ?? [];
    if (!blocked.includes(args.targetUserId)) {
      await ctx.db.patch(userId, { blockedUsers: [...blocked, args.targetUserId] });
    }
    return { success: true };
  },
});

export const unblockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const blocked = (user.blockedUsers ?? []).filter((id) => id !== args.targetUserId);
    await ctx.db.patch(userId, { blockedUsers: blocked });
    return { success: true };
  },
});

export const isBlocked = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    if (!user) return false;
    return (user.blockedUsers ?? []).includes(args.targetUserId);
  },
});

export const isBlockedBy = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;
    return (target.blockedUsers ?? []).includes(userId);
  },
});

export const getBlockedUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    const blocked = user.blockedUsers ?? [];
    const result = [];
    for (const bid of blocked) {
      const u = await ctx.db.get(bid);
      if (u) result.push({ _id: u._id, nickname: u.nickname, avatar: u.avatar });
    }
    return result;
  },
});
