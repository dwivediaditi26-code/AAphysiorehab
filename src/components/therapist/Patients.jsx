import React, { useState, useMemo } from "react";
import { Search, ArrowLeft, TrendingUp, ClipboardList, CheckCircle2, Clock, Plus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { StatCard, Pill, ProgressBar, PageHeader, Button, ScopeToggle } from "../ui/Atoms.jsx";
import { Modal, Field, inputClass } from "../ui/Modal.jsx";
import PlanBuilder from "./PlanBuilder.jsx";
import { initials, adherenceTone, generateSessions } from "../../lib/helpers.js";
import { CONDITION_EXERCISE_MAP } from "../../data/seed.js";

export function PatientsView({ patients, onOpenPatient, onAddPatient, scope, setScope }) {
  const [query, setQuery] = useState("");
  const filtered = patients.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patients on record`}
        action={
          <div className="flex items-center gap-3">
            <ScopeToggle scope={scope} setScope={setScope} />
            <Button icon={Plus} onClick={onAddPatient}>New Patient</Button>
          </div>
        }
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => onOpenPatient(p.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400">{p.condition} · {p.gender}, {p.age} yrs</p>
              </div>
              <div className="hidden sm:block text-xs text-gray-500 w-28">Week {p.week} • Day {p.day}</div>
              <Pill tone="emerald">{p.status}</Pill>
              <span className={`text-sm font-semibold w-12 text-right ${adherenceTone(p.adherence)}`}>{p.adherence}%</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No patients match "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PatientProfileView({ patient, exercises, exercisesById, weeks, onChangePlan, onBack }) {
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState([
    { id: 1, text: "Patient reports reduced pain since week 2. Continue current progression.", time: "3 days ago" },
  ]);
  const [draft, setDraft] = useState("");
  const sessions = useMemo(() => generateSessions(patient), [patient.id]);
  const weeklyData = weeks.slice(0, patient.week).map((w) => {
    const total = w.days.filter((d) => !d.isRest).length;
    const completed = w.week < patient.week ? total : Math.max(0, total - 1);
    return { week: `W${w.week}`, Completed: completed, Missed: total - completed };
  });

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "plan", label: "Rehab Plan" },
    { key: "progress", label: "Progress" },
    { key: "sessions", label: "Sessions" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-semibold">
          {initials(patient.name)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">{patient.name}</h1>
            <Pill tone="emerald">{patient.status}</Pill>
          </div>
          <p className="text-sm text-gray-400">{patient.gender}, {patient.age} yrs · {patient.condition} · {patient.phone} · {patient.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-1">Current Plan</p>
            <p className="font-semibold text-gray-900 mb-3">{patient.planName}</p>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Start date: {patient.startDate}</span>
              <span>Week {patient.week} • Day {patient.day}</span>
            </div>
            <ProgressBar value={Math.round((patient.week / 8) * 100)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={TrendingUp} label="Adherence" value={`${patient.adherence}%`} sublabel="Overall" />
            <StatCard icon={CheckCircle2} label="Sessions Completed" value={`${patient.sessionsCompleted} / ${patient.sessionsTotal}`} sublabel="To date" />
            <StatCard icon={ClipboardList} label="Avg. Form Score" value={`${patient.avgForm}%`} sublabel="Across sessions" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Weekly Progress</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F0F7" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="Completed" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Missed" stackId="a" fill="#E5E1F5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "plan" && (
        <PlanBuilder weeks={weeks} exercises={exercises} exercisesById={exercisesById} onChange={onChangePlan} patientCondition={patient.condition} />
      )}

      {tab === "progress" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Adherence Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData.map((w, i) => ({ week: w.week, value: Math.min(100, patient.adherence - 6 + i * 3) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F0F7" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Clock size={15} className="text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-400">Exercises {s.exercisesCompleted} · {s.duration}</p>
                </div>
              </div>
              <Pill tone={s.formScore >= 80 ? "emerald" : "amber"}>Form {s.formScore}%</Pill>
            </div>
          ))}
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a clinical note..."
              rows={3}
              className="w-full text-sm border border-gray-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={() => {
                  if (!draft.trim()) return;
                  setNotes([{ id: Date.now(), text: draft.trim(), time: "Just now" }, ...notes]);
                  setDraft("");
                }}
              >
                Add Note
              </Button>
            </div>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm text-gray-800">{n.text}</p>
              <p className="text-xs text-gray-400 mt-1">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddPatientModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "Female", phone: "", email: "", condition: "Low Back Pain" });
  return (
    <Modal title="New Patient" onClose={onClose}>
      <Field label="Full name">
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age">
          <input type="number" className={inputClass} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        </Field>
        <Field label="Gender">
          <select className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option>Female</option><option>Male</option><option>Other</option>
          </select>
        </Field>
      </div>
      <Field label="Phone">
        <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="Email">
        <input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Condition">
        <select className={inputClass} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
          {Object.keys(CONDITION_EXERCISE_MAP).map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (form.name) onAdd(form); }}>Create Patient</Button>
      </div>
    </Modal>
  );
}
