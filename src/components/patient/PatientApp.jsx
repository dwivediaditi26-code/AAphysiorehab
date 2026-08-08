import React, { useState } from "react";
import { Dumbbell, Check, Home, ClipboardList, TrendingUp, User, Send, LogOut } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Pill, CircularStat } from "../ui/Atoms.jsx";
import { initials } from "../../lib/helpers.js";
import { PatientExerciseDetail, PatientExerciseSession, PatientSessionComplete, TRACKED_EXERCISE_COMPONENTS } from "./ExerciseFlow.jsx";
import TrackedExerciseSession from "./TrackedExerciseSession.jsx";

function PatientHome({ patient, day, todaysExercises, exercisesById, completedToday, onOpenExercise }) {
  const doneCount = todaysExercises.filter((pe) => completedToday[pe.exerciseId]).length;
  return (
    <div className="p-5">
      <p className="text-sm text-gray-400">Good Morning,</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">{patient.name.split(" ")[0]} 👋</h1>
      <p className="text-xs text-gray-400 mb-5">Week {patient.week} • Day {patient.day}</p>
      <p className="text-sm font-semibold text-gray-900 mb-3">Today's Exercises</p>

      {!day || day.isRest ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm font-medium text-gray-700">Rest day</p>
          <p className="text-xs text-gray-400 mt-1">No exercises scheduled today. Recover well.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaysExercises.map((pe) => {
            const ex = exercisesById[pe.exerciseId];
            const done = completedToday[pe.exerciseId];
            return (
              <button key={pe.exerciseId} onClick={() => onOpenExercise(pe.exerciseId)} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-400 shrink-0">
                  <Dumbbell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ex.name}</p>
                  <p className="text-xs text-gray-400">{pe.sets} × {pe.reps}</p>
                </div>
                {done ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check size={16} /></div>
                ) : (
                  <span className="text-xs font-semibold text-violet-600 px-3 py-1.5 rounded-lg bg-violet-50 shrink-0">Start</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {todaysExercises.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-5">{doneCount} / {todaysExercises.length} completed {doneCount === todaysExercises.length ? "✓" : ""}</p>
      )}
    </div>
  );
}

function PatientPlanTab({ weeks, patient, exercisesById }) {
  const [activeWeek, setActiveWeek] = useState(patient.week);
  const week = weeks.find((w) => w.week === activeWeek) || weeks[0];
  return (
    <div className="p-5">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Your Plan</h1>
      <p className="text-xs text-gray-400 mb-4">{patient.planName}</p>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {weeks.map((w) => (
          <button key={w.week} onClick={() => setActiveWeek(w.week)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeWeek === w.week ? "bg-violet-600 text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
            Week {w.week}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {week.days.map((d) => {
          const isToday = week.week === patient.week && d.day === patient.day;
          return (
            <div key={d.day} className={`bg-white rounded-2xl border p-4 shadow-sm ${isToday ? "border-violet-300" : "border-gray-100"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">Day {d.day}</p>
                {isToday && <Pill tone="violet">Today</Pill>}
              </div>
              {d.isRest ? (
                <p className="text-xs text-gray-400">Rest day</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {d.exercises.map((pe, i) => (
                    <span key={i} className="text-[11px] bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{exercisesById[pe.exerciseId].name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientProgressTab({ patient, weeks, sessionLog, exercisesById }) {
  const weeklyData = weeks.slice(0, patient.week).map((w) => {
    const total = w.days.filter((d) => !d.isRest).length;
    const completed = w.week < patient.week ? total : Math.max(0, total - 1);
    return { week: `W${w.week}`, Completed: completed, Missed: total - completed };
  });
  return (
    <div className="p-5">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 mb-4">
        <CircularStat value={patient.adherence} size={72} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Adherence</p>
          <p className="text-xs text-gray-400">{patient.sessionsCompleted} of {patient.sessionsTotal} sessions done</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">Weekly Sessions</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="Completed" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Missed" stackId="a" fill="#E5E1F5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {sessionLog.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <p className="text-sm font-semibold text-gray-900 px-5 pt-4 pb-2">Today's Sessions</p>
          {sessionLog.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">{exercisesById[s.exerciseId].name}</span>
              <span className="text-xs text-gray-400">{s.sets} sets · {Math.floor(s.duration / 60)}:{s.duration % 60 < 10 ? "0" : ""}{s.duration % 60}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientProfileTab({ patient, therapistName, thread, onSend, onLogout }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="p-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center mb-4">
        <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-semibold mx-auto mb-3">
          {initials(patient.name)}
        </div>
        <p className="font-semibold text-gray-900">{patient.name}</p>
        <p className="text-xs text-gray-400">{patient.condition}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 mb-4">
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Plan</span>
          <span className="text-sm text-gray-900 text-right">{patient.planName}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Therapist</span>
          <span className="text-sm text-gray-900">{therapistName}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Phone</span>
          <span className="text-sm text-gray-900">{patient.phone}</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Message {therapistName}</p>
        <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
          {thread.length === 0 && <p className="text-xs text-gray-300">No messages yet</p>}
          {thread.slice(-3).map((m, i) => (
            <div key={i} className={`flex ${m.from === "patient" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${m.from === "patient" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button
            onClick={() => { if (draft.trim()) { onSend(draft.trim()); setDraft(""); } }}
            className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-rose-600 bg-white border border-gray-100 rounded-2xl py-3">
        <LogOut size={15} /> Log Out
      </button>
    </div>
  );
}

const PATIENT_TABS = [
  { key: "home", label: "Home", icon: Home },
  { key: "plan", label: "Plan", icon: ClipboardList },
  { key: "progress", label: "Progress", icon: TrendingUp },
  { key: "profile", label: "Profile", icon: User },
];

export default function PatientApp({ patient, weeks, exercisesById, therapistName, thread, onSendMessage, onLogout }) {
  const [tab, setTab] = useState("home");
  const [flow, setFlow] = useState(null);
  const [completedToday, setCompletedToday] = useState({});
  const [sessionLog, setSessionLog] = useState([]);

  const week = weeks.find((w) => w.week === patient.week);
  const day = week && week.days.find((d) => d.day === patient.day);
  const todaysExercises = day && !day.isRest ? day.exercises : [];

  function finishSession(exerciseId, result) {
    setCompletedToday((prev) => ({ ...prev, [exerciseId]: true }));
    setSessionLog((prev) => [{ exerciseId, ...result }, ...prev]);
    setFlow({ stage: "complete", exerciseId, result });
  }

  let flowScreen = null;
  if (flow) {
    const ex = exercisesById[flow.exerciseId];
    const prescribed = todaysExercises.find((pe) => pe.exerciseId === flow.exerciseId);
    if (flow.stage === "detail") flowScreen = <PatientExerciseDetail ex={ex} prescribed={prescribed} onBack={() => setFlow(null)} onStart={() => setFlow({ stage: "session", exerciseId: flow.exerciseId })} />;
    if (flow.stage === "session") {
      const trackerFactory = TRACKED_EXERCISE_COMPONENTS[ex.id];
      flowScreen = trackerFactory
        ? <TrackedExerciseSession ex={ex} prescribed={prescribed} trackerFactory={trackerFactory} onClose={() => setFlow(null)} onFinish={(result) => finishSession(flow.exerciseId, result)} />
        : <PatientExerciseSession ex={ex} prescribed={prescribed} onClose={() => setFlow(null)} onFinish={(result) => finishSession(flow.exerciseId, result)} />;
    }
    if (flow.stage === "complete") flowScreen = <PatientSessionComplete ex={ex} result={flow.result} onContinue={() => setFlow(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen flex flex-col shadow-xl">
        {flowScreen || (
          <>
            <div className="flex-1 overflow-y-auto">
              {tab === "home" && <PatientHome patient={patient} day={day} todaysExercises={todaysExercises} exercisesById={exercisesById} completedToday={completedToday} onOpenExercise={(id) => setFlow({ stage: "detail", exerciseId: id })} />}
              {tab === "plan" && <PatientPlanTab weeks={weeks} patient={patient} exercisesById={exercisesById} />}
              {tab === "progress" && <PatientProgressTab patient={patient} weeks={weeks} sessionLog={sessionLog} exercisesById={exercisesById} />}
              {tab === "profile" && <PatientProfileTab patient={patient} therapistName={therapistName} thread={thread} onSend={onSendMessage} onLogout={onLogout} />}
            </div>
            <div className="shrink-0 bg-white border-t border-gray-100 flex items-center justify-around py-2">
              {PATIENT_TABS.map((t) => {
                const Icon = t.icon, active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl ${active ? "text-violet-600" : "text-gray-400"}`}>
                    <Icon size={20} />
                    <span className="text-[10px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
