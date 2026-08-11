"use client";

import { useEffect, useRef, useState } from "react";
import { gradientFor, initialsFor } from "../data/contacts";

type SearchUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  online: boolean;
  last_seen: string | null;
};

type NewChatModalProps = {
  onClose: () => void;
  onAdded: (contactId: string) => void;
};

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function NewChatModal({ onClose, onAdded }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search box on open, close on Escape.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setUsers([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const { users: results } = await res.json();
        setUsers(results as SearchUser[]);
      } catch {
        setError("Couldn't search. Try again.");
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const addContact = async (id: string) => {
    setError(null);
    setAddingId(id);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to add contact");
      setAddedIds((prev) => new Set(prev).add(id));
      onAdded(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Start a new chat"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#11161d] shadow-2xl shadow-black/60">
        <header className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">New chat</h2>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 active:scale-95"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="px-5 pb-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username…"
              autoComplete="off"
              className="h-11 w-full rounded-xl bg-white/[0.06] pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
            />
          </div>
        </div>

        {error && (
          <p className="mx-5 mb-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-300 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <div className="slim-scroll max-h-80 overflow-y-auto border-t border-white/5 px-2 py-2">
          {searching && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">Searching…</p>
          )}
          {!searching && searched && users.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No users found for “{query.trim()}”. They need an account first.
            </p>
          )}
          {!searching && !searched && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Type a username to find people to chat with.
            </p>
          )}
          {!searching &&
            users.map((u) => {
              const name = u.full_name || u.username || "Unknown";
              const added = addedIds.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="relative shrink-0">
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${gradientFor(
                        name
                      )} text-sm font-semibold text-white shadow-lg shadow-black/20`}
                    >
                      {initialsFor(name)}
                    </div>
                    {u.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#11161d] bg-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
                    <p className="truncate text-xs text-zinc-500">@{u.username ?? "—"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={added || addingId === u.id}
                    onClick={() => addContact(u.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      added
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-500/25 disabled:opacity-60"
                    }`}
                  >
                    {added ? "Added ✓" : addingId === u.id ? "Adding…" : "Add"}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
