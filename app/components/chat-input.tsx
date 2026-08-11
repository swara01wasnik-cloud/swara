"use client";

import { useState } from "react";

type ChatInputProps = {
  onSend: (text: string) => void;
};

function SendIcon() {
  return (
    <svg className="h-5 w-5 translate-x-px" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 22 12 3.4 3.6l-.01 6.53L15.4 12 3.39 13.87l.01 6.53Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-white/5 bg-[#0d1219] px-4 py-3 sm:gap-3"
    >
      <button
        type="button"
        title="Attach"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 active:scale-95"
      >
        <PlusIcon />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        aria-label="Type a message"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-4 text-[15px] text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
      />
      <button
        type="submit"
        disabled={!canSend}
        title="Send"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-indigo-500/30 transition-all duration-150 ${
          canSend
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 hover:brightness-110 active:scale-95"
            : "cursor-not-allowed bg-white/10 text-zinc-500 shadow-none"
        }`}
      >
        <SendIcon />
      </button>
    </form>
  );
}
