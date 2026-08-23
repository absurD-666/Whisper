import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(v.string()),
      nickname: v.optional(v.string()),
      avatar: v.optional(v.string()),
      bio: v.optional(v.string()),
      online: v.optional(v.boolean()),
      lastSeen: v.optional(v.number()),
      blockedUsers: v.optional(v.array(v.id("users"))),
      typingIn: v.optional(v.id("conversations")),
      typingAt: v.optional(v.number()),
    })
      .index("email", ["email"])
      .index("by_nickname", ["nickname"]),

    conversations: defineTable({
      participants: v.array(v.id("users")),
      name: v.optional(v.string()),
      lastMessage: v.optional(v.string()),
      lastMessageAt: v.optional(v.number()),
      lastMessageSender: v.optional(v.id("users")),
      lastMessageType: v.optional(v.string()),
      pinnedMessageId: v.optional(v.id("messages")),
      callState: v.optional(v.string()),
      callCaller: v.optional(v.id("users")),
      callType: v.optional(v.string()),
    })
      .index("by_participants", ["participants"])
      .index("by_lastMessageAt", ["lastMessageAt"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.id("users"),
      body: v.string(),
      type: v.union(
        v.literal("text"),
        v.literal("image"),
        v.literal("file"),
        v.literal("voice"),
      ),
      file: v.optional(
        v.object({
          type: v.string(),
          storageId: v.string(),
          name: v.string(),
        })
      ),
      duration: v.optional(v.number()),
      read: v.boolean(),
      createdAt: v.number(),
      edited: v.optional(v.boolean()),
      editedAt: v.optional(v.number()),
      pinned: v.optional(v.boolean()),
      pinnedBy: v.optional(v.id("users")),
      forwardedFrom: v.optional(v.object({
        senderName: v.string(),
        body: v.string(),
      })),
      reactions: v.optional(v.any()),
      replyToId: v.optional(v.id("messages")),
    })
      .index("by_conversationId", ["conversationId", "createdAt"]),

    contacts: defineTable({
      userId: v.id("users"),
      contactId: v.id("users"),
      status: v.union(
        v.literal("accepted"),
        v.literal("pending"),
        v.literal("blocked")
      ),
      createdAt: v.number(),
    })
      .index("by_userId", ["userId"])
      .index("by_contactId", ["contactId"])
      .index("by_pair", ["userId", "contactId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
