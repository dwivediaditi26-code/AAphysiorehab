import React, { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { PageHeader } from "../ui/Atoms.jsx";

export default function MessagesView({ patients, messages, onSend }) {
  const [activeId, setActiveId] = useState(patients[0] ? patients[0].id : null);
  const [draft, setDraft] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = patients.find((p) => p.id === activeId);
  const thread = messages[activeId] || [];

  function openThread(id) {
    setActiveId(id);
    setMobileOpen(true);
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="Threads with your patients" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row h-[520px] overflow-hidden">
        <div className={`w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto shrink-0 ${mobileOpen ? "hidden md:block" : "block"}`}>
          {patients.map((p) => {
            const t = messages[p.id] || [];
            const last = t[t.length - 1];
            return (
              <button key={p.id} onClick={() => openThread(p.id)} className={`w-full text-left px-4 py-3 border-b border-gray-50 ${activeId === p.id ? "bg-violet-50" : "hover:bg-gray-50"}`}>
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{last ? last.text : "No messages yet"}</p>
              </button>
            );
          })}
        </div>
        <div className={`flex-1 flex-col min-w-0 ${mobileOpen ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <button onClick={() => setMobileOpen(false)} className="md:hidden text-gray-400 -ml-1">
                  <ArrowLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-gray-900">{active.name}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 && <p className="text-xs text-gray-300 text-center mt-8">No messages yet</p>}
                {thread.map((m, i) => (
                  <div key={i} className={`flex ${m.from === "therapist" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-3.5 py-2 rounded-2xl text-sm ${m.from === "therapist" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                      {m.text}
                      <p className={`text-[10px] mt-1 ${m.from === "therapist" ? "text-violet-200" : "text-gray-400"}`}>{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onSend(activeId, draft.trim()); setDraft(""); } }}
                  placeholder="Write a message..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  onClick={() => { if (draft.trim()) { onSend(activeId, draft.trim()); setDraft(""); } }}
                  className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 m-auto">Select a patient to view messages</p>
          )}
        </div>
      </div>
    </div>
  );
}
