const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** URL-safe random id (unambiguous characters). Works in Node and browsers. */
export function newId(length = 11) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
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
