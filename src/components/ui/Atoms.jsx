import React from "react";

export function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
        <Icon size={20} />
      </div>
    </div>
  );
}

export function Pill({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-violet-600 rounded-full" style={{ width: `${value}%` }} />
    </div>
  );
}

export function CircularStat({ value, size = 64, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-gray-100" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="stroke-violet-600"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">
        {value}%
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", icon: Icon, type = "button" }) {
  const base = "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors";
  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-700",
    ghost: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function ScopeToggle({ scope, setScope }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 text-xs font-medium">
      <button onClick={() => setScope("mine")} className={`px-3 py-1.5 rounded-lg ${scope === "mine" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>My Patients</button>
      <button onClick={() => setScope("all")} className={`px-3 py-1.5 rounded-lg ${scope === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>All Patients</button>
    </div>
  );
}
