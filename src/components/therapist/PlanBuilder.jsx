import React, { useState } from "react";
import { Copy, Plus, X, Eye } from "lucide-react";
import { generatePlan } from "../../lib/helpers.js";
import { PROTOCOL_TEMPLATES } from "../../data/seed.js";
import ExercisePreview from "./ExercisePreview.jsx";

export default function PlanBuilder({ weeks, exercisesById, exercises, onChange, patientCondition }) {
  const [activeWeek, setActiveWeek] = useState(1);
  const [previewTarget, setPreviewTarget] = useState(null); // { ex, prescribed }
  const [templateId, setTemplateId] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const week = weeks.find((w) => w.week === activeWeek) || weeks[0];
  const relevantTemplates = patientCondition
    ? PROTOCOL_TEMPLATES.filter((t) => t.condition === patientCondition)
    : PROTOCOL_TEMPLATES;

  function updateDay(dayNum, updater) {
    const next = weeks.map((w) =>
      w.week !== activeWeek ? w : { ...w, days: w.days.map((d) => (d.day !== dayNum ? d : updater(d))) }
    );
    onChange(next);
  }

  function toggleRest(dayNum) {
    updateDay(dayNum, (d) => ({ ...d, isRest: !d.isRest, exercises: d.isRest ? d.exercises : [] }));
  }

  function addExercise(dayNum, exerciseId) {
    if (!exerciseId) return;
    const ex = exercisesById[exerciseId];
    updateDay(dayNum, (d) => ({ ...d, exercises: [...d.exercises, { exerciseId, sets: ex.sets, reps: ex.reps }] }));
  }

  function removeExercise(dayNum, idx) {
    updateDay(dayNum, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));
  }

  function addWeek() {
    const last = weeks[weeks.length - 1];
    const clone = JSON.parse(JSON.stringify(last));
    clone.week = weeks.length + 1;
    onChange([...weeks, clone]);
  }

  function applyTemplate() {
    const tpl = PROTOCOL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    onChange(generatePlan(tpl.exerciseIds, exercisesById, weeks.length || 8));
    setActiveWeek(1);
    setTemplateId("");
  }

  function copyWeek() {
    const target = parseInt(copyTarget, 10);
    if (!target || target === activeWeek) return;
    const source = weeks.find((w) => w.week === activeWeek);
    const cloneDays = JSON.parse(JSON.stringify(source.days));
    const exists = weeks.some((w) => w.week === target);
    const next = exists
      ? weeks.map((w) => (w.week === target ? { week: target, days: cloneDays } : w))
      : [...weeks, { week: target, days: cloneDays }].sort((a, b) => a.week - b.week);
    onChange(next);
    setCopyTarget("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <option value="">Load template…</option>
            {relevantTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={applyTemplate} disabled={!templateId} className="text-xs font-medium px-3 py-2 rounded-xl bg-violet-50 text-violet-700 disabled:opacity-40">Apply</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Copy Week {activeWeek} to</span>
          <select value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <option value="">Week…</option>
            {Array.from({ length: Math.max(weeks.length + 1, 8) }, (_, i) => i + 1).filter((n) => n !== activeWeek).map((n) => (
              <option key={n} value={n}>Week {n}{weeks.some((w) => w.week === n) ? "" : " (new)"}</option>
            ))}
          </select>
          <button onClick={copyWeek} disabled={!copyTarget} className="text-xs font-medium px-3 py-2 rounded-xl bg-gray-100 text-gray-600 disabled:opacity-40 flex items-center gap-1"><Copy size={12} /> Copy</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
      <div className="md:w-44 shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex md:flex-col gap-1 overflow-x-auto">
          {weeks.map((w) => (
            <button
              key={w.week}
              onClick={() => setActiveWeek(w.week)}
              className={`px-3 py-2 rounded-xl text-sm font-medium text-left whitespace-nowrap ${
                activeWeek === w.week ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Week {w.week}
            </button>
          ))}
          <button onClick={addWeek} className="px-3 py-2 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50 flex items-center gap-1 whitespace-nowrap">
            <Plus size={14} /> Add Week
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {week.days.map((d) => (
          <div key={d.day} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Day {d.day}</p>
              <button
                onClick={() => toggleRest(d.day)}
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  d.isRest ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {d.isRest ? "Rest Day" : "Mark as rest"}
              </button>
            </div>

            {d.isRest ? (
              <p className="text-xs text-gray-400 py-2">Rest / mobility day</p>
            ) : (
              <>
                <div className="space-y-2 mb-3">
                  {d.exercises.map((pe, i) => {
                    const ex = exercisesById[pe.exerciseId];
                    return (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-700 truncate">{ex.name} — {pe.sets} × {pe.reps}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setPreviewTarget({ ex, prescribed: { sets: pe.sets, reps: pe.reps } })}
                            className="text-gray-300 hover:text-violet-600"
                            title="Preview as patient"
                          >
                            <Eye size={13} />
                          </button>
                          <button onClick={() => removeExercise(d.day, i)} className="text-gray-300 hover:text-rose-500">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {d.exercises.length === 0 && <p className="text-xs text-gray-300">No exercises yet</p>}
                </div>
                <select
                  onChange={(e) => { addExercise(d.day, e.target.value); e.target.value = ""; }}
                  defaultValue=""
                  className="w-full text-xs border border-dashed border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 focus:outline-none"
                >
                  <option value="" disabled>+ Add exercise</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        ))}
      </div>
      </div>

      {previewTarget && (
        <ExercisePreview
          ex={previewTarget.ex}
          prescribed={previewTarget.prescribed}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
}
