import React, { useState } from "react";
import { Dumbbell, Stethoscope, User, Lock } from "lucide-react";
import { Field, inputClass } from "../ui/Modal.jsx";

export function LoginScreen({ patients, therapists, onLogin }) {
  const [role, setRole] = useState(null);
  const [patientId, setPatientId] = useState(patients[0].id);
  const [therapistId, setTherapistId] = useState(therapists[0].id);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white">
            <Dumbbell size={18} />
          </div>
          <span className="font-semibold text-lg text-gray-900">PhysioRehab</span>
        </div>

        {!role && (
          <>
            <p className="text-sm text-gray-500 mb-5">Sign in as</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setRole("therapist")} className="flex flex-col items-center gap-2 border border-gray-200 rounded-2xl py-6 hover:border-violet-300 hover:bg-violet-50">
                <Stethoscope size={22} className="text-violet-600" />
                <span className="text-sm font-medium text-gray-800">Therapist</span>
              </button>
              <button onClick={() => setRole("patient")} className="flex flex-col items-center gap-2 border border-gray-200 rounded-2xl py-6 hover:border-violet-300 hover:bg-violet-50">
                <User size={22} className="text-violet-600" />
                <span className="text-sm font-medium text-gray-800">Patient</span>
              </button>
            </div>
          </>
        )}

        {role === "therapist" && (
          <>
            <p className="text-sm text-gray-500 mb-6">Therapist sign in</p>
            <Field label="Therapist (demo)">
              <select className={inputClass} value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
                {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Password">
              <input type="password" defaultValue="••••••••" className={inputClass} />
            </Field>
            <div className="mt-4">
              <button onClick={() => onLogin("therapist", therapistId)} className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-violet-700">
                Sign In
              </button>
            </div>
            <button onClick={() => setRole(null)} className="text-xs text-gray-400 mt-3">← Back</button>
          </>
        )}

        {role === "patient" && (
          <>
            <p className="text-sm text-gray-500 mb-6">Patient sign in</p>
            <Field label="Patient (demo)">
              <select className={inputClass} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Password">
              <input type="password" defaultValue="••••••••" className={inputClass} />
            </Field>
            <div className="mt-4">
              <button onClick={() => onLogin("patient", patientId)} className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-violet-700">
                Sign In
              </button>
            </div>
            <button onClick={() => setRole(null)} className="text-xs text-gray-400 mt-3">← Back</button>
          </>
        )}

        <p className="text-xs text-gray-300 mt-4 text-center">Demo login — no real backend yet, any password works</p>
      </div>
    </div>
  );
}

export function SetPasswordScreen({ patient, onDone }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && pw !== confirm;
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
          <Lock size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 mb-1">Welcome, {patient.name.split(" ")[0]}</h2>
        <p className="text-sm text-gray-500 mb-6">Set a new password to continue — this is your first sign-in.</p>
        <Field label="New password">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </Field>
        {mismatch && <p className="text-xs text-rose-500 -mt-2 mb-3">Passwords don't match</p>}
        <button
          disabled={!pw || pw !== confirm}
          onClick={onDone}
          className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
