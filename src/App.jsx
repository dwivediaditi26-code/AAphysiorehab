import React, { useState, useMemo, useEffect } from "react";

// Data + helpers
import {
  THERAPISTS_SEED, PATIENTS_SEED, EXERCISES_SEED, MESSAGES_SEED,
  APPOINTMENTS_SEED, CONDITION_EXERCISE_MAP,
} from "./data/seed.js";
import { generatePlan } from "./lib/helpers.js";

// Layout
import { Sidebar } from "./components/Sidebar.jsx";
import { PageHeader } from "./components/ui/Atoms.jsx";

// Therapist views
import DashboardView from "./components/therapist/Dashboard.jsx";
import { PatientsView, PatientProfileView, AddPatientModal } from "./components/therapist/Patients.jsx";
import { ExerciseLibraryView, AddExerciseModal } from "./components/therapist/ExerciseLibrary.jsx";
import PlanBuilder from "./components/therapist/PlanBuilder.jsx";
import CalendarView from "./components/therapist/Calendar.jsx";
import MessagesView from "./components/therapist/Messages.jsx";
import ProgressView from "./components/therapist/Progress.jsx";
import SettingsView from "./components/therapist/Settings.jsx";

// Patient app
import PatientApp from "./components/patient/PatientApp.jsx";

// Auth
import { LoginScreen, SetPasswordScreen } from "./components/auth/Auth.jsx";

