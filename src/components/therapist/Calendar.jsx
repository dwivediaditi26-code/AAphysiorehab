import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button } from "../ui/Atoms.jsx";
import { Modal, Field, inputClass } from "../ui/Modal.jsx";
import { initials } from "../../lib/helpers.js";

function AddAppointmentModal({ patients, onClose, onAdd }) {
  const [form, setForm] = useState({ patientId: patients[0] ? patients[0].id : "", date: "Tomorrow", time: "10:00 AM", type: "Follow-up review" });
  return (
    <Modal title="New Appointment" onClose={onClose}>
      <Field label="Patient">
        <select className={inputClass} value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Time">
          <input className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </Field>
      </div>
      <Field label="Type">
        <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option>Initial assessment</option><option>Follow-up review</option><option>Progress assessment</option><option>Plan revision</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (form.patientId) onAdd(form); }}>Schedule</Button>
      </div>
    </Modal>
  );
}

export default function CalendarView({ patients, appointments, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const grouped = appointments.reduce((acc, a) => {
    (acc[a.date] = acc[a.date] || []).push(a);
    return acc;
  }, {});
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Upcoming appointments and check-ins" action={<Button icon={Plus} onClick={() => setShowAdd(true)}>New Appointment</Button>} />
      <div className="space-y-4">
        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{date}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {grouped[date].map((a) => {
                const patient = patients.find((p) => p.id === a.patientId);
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-14 shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{a.time}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {patient ? initials(patient.name) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{patient ? patient.name : "Unknown patient"}</p>
                      <p className="text-xs text-gray-400">{a.type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {appointments.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No appointments scheduled</p>}
      </div>
      {showAdd && <AddAppointmentModal patients={patients} onClose={() => setShowAdd(false)} onAdd={(form) => { onAdd(form); setShowAdd(false); }} />}
    </div>
  );
}
