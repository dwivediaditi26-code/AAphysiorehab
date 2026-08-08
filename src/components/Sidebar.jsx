import React from "react";
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Calendar, MessageSquare,
  TrendingUp, Settings, LogOut,
} from "lucide-react";
import { initials } from "../lib/helpers.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Patients", icon: Users },
  { key: "library", label: "Exercise Library", icon: Dumbbell },
  { key: "plans", label: "Rehab Plans", icon: ClipboardList },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "progress", label: "Progress", icon: TrendingUp },
  { key: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ view, setView, onLogout, therapist }) {
  return (
    <div className="w-16 md:w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-4 md:px-5 h-16 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
          <Dumbbell size={16} />
        </div>
        <span className="hidden md:inline font-semibold text-gray-900">PhysioRehab</span>
      </div>
      <nav className="flex-1 px-2 md:px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? "bg-violet-50 text-violet-700" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(therapist.name)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{therapist.name}</p>
            <p className="text-xs text-gray-400">Physiotherapist</p>
          </div>
          <LogOut size={14} className="hidden md:block ml-auto text-gray-300" />
        </button>
      </div>
    </div>
  );
}
