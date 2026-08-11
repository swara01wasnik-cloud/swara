"use client";

import { useEffect, useRef } from "react";
import type { Contact, Message } from "../data/contacts";
import MessageBubble from "./message-bubble";
import ChatInput, { type ChatInputPayload } from "./chat-input";

type ChatAreaProps = {
  contact: Contact;
  messages: Message[];
  typing: boolean;
  loading?: boolean;
  onSend: (payload: ChatInputPayload) => void;
  onBack: () => void;
};

function BackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.07] px-4 py-3 ring-1 ring-white/10">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
      </div>
    </div>
  );
}

export default function ChatArea({ contact, messages, typing, loading, onSend, onBack }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing, contact.id]);

  return (
    <section className="chat-bg flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 bg-[#0d1219] px-3 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          title="Back to contacts"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 md:hidden"
        >
          <BackIcon />
        </button>
        <div className="relative shrink-0">
          <div
            className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${contact.gradient} text-xs font-semibold text-white shadow-lg shadow-black/20`}
          >
            {contact.initials}
          </div>
          {contact.online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1219] bg-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-zinc-100">{contact.name}</h2>
          <p className={`truncate text-xs ${typing ? "font-medium text-indigo-300" : "text-zinc-500"}`}>
            {typing ? "typing…" : contact.lastSeen}
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button type="button" title="Call" className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 active:scale-95">
            <PhoneIcon />
          </button>
          <button type="button" title="Video call" className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 active:scale-95">
            <VideoIcon />
          </button>
        </div>
      </header>

      <div className="slim-scroll flex-1 space-y-2 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400 ring-1 ring-white/10">
            Today
          </span>
        </div>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {typing && <TypingBubble />}
        {loading && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs text-zinc-400 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              Loading messages…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={onSend} />
    </section>
  );
}
