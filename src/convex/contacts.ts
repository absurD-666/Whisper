import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all contacts where I'm the user or the contact
    const mine = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const theirs = await ctx.db
      .query("contacts")
      .withIndex("by_contactId", (q) => q.eq("contactId", userId))
      .collect();

    const allIds = new Set<string>();
    const contactMap = new Map<string, { status: string; contactId: string }>();

    for (const c of mine) {
      allIds.add(c.contactId);
      contactMap.set(c.contactId, { status: c.status, contactId: c.contactId });
    }
    for (const c of theirs) {
      allIds.add(c.userId);
      contactMap.set(c.userId, { status: c.status, contactId: c.userId });
    }

    const contacts = [];
    for (const [id, info] of contactMap) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), id))
        .first();
      if (user) {
        contacts.push({
          _id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          bio: user.bio,
          online: user.lastSeen ? Date.now() - user.lastSeen < 60_000 : false,
          status: info.status,
        });
      }
    }

    return contacts;
  },
});

export const add = mutation({
  args: { contactId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === args.contactId) throw new Error("Cannot add yourself");

    // Check if already exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_pair", (q) =>
        q.eq("userId", userId).eq("contactId", args.contactId)
      )
      .unique();

    if (existing) throw new Error("Already in contacts");

    // Check reverse
    const reverse = await ctx.db
      .query("contacts")
      .withIndex("by_pair", (q) =>
        q.eq("userId", args.contactId).eq("contactId", userId)
      )
      .unique();

    if (reverse) {
      // Auto-accept
      await ctx.db.patch(reverse._id, { status: "accepted" });
      return { success: true };
    }

    await ctx.db.insert("contacts", {
      userId,
      contactId: args.contactId,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const accept = mutation({
  args: { contactId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_pair", (q) =>
        q.eq("userId", args.contactId).eq("contactId", userId)
      )
      .unique();

    if (!existing) throw new Error("Contact request not found");
    await ctx.db.patch(existing._id, { status: "accepted" });
  },
});

export const remove = mutation({
  args: { contactId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Try both directions
    const mine = await ctx.db
      .query("contacts")
      .withIndex("by_pair", (q) =>
        q.eq("userId", userId).eq("contactId", args.contactId)
      )
      .unique();

    if (mine) {
      await ctx.db.delete(mine._id);
      return;
    }

    const theirs = await ctx.db
      .query("contacts")
      .withIndex("by_pair", (q) =>
        q.eq("userId", args.contactId).eq("contactId", userId)
      )
      .unique();

    if (theirs) {
      await ctx.db.delete(theirs._id);
    }
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const q = args.query.trim().toLowerCase();
    if (q.length < 2) return [];

    const all = await ctx.db.query("users").collect();
    return all
      .filter(
        (u) =>
          u._id !== userId &&
          u.nickname &&
          u.nickname.toLowerCase().includes(q)
      )
      .slice(0, 20)
      .map((u) => ({
        _id: u._id,
        nickname: u.nickname!,
        avatar: u.avatar,
        bio: u.bio,
        online: u.lastSeen ? Date.now() - u.lastSeen < 60_000 : false,
      }));
  },
});
