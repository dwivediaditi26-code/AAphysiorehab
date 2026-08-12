import React from "react";
import { PageHeader } from "../ui/Atoms.jsx";

export default function SettingsView({ missedSessionAlerts, onToggleMissedSessionAlerts, remindersEnabled, onToggleReminders }) {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Practice preferences" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 max-w-lg">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Practice name</p>
          <p className="text-sm font-medium text-gray-900">Aditi Physiotherapy & Rehab</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Therapists</p>
          <p className="text-sm font-medium text-gray-900">Dr. Aditi, Partner Therapist</p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Missed-session alerts</p>
            <p className="text-xs text-gray-400">Notify when a patient misses a session</p>
          </div>
          <button
            onClick={onToggleMissedSessionAlerts}
            className={`w-10 h-6 rounded-full transition-colors ${missedSessionAlerts ? "bg-violet-600" : "bg-gray-200"}`}
          >
            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${missedSessionAlerts ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Patient reminders</p>
            <p className="text-xs text-gray-400">In-app nudge if today's exercises aren't done by evening — patient has to open the app to see it, this isn't a push notification (needs a backend, not built yet)</p>
          </div>
          <button
            onClick={onToggleReminders}
            className={`w-10 h-6 rounded-full transition-colors shrink-0 ml-3 ${remindersEnabled ? "bg-violet-600" : "bg-gray-200"}`}
          >
            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${remindersEnabled ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
