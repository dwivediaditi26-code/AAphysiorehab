import React, { useState } from "react";
import { Search, Filter, Dumbbell, Video, Plus, Upload, Play, X as XIcon, Eye, Pencil } from "lucide-react";
import { Pill, PageHeader, Button } from "../ui/Atoms.jsx";
import { Modal, Field, inputClass } from "../ui/Modal.jsx";
import { REGIONS } from "../../data/seed.js";
import { TRACKED_EXERCISE_COMPONENTS, HOLD_TRACKED_EXERCISES } from "../../lib/trackedExercises.js";
import ExercisePreview from "./ExercisePreview.jsx";

export function ExerciseLibraryView({ exercises, onAddExercise, onEditExercise, onUpdateVideo }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [videoTargetId, setVideoTargetId] = useState(null);
  const [previewTargetId, setPreviewTargetId] = useState(null);
  const [editTargetId, setEditTargetId] = useState(null);
  const filtered = exercises.filter(
    (e) => (region === "All" || e.region === region) && e.name.toLowerCase().includes(query.toLowerCase())
  );
  const videoTarget = exercises.find((e) => e.id === videoTargetId);
  const previewTarget = exercises.find((e) => e.id === previewTargetId);
  const editTarget = exercises.find((e) => e.id === editTargetId);

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
            {ex.videoUrl ? (
              <video src={ex.videoUrl} className="w-full h-24 rounded-xl bg-black object-cover mb-3" muted />
            ) : (
              <div className="w-full h-24 rounded-xl bg-violet-50 flex items-center justify-center text-violet-300 mb-3">
                <Dumbbell size={26} />
              </div>
            )}
            <p className="text-sm font-semibold text-gray-900">{ex.name}</p>
            <p className="text-xs text-gray-400 mb-2">{ex.region} · {ex.difficulty}</p>
            <p className="text-xs text-gray-500 mb-1">{ex.sets} sets × {ex.reps} · rest {ex.rest}</p>
            {ex.frequency && <p className="text-xs text-gray-400 mb-3">{ex.frequency}</p>}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setPreviewTargetId(ex.id)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2"
              >
                <Eye size={13} /> Preview as patient
              </button>
              <button
                onClick={() => setEditTargetId(ex.id)}
                className="w-9 flex items-center justify-center text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl py-2 shrink-0"
                title="Edit exercise"
              >
                <Pencil size={13} />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {TRACKED_EXERCISE_COMPONENTS[ex.id] ? (
                <Pill tone="violet"><span className="inline-flex items-center gap-1"><Video size={11} /> Live Tracking</span></Pill>
              ) : HOLD_TRACKED_EXERCISES[ex.id] ? (
                <Pill tone="violet"><span className="inline-flex items-center gap-1"><Video size={11} /> Live Hold Tracking</span></Pill>
              ) : ex.tracking ? (
                <Pill tone="amber">Trackable — no engine yet</Pill>
              ) : (
                <Pill tone="gray">Video only</Pill>
              )}
              {ex.videoUrl ? (
                <Pill tone="emerald">Video added</Pill>
              ) : (
                <button
                  onClick={() => setVideoTargetId(ex.id)}
                  className="text-xs font-medium text-violet-600 px-2 py-1 rounded-full bg-violet-50 hover:bg-violet-100 inline-flex items-center gap-1"
                >
                  <Upload size={11} /> Add video
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-10">No exercises match your filters</p>}
      </div>

      {previewTarget && (
        <ExercisePreview ex={previewTarget} onClose={() => setPreviewTargetId(null)} />
      )}

      {editTarget && (
        <AddExerciseModal
          existing={editTarget}
          onClose={() => setEditTargetId(null)}
          onAdd={(fields) => { onEditExercise(editTarget.id, fields); setEditTargetId(null); }}
        />
      )}

      {videoTarget && (
        <AddVideoModal
          ex={videoTarget}
          onClose={() => setVideoTargetId(null)}
          onSave={(url) => { onUpdateVideo(videoTarget.id, url); setVideoTargetId(null); }}
        />
      )}
    </div>
  );
}

function VideoUploadField({ file, onChange }) {
  return (
    <Field label="Demonstration video (optional)">
      {file ? (
        <div className="relative">
          <video src={URL.createObjectURL(file)} controls className="w-full h-36 rounded-xl bg-black object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <XIcon size={14} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-violet-300 hover:bg-violet-50">
          <Upload size={18} className="text-gray-400" />
          <span className="text-xs text-gray-500">Tap to upload a video</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files && e.target.files[0])}
          />
        </label>
      )}
      <p className="text-[11px] text-gray-400 mt-1.5">
        Preview only for now — persists until you reload this page. Real storage needs Supabase Storage wired up.
      </p>
    </Field>
  );
}

function AddVideoModal({ ex, onClose, onSave }) {
  const [file, setFile] = useState(null);
  return (
    <Modal title={`Add video · ${ex.name}`} onClose={onClose}>
      <VideoUploadField file={file} onChange={setFile} />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (file) onSave(URL.createObjectURL(file)); }}>Save</Button>
      </div>
    </Modal>
  );
}

export function AddExerciseModal({ existing = null, onClose, onAdd }) {
  const [form, setForm] = useState(
    existing
      ? { name: existing.name, region: existing.region, difficulty: existing.difficulty, sets: existing.sets, reps: existing.reps, rest: existing.rest, frequency: existing.frequency || "Daily", tracking: existing.tracking, videoFile: null }
      : { name: "", region: "Core", difficulty: "Beginner", sets: 3, reps: "10", rest: "30 sec", frequency: "Daily", tracking: false, videoFile: null }
  );
  return (
    <Modal title={existing ? `Edit · ${existing.name}` : "Add Exercise"} onClose={onClose}>
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
        <Field label="Reps / Hold">
          <input className={inputClass} value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} placeholder="10 or 20 sec hold" />
        </Field>
        <Field label="Rest">
          <input className={inputClass} value={form.rest} onChange={(e) => setForm({ ...form, rest: e.target.value })} />
        </Field>
      </div>
      <Field label="Frequency">
        <select className={inputClass} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
          <option>Daily</option><option>2x/day</option><option>3x/week</option><option>5x/week</option><option>Alternate days</option>
        </select>
      </Field>
      {!existing && <VideoUploadField file={form.videoFile} onChange={(f) => setForm({ ...form, videoFile: f })} />}
      <label className="flex items-start gap-2 mt-3 mb-2">
        <input type="checkbox" checked={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.checked })} className="mt-0.5" />
        <span className="text-sm text-gray-600">
          Suitable for live camera tracking
          <span className="block text-xs text-gray-400">Flags it for a future tracker — doesn't build one. A tracker has to be written per exercise (see README).</span>
        </span>
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (form.name) onAdd(form); }}>{existing ? "Save Changes" : "Add Exercise"}</Button>
      </div>
    </Modal>
  );
}
