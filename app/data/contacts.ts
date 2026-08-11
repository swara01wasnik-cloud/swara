export type MessageStatus = "sent" | "delivered" | "read";
export type MessageKind = "text" | "image" | "audio";

export type Message = {
  id: string;
  sender: "me" | "them";
  kind: MessageKind;
  text: string;
  time: string;
  status?: MessageStatus;
  /** Signed URL for image/audio attachments (short-lived, re-fetched with the message list). */
  mediaUrl?: string;
  mediaMime?: string;
  durationSeconds?: number;
};

export type Contact = {
  id: string;
  name: string;
  initials: string;
  gradient: string;
  online: boolean;
  lastSeen: string;
  lastActive: string;
  unread: number;
  messages: Message[];
  /** Backend mode: the 1:1 conversation id with this contact (undefined until one exists) */
  conversationId?: string;
  /** Backend mode: last-message preview shown in the sidebar */
  preview?: string;
};

const GRADIENTS = [
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-lime-400 to-green-600",
];

/** Deterministic avatar gradient for any name (used for backend contacts). */
export function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

/** Two-letter initials from a name. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
