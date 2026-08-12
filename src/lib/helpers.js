import { SESSION_LABELS } from "../data/seed.js";

export function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function adherenceTone(value) {
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-amber-600";
  return "text-rose-600";
}

export function generatePlan(exerciseIds, exercisesById, weekCount = 8) {
  const weeks = [];
  for (let w = 1; w <= weekCount; w++) {
    const days = [];
    for (let d = 1; d <= 7; d++) {
      const isRest = d === 3 || d === 6;
      let dayExercises = [];
      if (!isRest) {
        const count = Math.min(3 + Math.floor((w - 1) / 3), exerciseIds.length);
        dayExercises = exerciseIds.slice(0, count).map((id) => {
          const ex = exercisesById[id];
          return { exerciseId: id, sets: ex.sets + Math.floor((w - 1) / 3), reps: ex.reps };
        });
      }
      days.push({ day: d, isRest, exercises: dayExercises });
    }
    weeks.push({ week: w, days });
  }
  return weeks;
}

export function generateSessions(patient) {
  return SESSION_LABELS.map((label, i) => ({
    label,
    exercisesCompleted: i === 2 ? "2/3" : "3/3",
    duration: `${14 + ((i * 3) % 9)}:${(20 + i * 7) % 60 < 10 ? "0" : ""}${(20 + i * 7) % 60}`,
    formScore: Math.max(65, patient.avgForm - i * 2 + (i % 2 === 0 ? 1 : -1)),
  }));
}

export function parseRepsTarget(repsStr) {
  const match = String(repsStr).match(/\d+/);
  const n = match ? parseInt(match[0], 10) : 8;
  return /each side/i.test(String(repsStr)) ? n * 2 : n;
}

/** Extracts a hold duration in milliseconds from strings like "20 sec hold"
 * or "30 sec hold each side". "Each side" doesn't double the duration here
 * (unlike parseRepsTarget) — each side gets its own full-length hold, not a
 * combined target. */
export function parseHoldTargetMs(repsStr) {
  const match = String(repsStr).match(/(\d+)\s*sec/i);
  const seconds = match ? parseInt(match[1], 10) : 20;
  return seconds * 1000;
}

/** True when the reps text describes a hold ("X sec hold") rather than a
 * rep count — drives whether the patient flow renders a hold-timer session
 * or a rep-counter session for a given exercise. */
export function isHoldExercise(repsStr) {
  return /hold/i.test(String(repsStr));
}
