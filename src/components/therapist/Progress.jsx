import React from "react";
import { PageHeader, ProgressBar, ScopeToggle } from "../ui/Atoms.jsx";
import { initials, adherenceTone } from "../../lib/helpers.js";

export default function ProgressView({ patients, setView, onOpenPatient, scope, setScope }) {
  return (
    <div>
      <PageHeader title="Progress" subtitle="Adherence across all active patients" action={<ScopeToggle scope={scope} setScope={setScope} />} />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {[...patients].sort((a, b) => b.adherence - a.adherence).map((p) => (
          <button key={p.id} onClick={() => onOpenPatient(p.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(p.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-400">{p.condition}</p>
            </div>
            <div className="w-40 hidden sm:block">
              <ProgressBar value={p.adherence} />
            </div>
            <span className={`text-sm font-semibold w-12 text-right ${adherenceTone(p.adherence)}`}>{p.adherence}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
