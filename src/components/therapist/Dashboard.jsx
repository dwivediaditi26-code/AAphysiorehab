import React from "react";
import { Bell, Users, ClipboardList, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { StatCard, CircularStat, PageHeader, Button, ScopeToggle } from "../ui/Atoms.jsx";
import { initials, adherenceTone } from "../../lib/helpers.js";
import { KPI, ACTIVITY_FEED, ADHERENCE_TREND } from "../../data/seed.js";

export default function DashboardView({ patients, onOpenPatient, setView, therapist, scope, setScope, onAddPatient }) {
  const topPerformers = [...patients].sort((a, b) => b.adherence - a.adherence).slice(0, 3);
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Good morning, ${therapist.name}`}
        action={
          <div className="flex items-center gap-3">
            <ScopeToggle scope={scope} setScope={setScope} />
            <button className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400">
              <Bell size={16} />
            </button>
            <Button icon={Plus} onClick={onAddPatient}>New Patient</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Patients" value={KPI.totalPatients} sublabel="Active patients" />
        <StatCard icon={ClipboardList} label="Plans in Progress" value={KPI.plansInProgress} sublabel="Active rehab plans" />
        <StatCard icon={TrendingUp} label="Sessions Completed" value={KPI.sessionsCompleted} sublabel="This week" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Avg. Adherence</p>
            <p className="text-xs text-gray-400 mt-1">This week</p>
          </div>
          <CircularStat value={KPI.avgAdherence} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Patients Overview</h3>
            <button onClick={() => setView("patients")} className="text-xs text-violet-600 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {patients.map((p) => (
              <button key={p.id} onClick={() => onOpenPatient(p.id)} className="w-full flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.condition} · Week {p.week} • Day {p.day}</p>
                </div>
                <span className={`text-sm font-semibold ${adherenceTone(p.adherence)}`}>{p.adherence}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            {ACTIVITY_FEED.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                {a.kind === "done" ? (
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate"><span className="font-medium">{a.patient}</span> {a.text}</p>
                  <p className="text-xs text-gray-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Adherence Overview</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ADHERENCE_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F0F7" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Top Performers</p>
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{i + 1}. {p.name}</span>
                  <span className="font-semibold text-gray-900">{p.adherence}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
