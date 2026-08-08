// Mock seed data — swap for real Supabase queries when the backend is wired up.

export const EXERCISES_SEED = [
  { id: "e1", name: "Diaphragmatic Breathing", region: "Core", difficulty: "Beginner", sets: 2, reps: "10 breaths", rest: "—", tracking: false },
  { id: "e2", name: "Pelvic Tilt", region: "Lumbar", difficulty: "Beginner", sets: 2, reps: "10", rest: "30 sec", tracking: true },
  { id: "e3", name: "Glute Bridge", region: "Lumbar / Core", difficulty: "Beginner", sets: 3, reps: "10", rest: "30 sec", tracking: true },
  { id: "e4", name: "Dead Bug", region: "Lumbar / Core", difficulty: "Beginner", sets: 3, reps: "8 each side", rest: "30 sec", tracking: true },
  { id: "e5", name: "Bird Dog", region: "Lumbar / Core", difficulty: "Intermediate", sets: 2, reps: "8 each side", rest: "30 sec", tracking: true },
  { id: "e6", name: "Side Plank", region: "Core", difficulty: "Intermediate", sets: 2, reps: "20 sec hold", rest: "30 sec", tracking: false },
  { id: "e7", name: "Cat-Camel", region: "Spine", difficulty: "Beginner", sets: 2, reps: "10", rest: "—", tracking: false },
  { id: "e8", name: "Hip Hinge", region: "Hip", difficulty: "Intermediate", sets: 3, reps: "10", rest: "45 sec", tracking: true },
  { id: "e9", name: "Bodyweight Squat", region: "Lower Limb", difficulty: "Beginner", sets: 3, reps: "12", rest: "45 sec", tracking: true },
  { id: "e10", name: "Clamshell", region: "Hip", difficulty: "Beginner", sets: 2, reps: "12 each side", rest: "30 sec", tracking: false },
  { id: "e11", name: "Hamstring Stretch", region: "Lower Limb", difficulty: "Beginner", sets: 2, reps: "30 sec hold", rest: "—", tracking: false },
  { id: "e12", name: "McGill Curl-Up", region: "Core", difficulty: "Intermediate", sets: 2, reps: "10", rest: "30 sec", tracking: true },
  { id: "e13", name: "Shoulder Flexion", region: "Shoulder", difficulty: "Beginner", sets: 3, reps: "12", rest: "30 sec", tracking: true },
  { id: "e14", name: "Shoulder Abduction", region: "Shoulder", difficulty: "Beginner", sets: 3, reps: "12", rest: "30 sec", tracking: true },
  { id: "e15", name: "Sit-to-Stand", region: "Lower Limb", difficulty: "Intermediate", sets: 3, reps: "10", rest: "45 sec", tracking: true },
  { id: "e16", name: "Heel Raises", region: "Lower Limb", difficulty: "Beginner", sets: 3, reps: "15", rest: "30 sec", tracking: true },
];

export const CONDITION_EXERCISE_MAP = {
  "Low Back Pain": ["e1", "e2", "e3", "e4", "e5", "e6", "e12"],
  "Neck Pain": ["e7", "e1", "e6"],
  "Post ACL Rehab": ["e9", "e15", "e16", "e11", "e8"],
  "Shoulder Pain": ["e13", "e14", "e6"],
};

export const REGIONS = ["All", "Core", "Lumbar", "Lumbar / Core", "Hip", "Spine", "Shoulder", "Lower Limb"];

export const THERAPISTS_SEED = [
  { id: "t1", name: "Dr. Aditi" },
  { id: "t2", name: "Partner Therapist" },
];

export const PATIENTS_SEED = [
  { id: "p1", name: "Rahul Sharma", gender: "Male", age: 32, phone: "9876543210", email: "rahul@gmail.com", condition: "Low Back Pain", status: "Active", week: 3, day: 4, adherence: 82, lastSession: "Yesterday", planName: "Low Back Pain Rehab — 8 Weeks", startDate: "15 Apr 2024", sessionsCompleted: 15, sessionsTotal: 18, avgForm: 87, therapistId: "t1", passwordChanged: true },
  { id: "p2", name: "Neha Verma", gender: "Female", age: 45, phone: "9876511122", email: "neha@gmail.com", condition: "Neck Pain", status: "Active", week: 2, day: 3, adherence: 76, lastSession: "Today", planName: "Neck Pain Recovery — 6 Weeks", startDate: "02 May 2024", sessionsCompleted: 9, sessionsTotal: 12, avgForm: 81, therapistId: "t2", passwordChanged: true },
  { id: "p3", name: "Arjun Patel", gender: "Male", age: 58, phone: "9876533344", email: "arjun@gmail.com", condition: "Post ACL Rehab", status: "Active", week: 4, day: 2, adherence: 88, lastSession: "Yesterday", planName: "Post-ACL Rehabilitation — 12 Weeks", startDate: "20 Mar 2024", sessionsCompleted: 24, sessionsTotal: 27, avgForm: 90, therapistId: "t1", passwordChanged: true },
  { id: "p4", name: "Sneha Iyer", gender: "Female", age: 29, phone: "9876555566", email: "sneha@gmail.com", condition: "Shoulder Pain", status: "Active", week: 1, day: 5, adherence: 60, lastSession: "3 days ago", planName: "Shoulder Pain Protocol — 6 Weeks", startDate: "28 May 2024", sessionsCompleted: 3, sessionsTotal: 6, avgForm: 74, therapistId: "t2", passwordChanged: true },
  { id: "p5", name: "Vikram Singh", gender: "Male", age: 41, phone: "9876577788", email: "vikram@gmail.com", condition: "Low Back Pain", status: "Active", week: 3, day: 1, adherence: 90, lastSession: "Yesterday", planName: "Low Back Pain Rehab — 8 Weeks", startDate: "10 Apr 2024", sessionsCompleted: 16, sessionsTotal: 18, avgForm: 92, therapistId: "t1", passwordChanged: true },
];

