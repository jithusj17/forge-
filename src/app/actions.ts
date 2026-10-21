"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth";
import * as chats from "@/lib/chats";

// Every action re-reads the session itself; nothing trusts the client.
async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  return session.user;
}

const ModelSchema = z.enum(["forge-mini", "forge-pro", "forge-max", "forge-max-fast"]);

export async function createChatAction(prompt: string, model: string) {
  const user = await requireUser();
  const text = z.string().trim().min(1).max(4000).parse(prompt);
  return chats.createChat(user.id, text, ModelSchema.parse(model));
}

export async function renameChatAction(id: string, title: string) {
  const user = await requireUser();
  return chats.updateChat(id, user.id, { title: z.string().trim().min(1).max(80).parse(title) });
}

export async function setVisibilityAction(id: string, visibility: string) {
  const user = await requireUser();
  return chats.updateChat(id, user.id, { visibility: z.enum(["private", "unlisted", "public"]).parse(visibility) });
}

export async function deleteChatAction(id: string) {
  const user = await requireUser();
  return chats.deleteChat(id, user.id);
}

export async function duplicateChatAction(id: string) {
  const user = await requireUser();
  return chats.duplicateChat(id, user.id);
}

export async function restoreVersionAction(id: string, n: number) {
  const user = await requireUser();
  return chats.restoreVersion(id, user.id, z.number().int().positive().parse(n));
}

export async function listChatsAction() {
  const session = await getSession();
  if (!session) return [];
  return chats.listChats(session.user.id);
}
