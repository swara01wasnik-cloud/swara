"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/sidebar";
import ChatArea from "./components/chat-area";
import EmptyState from "./components/empty-state";
import NewChatModal from "./components/new-chat-modal";
import { gradientFor, initialsFor, type Contact, type Message } from "./data/contacts";
import { createClient } from "@/lib/supabase/client";

type BackendContactRow = {
  contact_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  online: boolean;
  last_seen: string | null;
  conversation_id: string | null;
  last_message: string | null;
  last_message_sender: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type BackendMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

function formatSidebarTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastSeen(iso: string | null, online: boolean): string {
  if (online) return "online";
  if (!iso) return "offline";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `last seen ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `last seen ${d.toLocaleDateString()}`;
}

function toMessage(row: BackendMessageRow, meId: string): Message {
  const d = new Date(row.created_at);
  return {
    id: row.id,
    sender: row.sender_id === meId ? "me" : "them",
    text: row.content,
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: row.read_at ? "read" : "sent",
  };
}

function toContact(row: BackendContactRow, meId: string): Contact {
  const name = row.full_name || row.username || "Unknown";
  return {
    id: row.contact_id,
    name,
    initials: initialsFor(name),
    gradient: gradientFor(name),
    online: row.online,
    lastSeen: formatLastSeen(row.last_seen, row.online),
    lastActive: formatSidebarTime(row.last_message_at),
    unread: row.unread_count,
    messages: [],
    conversationId: row.conversation_id ?? undefined,
    preview: row.last_message
      ? `${row.last_message_sender === meId ? "You: " : ""}${row.last_message}`
      : undefined,
  };
}

export default function Home() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [messagesByContact, setMessagesByContact] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const meIdRef = useRef<string | null>(null);
  const contactsRef = useRef(contacts);
  const activeIdRef = useRef(activeId);
  const loadedConvsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const activeContact = contacts.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeContact ? messagesByContact[activeContact.id] ?? [] : [];

  const refreshContacts = useCallback(async () => {
    const res = await fetch("/api/contacts", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load contacts");
    const { contacts: rows } = await res.json();
    const mapped = (rows as BackendContactRow[]).map((r) =>
      toContact(r, meIdRef.current ?? "")
    );
    contactsRef.current = mapped; // keep the ref in sync so selectContact can find the new one
    setContacts(mapped);
  }, []);

  // ---------- Load the signed-in user, their contacts, and subscribe to realtime ----------
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        meIdRef.current = user.id;
        setCurrentUser(user.email ?? user.id);
        await refreshContacts();
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load contacts");
        }
      }
    })();

    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as BackendMessageRow;
          const contact = contactsRef.current.find(
            (c) => c.conversationId === row.conversation_id
          );
          if (!contact) {
            // Message from a conversation this client hasn't mapped yet (e.g. a
            // brand-new chat started by the other person) — refresh the sidebar
            // so the conversation, preview, and unread badge appear live.
            void refreshContacts().catch(() => {});
            return;
          }
          const msg = toMessage(row, meIdRef.current ?? "");
          setMessagesByContact((prev) => {
            const existing = prev[contact.id] ?? [];
            if (existing.some((x) => x.id === msg.id)) return prev;
            return { ...prev, [contact.id]: [...existing, msg] };
          });
          setContacts((prev) =>
            prev.map((c) =>
              c.id === contact.id
                ? {
                    ...c,
                    unread:
                      activeIdRef.current === c.id || msg.sender === "me" ? 0 : c.unread + 1,
                    preview: `${msg.sender === "me" ? "You: " : ""}${msg.text}`,
                    lastActive: msg.time,
                  }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as BackendMessageRow;
          // Read receipts: when the other participant reads my message, their
          // read_at update flips my ✓ to ✓✓ in real time.
          if (!row.read_at || row.sender_id !== meIdRef.current) return;
          const contact = contactsRef.current.find(
            (c) => c.conversationId === row.conversation_id
          );
          if (!contact) return;
          setMessagesByContact((prev) => {
            const current = prev[contact.id];
            if (!current) return prev;
            let changed = false;
            const updated = current.map((m) => {
              if (m.sender === "me" && m.status !== "read") {
                changed = true;
                return { ...m, status: "read" as const };
              }
              return m;
            });
            return changed ? { ...prev, [contact.id]: updated } : prev;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [router, refreshContacts]);

  const selectContact = useCallback(async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));

    const contact = contactsRef.current.find((c) => c.id === id);
    if (!contact) return;
    if (loadedConvsRef.current.has(id)) return;

    try {
      let conversationId = contact.conversationId;
      if (!conversationId) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: id }),
        });
        if (!res.ok) throw new Error("Failed to start conversation");
        const { conversation_id } = await res.json();
        conversationId = conversation_id;
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, conversationId } : c)));
      }

      loadedConvsRef.current.add(id);
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages?conversation_id=${conversationId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load messages");
        const { messages } = await res.json();
        const mapped = (messages as BackendMessageRow[]).map((m) =>
          toMessage(m, meIdRef.current ?? "")
        );
        setMessagesByContact((prev) => ({ ...prev, [id]: mapped }));
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
      } finally {
        setLoadingMessages(false);
      }
    } catch (err) {
      loadedConvsRef.current.delete(id);
      setLoadError(err instanceof Error ? err.message : "Failed to open conversation");
    }
  }, []);

  const backToList = useCallback(() => {
    setMobileView("list");
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeId) return;
      const contact = contactsRef.current.find((c) => c.id === activeId);
      if (!contact) return;

      try {
        let conversationId = contact.conversationId;
        if (!conversationId) {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: contact.id }),
          });
          if (!res.ok) throw new Error("Failed to start conversation");
          const { conversation_id } = await res.json();
          conversationId = conversation_id;
          setContacts((prev) =>
            prev.map((c) => (c.id === contact.id ? { ...c, conversationId } : c))
          );
          loadedConvsRef.current.add(contact.id);
        }

        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId, content: text }),
        });
        if (!res.ok) throw new Error("Failed to send message");
        const { message } = await res.json();
        const msg = toMessage(message as BackendMessageRow, meIdRef.current ?? "");
        setMessagesByContact((prev) => {
          const existing = prev[contact.id] ?? [];
          if (existing.some((x) => x.id === msg.id)) return prev;
          return { ...prev, [contact.id]: [...existing, msg] };
        });
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id ? { ...c, lastActive: msg.time, preview: `You: ${msg.text}` } : c
          )
        );
      } catch (err) {
        console.error(err);
      }
    },
    [activeId]
  );

  const handleContactAdded = useCallback(
    async (contactId: string) => {
      try {
        await refreshContacts();
        // Open the new conversation immediately.
        await selectContact(contactId);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to refresh contacts");
      } finally {
        setNewChatOpen(false);
      }
    },
    [refreshContacts, selectContact]
  );

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  const showChatList = mobileView === "list";

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-[#0b0f14] font-sans text-zinc-100">
      {loadError && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-red-500/15 px-4 py-2 text-xs text-red-300 ring-1 ring-red-500/30">
          {loadError}
        </div>
      )}
      <div className={`${showChatList ? "flex" : "hidden"} md:flex h-full w-full shrink-0 md:w-80 lg:w-96`}>
        <Sidebar
          contacts={contacts}
          activeId={activeId}
          onSelect={selectContact}
          currentUser={currentUser}
          onLogout={handleLogout}
          onNewChat={() => setNewChatOpen(true)}
        />
      </div>
      <div className={`${showChatList ? "hidden" : "flex"} md:flex h-full min-w-0 flex-1`}>
        {activeContact ? (
          <ChatArea
            contact={activeContact}
            messages={activeMessages}
            typing={false}
            loading={loadingMessages}
            onSend={sendMessage}
            onBack={backToList}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)} onAdded={handleContactAdded} />}
    </div>
  );
}
