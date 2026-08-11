"use client";

export default function EmptyState() {
  return (
    <section className="chat-bg hidden h-full min-w-0 flex-1 flex-col items-center justify-center px-8 text-center md:flex">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
        <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-zinc-100">Your messages</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
        Select a contact from the sidebar to start chatting. New messages land right here.
      </p>
    </section>
  );
}
