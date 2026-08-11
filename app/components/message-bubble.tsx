"use client";

import type { Message } from "../data/contacts";

function CheckIcon({ read }: { read: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${read ? "text-sky-400" : "text-zinc-400"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {read ? (
        <>
          <path d="M18 6 7 17l-5-5" />
          <path d="m22 10-7.5 7.5L13 16" />
        </>
      ) : (
        <path d="M18 6 7 17l-5-5" />
      )}
    </svg>
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  const mine = message.sender === "me";
  const kind = message.kind ?? "text";

  return (
    <div className={`animate-message-in flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[78%] rounded-2xl shadow-md shadow-black/10 sm:max-w-[65%] ${
          kind === "image" ? "p-1.5" : "px-3.5 py-2"
        } ${
          mine
            ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
            : "rounded-bl-md bg-white/[0.07] text-zinc-100 ring-1 ring-white/10"
        }`}
      >
        {kind === "image" && message.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.mediaUrl}
            alt="Sent attachment"
            className="max-h-80 w-full rounded-xl object-cover"
          />
        )}
        {kind === "audio" && message.mediaUrl && (
          <audio
            src={message.mediaUrl}
            controls
            preload="metadata"
            className="h-10 w-56 max-w-full"
          />
        )}
        {kind === "text" && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.text}</p>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 ${kind === "image" ? "px-2 pb-0.5" : ""} ${
            mine ? "text-indigo-100/80" : "text-zinc-500"
          }`}
        >
          <span className="text-[10px]">{message.time}</span>
          {mine && <CheckIcon read={message.status === "read"} />}
        </div>
      </div>
    </div>
  );
}
