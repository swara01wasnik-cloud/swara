"use client";

import { useMemo, useState } from "react";
import type { Contact } from "../data/contacts";

type SidebarProps = {
  contacts: Contact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  currentUser?: string | null;
  onLogout?: () => void;
};

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ContactRow({
  contact,
  active,
  onClick,
}: {
  contact: Contact;
  active: boolean;
  onClick: () => void;
}) {
  const last = contact.messages[contact.messages.length - 1];
  const preview =
    contact.preview ??
    (last ? `${last.sender === "me" ? "You: " : ""}${last.text}` : "No messages yet");

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
        active ? "bg-white/10" : "hover:bg-white/[0.05]"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />}
      <div className="relative shrink-0">
        <div
          className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${contact.gradient} text-sm font-semibold text-white shadow-lg shadow-black/20`}
        >
          {contact.initials}
        </div>
        {contact.online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1219] bg-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-zinc-100">{contact.name}</p>
          <span className="shrink-0 text-[11px] text-zinc-500">{contact.lastActive}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-zinc-500">{preview}</p>
          {contact.unread > 0 && (
            <span className="grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
              {contact.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Sidebar({ contacts, activeId, onSelect, currentUser, onLogout }: SidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/5 bg-[#0d1219] md:w-80 lg:w-96">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Messages</h1>
        <button
          type="button"
          title="New chat"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <NewChatIcon />
        </button>
      </header>

      <div className="px-4 pb-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
            className="w-full rounded-full bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.08] focus:ring-2"
          />
        </div>
      </div>

      <nav className="slim-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {filtered.map((c) => (
          <ContactRow key={c.id} contact={c} active={c.id === activeId} onClick={() => onSelect(c.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">
            {currentUser ? "No contacts yet — add some in the database." : "No contacts found"}
          </p>
        )}
      </nav>

      {currentUser && (
        <footer className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
              {currentUser[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-300">{currentUser}</p>
              <p className="truncate text-[10px] text-zinc-500">Signed in</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </footer>
      )}
    </aside>
  );
}
