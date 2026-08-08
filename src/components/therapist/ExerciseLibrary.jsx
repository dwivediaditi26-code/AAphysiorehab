import React, { useState } from "react";
import { Search, Filter, Dumbbell, Video, Plus } from "lucide-react";
import { Pill, PageHeader, Button } from "../ui/Atoms.jsx";
import { Modal, Field, inputClass } from "../ui/Modal.jsx";
import { REGIONS } from "../../data/seed.js";

export function ExerciseLibraryView({ exercises, onAddExercise }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const filtered = exercises.filter(
    (e) => (region === "All" || e.region === region) && e.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Exercise Library"
        subtitle={`${exercises.length} exercises`}
        action={<Button icon={Plus} onClick={onAddExercise}>Add Exercise</Button>}
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={14} className="text-gray-300 shrink-0" />
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                region === r ? "bg-violet-600 text-white" : "bg-white border border-gray-200 text-gray-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ex) => (
          <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-full h-24 rounded-xl bg-violet-50 flex items-center justify-center text-violet-300 mb-3">
              <Dumbbell size={26} />
            </div>
            <p className="text-sm font-semibold text-gray-900">{ex.name}</p>
            <p className="text-xs text-gray-400 mb-2">{ex.region} · {ex.difficulty}</p>
            <p className="text-xs text-gray-500 mb-3">{ex.sets} sets × {ex.reps} · rest {ex.rest}</p>
            {ex.tracking ? (
              <Pill tone="violet"><span className="inline-flex items-center gap-1"><Video size={11} /> Live Tracking</span></Pill>
            ) : (
              <Pill tone="gray">Video only</Pill>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-10">No exercises match your filters</p>}
      </div>
    </div>
  );
}

export function AddExerciseModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", region: "Core", difficulty: "Beginner", sets: 3, reps: "10", rest: "30 sec", tracking: false });
  return (
    <Modal title="Add Exercise" onClose={onClose}>
      <Field label="Exercise name">
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Region">
          <select className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            {REGIONS.filter((r) => r !== "All").map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className={inputClass} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sets">
          <input type="number" className={inputClass} value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
        </Field>
        <Field label="Reps">
          <input className={inputClass} value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
        </Field>
        <Field label="Rest">
          <input className={inputClass} value={form.rest} onChange={(e) => setForm({ ...form, rest: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 mt-1 mb-2">
        <input type="checkbox" checked={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.checked })} />
        <span className="text-sm text-gray-600">Supports live camera tracking</span>
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (form.name) onAdd(form); }}>Add Exercise</Button>
      </div>
    </Modal>
  );
}
