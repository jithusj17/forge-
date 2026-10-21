"use client";

import { useSyncExternalStore } from "react";
import type { Chat, Message, ModelId } from "./types";

// Phase 1 persistence: chats live in localStorage. Phase 2 replaces this with an API + database.
const STORAGE_KEY = "forge:chats:v1";

type ChatMap = Record<string, Chat>;

let chats: ChatMap = {};
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: ChatMap = {};

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) chats = JSON.parse(raw) as ChatMap;
  } catch {
    chats = {};
  }
  // A reload mid-generation leaves "streaming" messages behind; settle them.
  for (const chat of Object.values(chats)) {
    for (const m of chat.messages) if (m.status === "streaming") m.status = "done";
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  load();
  return chats;
}

export function useChats() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useChat(id: string): Chat | undefined {
  return useChats()[id];
}

export function getChat(id: string) {
  load();
  return chats[id];
}

export function newId(length = 11) {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function titleFromPrompt(prompt: string) {
  const words = prompt
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5);
  const title = words.join(" ").toLowerCase();
  return title ? title[0].toUpperCase() + title.slice(1) : "Untitled";
}

export function createChat(prompt: string, model: ModelId): Chat {
  load();
  const chat: Chat = {
    id: newId(),
    title: titleFromPrompt(prompt),
    model,
    createdAt: Date.now(),
    messages: [],
    versions: [],
  };
  chats = { ...chats, [chat.id]: chat };
  emit();
  return chat;
}

export function updateChat(id: string, update: (chat: Chat) => Chat) {
  load();
  const current = chats[id];
  if (!current) return;
  chats = { ...chats, [id]: update(current) };
  emit();
}

export function deleteChat(id: string) {
  load();
  if (!chats[id]) return;
  const next = { ...chats };
  delete next[id];
  chats = next;
  emit();
}

export function appendMessage(chatId: string, message: Message) {
  updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, message] }));
}

export function updateMessage(chatId: string, messageId: string, update: (m: Message) => Message) {
  updateChat(chatId, (chat) => ({
    ...chat,
    messages: chat.messages.map((m) => (m.id === messageId ? update(m) : m)),
  }));
}