export const PROTOCOL_TEMPLATES = [
  { id: "tpl-lbp-beg", name: "Low Back Pain — Beginner", condition: "Low Back Pain", exerciseIds: ["e1", "e2", "e7", "e3"] },
  { id: "tpl-lbp-int", name: "Low Back Pain — Intermediate", condition: "Low Back Pain", exerciseIds: ["e2", "e3", "e4", "e5", "e6", "e12"] },
  { id: "tpl-neck-beg", name: "Neck Pain — Beginner", condition: "Neck Pain", exerciseIds: ["e7", "e1"] },
  { id: "tpl-neck-int", name: "Neck Pain — Intermediate", condition: "Neck Pain", exerciseIds: ["e7", "e1", "e6"] },
  { id: "tpl-acl", name: "Post-ACL — Progressive", condition: "Post ACL Rehab", exerciseIds: ["e9", "e15", "e16", "e11", "e8"] },
  { id: "tpl-shoulder", name: "Shoulder Pain — Beginner", condition: "Shoulder Pain", exerciseIds: ["e13", "e14", "e6"] },
];

export const MESSAGES_SEED = {
  p1: [
    { from: "patient", text: "Lower back felt much better after today's session.", time: "Yesterday, 8:10 PM" },
    { from: "therapist", text: "Great to hear — keep the pace steady through week 3.", time: "Yesterday, 8:20 PM" },
  ],
  p2: [
    { from: "patient", text: "Neck stiffness is worse in the mornings, is that normal?", time: "Today, 7:00 AM" },
  ],
  p4: [
    { from: "therapist", text: "Checking in — noticed a couple of missed sessions this week.", time: "3 days ago" },
  ],
};

export const APPOINTMENTS_SEED = [
  { id: "a1", patientId: "p1", date: "Today", time: "5:00 PM", type: "Follow-up review" },
  { id: "a2", patientId: "p3", date: "Today", time: "6:30 PM", type: "Progress assessment" },
  { id: "a3", patientId: "p4", date: "Tomorrow", time: "10:00 AM", type: "Initial assessment" },
  { id: "a4", patientId: "p2", date: "Tomorrow", time: "4:15 PM", type: "Follow-up review" },
  { id: "a5", patientId: "p5", date: "Fri, 12 Aug", time: "11:00 AM", type: "Plan revision" },
];

export const ACTIVITY_FEED = [
  { patient: "Rahul Sharma", text: "completed Dead Bug", time: "Today, 7:30 AM", kind: "done" },
  { patient: "Neha Verma", text: "completed session", time: "Today, 6:15 AM", kind: "done" },
  { patient: "Arjun Patel", text: "missed a session", time: "Yesterday, 8:20 PM", kind: "missed" },
  { patient: "Sneha Iyer", text: "completed Glute Bridge", time: "Yesterday, 7:10 PM", kind: "done" },
  { patient: "Vikram Singh", text: "completed session", time: "Yesterday, 6:30 PM", kind: "done" },
];

export const ADHERENCE_TREND = [
  { day: "Mon", value: 62 }, { day: "Tue", value: 74 }, { day: "Wed", value: 58 },
  { day: "Thu", value: 80 }, { day: "Fri", value: 70 }, { day: "Sat", value: 88 },
  { day: "Sun", value: 82 },
];

export const KPI = { totalPatients: 24, plansInProgress: 18, sessionsCompleted: 156, avgAdherence: 82 };

export const SESSION_LABELS = ["Today", "Yesterday", "2 days ago", "3 days ago", "4 days ago", "5 days ago"];

export const INSTRUCTIONS_MAP = {
  e2: ["Lie on your back, knees bent, feet flat", "Gently flatten your lower back into the floor", "Hold briefly, then release with control", "Keep breathing throughout"],
  e3: ["Lie on your back, knees bent, feet hip-width apart", "Squeeze glutes and lift hips toward the ceiling", "Keep ribs down, avoid arching the back", "Lower slowly to the start position"],
  e4: ["Lie on your back with arms pointing up", "Bring knees to 90 degrees", "Slowly lower opposite arm and leg", "Keep your lower back controlled", "Return to start and repeat"],
  e5: ["Start on hands and knees, spine neutral", "Extend opposite arm and leg together", "Keep hips level, avoid rotating the trunk", "Return with control, switch sides"],
  e6: ["Lie on your side, elbow under shoulder", "Lift hips to form a straight line", "Keep core braced, avoid sagging", "Hold, then lower with control"],
  e9: ["Stand with feet shoulder-width apart", "Bend knees and hips as if sitting back", "Keep chest up and knees tracking over toes", "Push through heels to stand"],
  e13: ["Stand tall, arm relaxed at your side", "Raise arm forward to shoulder height, elbow straight", "Keep movement slow and controlled", "Lower back down with control"],
  e14: ["Stand tall, arm relaxed at your side", "Raise arm out to the side to shoulder height", "Keep shoulder relaxed, avoid shrugging", "Lower back down with control"],
  e15: ["Sit near the edge of a sturdy chair", "Lean slightly forward and stand up fully", "Keep knees aligned with toes", "Sit back down with control"],
};
export const DEFAULT_INSTRUCTIONS = ["Move slowly and with control", "Keep breathing throughout the movement", "Return to the starting position between reps", "Stop and rest if you feel sharp pain"];
export function getInstructions(exerciseId) {
  return INSTRUCTIONS_MAP[exerciseId] || DEFAULT_INSTRUCTIONS;
}