export default function PhysioRehabApp() {
  const [role, setRole] = useState(null);
  const [loginPatientId, setLoginPatientId] = useState(null);
  const [currentTherapistId, setCurrentTherapistId] = useState(THERAPISTS_SEED[0].id);
  const [passwordSetupFor, setPasswordSetupFor] = useState(null);
  const [view, setView] = useState("dashboard");
  const [patientScope, setPatientScope] = useState("mine");
  const [patients, setPatients] = useState(PATIENTS_SEED);
  const [exercises, setExercises] = useState(EXERCISES_SEED);
  const [messages, setMessages] = useState(MESSAGES_SEED);
  const [appointments, setAppointments] = useState(APPOINTMENTS_SEED);
  const exercisesById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const initialPlans = useMemo(() => {
    const obj = {};
    PATIENTS_SEED.forEach((p) => {
      const ids = CONDITION_EXERCISE_MAP[p.condition] || Object.keys(exercisesById).slice(0, 5);
      obj[p.id] = generatePlan(ids, exercisesById);
    });
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [plans, setPlans] = useState(initialPlans);

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [planBuilderPatientId, setPlanBuilderPatientId] = useState(PATIENTS_SEED[0].id);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  useEffect(() => {
    const id = selectedPatientId || loginPatientId || (view === "plans" ? planBuilderPatientId : null);
    if (id && !plans[id]) {
      const patient = patients.find((p) => p.id === id);
      if (patient) {
        const ids = CONDITION_EXERCISE_MAP[patient.condition] || Object.keys(exercisesById).slice(0, 5);
        setPlans((prev) => ({ ...prev, [id]: generatePlan(ids, exercisesById) }));
      }
    }
  }, [selectedPatientId, loginPatientId, planBuilderPatientId, view]); // eslint-disable-line react-hooks/exhaustive-deps

  function openPatient(id) {
    setSelectedPatientId(id);
    setView("patientProfile");
  }

  function addPatient(form) {
    const id = `p${Date.now()}`;
    setPatients([
      ...patients,
      {
        id, name: form.name, gender: form.gender, age: Number(form.age) || 0, phone: form.phone, email: form.email,
        condition: form.condition, status: "Active", week: 1, day: 1, adherence: 0, lastSession: "—",
        planName: `${form.condition} Rehab — 8 Weeks`, startDate: "Today", sessionsCompleted: 0, sessionsTotal: 18, avgForm: 0,
        therapistId: currentTherapistId, passwordChanged: false,
      },
    ]);
    setShowAddPatient(false);
  }

  function addExercise(form) {
    const id = `e${Date.now()}`;
    setExercises([
      ...exercises,
      {
        id, name: form.name, region: form.region, difficulty: form.difficulty, sets: Number(form.sets) || 1,
        reps: form.reps, rest: form.rest, frequency: form.frequency, tracking: form.tracking,
        videoUrl: form.videoFile ? URL.createObjectURL(form.videoFile) : null,
      },
    ]);
    setShowAddExercise(false);
  }

  function updateExerciseVideo(id, videoUrl) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, videoUrl } : e)));
  }

  function updateExercise(id, fields) {
    setExercises((prev) => prev.map((e) => (e.id === id
      ? { ...e, name: fields.name, region: fields.region, difficulty: fields.difficulty, sets: Number(fields.sets) || 1, reps: fields.reps, rest: fields.rest, frequency: fields.frequency, tracking: fields.tracking }
      : e
    )));
  }

  function sendMessage(patientId, text, from) {
    setMessages((prev) => ({ ...prev, [patientId]: [...(prev[patientId] || []), { from, text, time: "Just now" }] }));
  }

  function addAppointment(form) {
    setAppointments((prev) => [...prev, { id: `a${Date.now()}`, ...form }]);
  }

  function markPasswordChanged(patientId) {
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, passwordChanged: true } : p)));
  }

  if (!role) {
    return (
      <LoginScreen
        patients={patients}
        therapists={THERAPISTS_SEED}
        onLogin={(r, id) => {
          if (r === "patient") {
            setLoginPatientId(id);
            const p = patients.find((pt) => pt.id === id);
            if (p && !p.passwordChanged) { setPasswordSetupFor(id); setRole(r); return; }
          } else {
            setCurrentTherapistId(id);
          }
          setRole(r);
        }}
      />
    );
  }

  if (role === "patient") {
    const loginPatient = patients.find((p) => p.id === loginPatientId) || patients[0];
    if (passwordSetupFor === loginPatient.id) {
      return <SetPasswordScreen patient={loginPatient} onDone={() => { markPasswordChanged(loginPatient.id); setPasswordSetupFor(null); }} />;
    }
    if (!plans[loginPatient.id]) return null;
    const patientTherapist = THERAPISTS_SEED.find((t) => t.id === loginPatient.therapistId) || THERAPISTS_SEED[0];
    return (
      <PatientApp
        patient={loginPatient}
        weeks={plans[loginPatient.id]}
        exercisesById={exercisesById}
        therapistName={patientTherapist.name}
        thread={messages[loginPatient.id] || []}
        onSendMessage={(text) => sendMessage(loginPatient.id, text, "patient")}
        onLogout={() => { setRole(null); setLoginPatientId(null); }}
      />
    );
  }

  const currentTherapist = THERAPISTS_SEED.find((t) => t.id === currentTherapistId) || THERAPISTS_SEED[0];
  const visiblePatients = patientScope === "mine" ? patients.filter((p) => p.therapistId === currentTherapistId) : patients;
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const planBuilderPatient = patients.find((p) => p.id === planBuilderPatientId) || patients[0];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar view={view === "patientProfile" ? "patients" : view} setView={(v) => { setSelectedPatientId(null); setView(v); }} onLogout={() => setRole(null)} therapist={currentTherapist} />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        {view === "dashboard" && (
          <DashboardView patients={visiblePatients} onOpenPatient={openPatient} setView={setView} therapist={currentTherapist} scope={patientScope} setScope={setPatientScope} onAddPatient={() => setShowAddPatient(true)} />
        )}

        {view === "patients" && (
          <PatientsView patients={visiblePatients} onOpenPatient={openPatient} onAddPatient={() => setShowAddPatient(true)} scope={patientScope} setScope={setPatientScope} />
        )}

        {view === "patientProfile" && selectedPatient && plans[selectedPatient.id] && (
          <PatientProfileView
            patient={selectedPatient}
            exercises={exercises}
            exercisesById={exercisesById}
            weeks={plans[selectedPatient.id]}
            onChangePlan={(w) => setPlans((prev) => ({ ...prev, [selectedPatient.id]: w }))}
            onBack={() => { setSelectedPatientId(null); setView("patients"); }}
          />
        )}

        {view === "library" && (
          <ExerciseLibraryView exercises={exercises} onAddExercise={() => setShowAddExercise(true)} onEditExercise={updateExercise} onUpdateVideo={updateExerciseVideo} />
        )}

        {view === "plans" && plans[planBuilderPatient.id] && (
          <div>
            <PageHeader
              title="Rehab Plans"
              subtitle="Build and edit week-by-week protocols"
              action={
                <select
                  value={planBuilderPatientId}
                  onChange={(e) => setPlanBuilderPatientId(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
                >
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              }
            />
            <PlanBuilder
              weeks={plans[planBuilderPatient.id]}
              exercises={exercises}
              exercisesById={exercisesById}
              onChange={(w) => setPlans((prev) => ({ ...prev, [planBuilderPatient.id]: w }))}
              patientCondition={planBuilderPatient.condition}
            />
          </div>
        )}

        {view === "calendar" && (
          <CalendarView patients={patients} appointments={appointments} onAdd={addAppointment} />
        )}

        {view === "messages" && (
          <MessagesView patients={patients} messages={messages} onSend={(id, text) => sendMessage(id, text, "therapist")} />
        )}

        {view === "progress" && <ProgressView patients={visiblePatients} onOpenPatient={openPatient} scope={patientScope} setScope={setPatientScope} />}

        {view === "settings" && <SettingsView />}
      </div>

      {showAddPatient && <AddPatientModal onClose={() => setShowAddPatient(false)} onAdd={addPatient} />}
      {showAddExercise && <AddExerciseModal onClose={() => setShowAddExercise(false)} onAdd={addExercise} />}
    </div>
  );
}
