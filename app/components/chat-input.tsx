"use client";

import { useRef, useState } from "react";

export type ChatInputPayload =
  | { kind: "text"; text: string }
  | { kind: "image"; file: File }
  | { kind: "audio"; file: File; durationSeconds: number };

type ChatInputProps = {
  onSend: (payload: ChatInputPayload) => void;
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

function MicIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const canSend = text.trim().length > 0;

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend({ kind: "text", text: value });
    setText("");
  };

  const pickImage = () => {
    fileInputRef.current?.click();
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be attached.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Images must be under 10MB.");
      return;
    }
    setError(null);
    onSend({ kind: "image", file });
  };

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        const durationSeconds = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (durationSeconds >= 1) {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          onSend({ kind: "audio", file, durationSeconds });
        }
        setRecording(false);
        setRecordSeconds(0);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((Date.now() - startedAtRef.current) / 1000);
      }, 200);
    } catch {
      setError("Microphone access was denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col border-t border-white/5 bg-[#0d1219]"
    >
      {error && (
        <p className="px-4 pt-2 text-xs text-red-300">{error}</p>
      )}
      <div className="flex items-end gap-2 px-4 py-3 sm:gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
        <button
          type="button"
          title="Attach image"
          onClick={pickImage}
          disabled={recording}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 active:scale-95 disabled:opacity-40"
        >
          <PlusIcon />
        </button>

        {recording ? (
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-red-500/10 px-4 text-sm text-red-300 ring-1 ring-red-500/20">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Recording… {formatDuration(recordSeconds)}
          </div>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            aria-label="Type a message"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-4 text-[15px] text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
          />
        )}

        {!canSend && !recording && (
          <button
            type="button"
            title="Record voice message"
            onClick={startRecording}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-zinc-300 shadow-lg transition hover:bg-white/15 active:scale-95"
          >
            <MicIcon />
          </button>
        )}
        {recording && (
          <button
            type="button"
            title="Stop and send"
            onClick={stopRecording}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30 transition hover:brightness-110 active:scale-95"
          >
            <StopIcon />
          </button>
        )}
        {canSend && !recording && (
          <button
            type="submit"
            title="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            <SendIcon />
          </button>
        )}
      </div>
    </form>
  );
}
