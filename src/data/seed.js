// Mock seed data — swap for real Supabase queries when the backend is wired up.

export const EXERCISES_SEED = [
  { id: "e1", name: "Diaphragmatic Breathing", region: "Core", difficulty: "Beginner", sets: 2, reps: "10 breaths", rest: "—", frequency: "Daily", tracking: false },
  { id: "e2", name: "Pelvic Tilt", region: "Lumbar", difficulty: "Beginner", sets: 2, reps: "10", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e3", name: "Glute Bridge", region: "Lumbar / Core", difficulty: "Beginner", sets: 3, reps: "10", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e4", name: "Dead Bug", region: "Lumbar / Core", difficulty: "Beginner", sets: 3, reps: "8 each side", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e5", name: "Bird Dog", region: "Lumbar / Core", difficulty: "Intermediate", sets: 2, reps: "8 each side", rest: "30 sec", frequency: "5x/week", tracking: true },
  { id: "e6", name: "Side Plank", region: "Core", difficulty: "Intermediate", sets: 2, reps: "20 sec hold", rest: "30 sec", frequency: "3x/week", tracking: true },
  { id: "e7", name: "Cat-Camel", region: "Spine", difficulty: "Beginner", sets: 2, reps: "10", rest: "—", frequency: "Daily", tracking: false },
  { id: "e8", name: "Hip Hinge", region: "Hip", difficulty: "Intermediate", sets: 3, reps: "10", rest: "45 sec", frequency: "3x/week", tracking: true },
  { id: "e9", name: "Bodyweight Squat", region: "Lower Limb", difficulty: "Beginner", sets: 3, reps: "12", rest: "45 sec", frequency: "3x/week", tracking: true },
  { id: "e10", name: "Clamshell", region: "Hip", difficulty: "Beginner", sets: 2, reps: "12 each side", rest: "30 sec", frequency: "5x/week", tracking: false },
  { id: "e11", name: "Hamstring Stretch", region: "Lower Limb", difficulty: "Beginner", sets: 2, reps: "30 sec hold", rest: "—", frequency: "Daily", tracking: false },
  { id: "e12", name: "McGill Curl-Up", region: "Core", difficulty: "Intermediate", sets: 2, reps: "10", rest: "30 sec", frequency: "3x/week", tracking: true },
  { id: "e13", name: "Shoulder Flexion", region: "Shoulder", difficulty: "Beginner", sets: 3, reps: "12", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e14", name: "Shoulder Abduction", region: "Shoulder", difficulty: "Beginner", sets: 3, reps: "12", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e15", name: "Sit-to-Stand", region: "Lower Limb", difficulty: "Intermediate", sets: 3, reps: "10", rest: "45 sec", frequency: "Daily", tracking: true },
  { id: "e16", name: "Heel Raises", region: "Lower Limb", difficulty: "Beginner", sets: 3, reps: "15", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e17", name: "Single Leg Bridge", region: "Lumbar / Core", difficulty: "Intermediate", sets: 2, reps: "8 each side", rest: "30 sec", frequency: "3x/week", tracking: true },
  { id: "e18", name: "Standing Hip Abduction", region: "Hip", difficulty: "Beginner", sets: 3, reps: "12 each side", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e19", name: "Side-Lying Leg Raise", region: "Hip", difficulty: "Beginner", sets: 2, reps: "12 each side", rest: "30 sec", frequency: "Daily", tracking: true },
  { id: "e20", name: "Adductor Squeeze", region: "Hip", difficulty: "Beginner", sets: 3, reps: "10 sec hold", rest: "15 sec", frequency: "Daily", tracking: true },
  { id: "e21", name: "Slump Neural Slide", region: "Spine", difficulty: "Intermediate", sets: 2, reps: "10", rest: "30 sec", frequency: "3x/week", tracking: false },
  { id: "e22", name: "Superman", region: "Spine", difficulty: "Intermediate", sets: 2, reps: "8", rest: "30 sec", frequency: "3x/week", tracking: true },
  { id: "e23", name: "Front Plank", region: "Core", difficulty: "Intermediate", sets: 3, reps: "20 sec hold", rest: "30 sec", frequency: "3x/week", tracking: true },
  { id: "e24", name: "Child's Pose", region: "Spine", difficulty: "Beginner", sets: 1, reps: "30 sec hold", rest: "—", frequency: "Daily", tracking: false },
  { id: "e25", name: "Knee-to-Chest Stretch", region: "Lumbar", difficulty: "Beginner", sets: 2, reps: "30 sec hold each side", rest: "—", frequency: "Daily", tracking: false },
  { id: "e26", name: "Piriformis Stretch", region: "Hip", difficulty: "Beginner", sets: 2, reps: "30 sec hold each side", rest: "—", frequency: "Daily", tracking: false },
  { id: "e27", name: "Prone Press-Up", region: "Lumbar", difficulty: "Beginner", sets: 1, reps: "10", rest: "—", frequency: "Daily", tracking: true },
  { id: "e28", name: "Standing Extension", region: "Lumbar", difficulty: "Beginner", sets: 1, reps: "10", rest: "—", frequency: "Daily", tracking: false },
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
  e2: [
    { en: "Lie on your back, knees bent, feet flat", hi: "पीठ के बल लेटें, घुटने मुड़े हों, पैर ज़मीन पर सपाट हों" },
    { en: "Gently flatten your lower back into the floor", hi: "अपनी कमर को धीरे से ज़मीन की ओर दबाएं" },
    { en: "Hold briefly, then release with control", hi: "थोड़ी देर रोकें, फिर नियंत्रण से छोड़ें" },
    { en: "Keep breathing throughout", hi: "सांस लेते रहें" },
  ],
  e3: [
    { en: "Lie on your back, knees bent, feet hip-width apart", hi: "पीठ के बल लेटें, घुटने मुड़े हों, पैर कूल्हों जितनी दूरी पर हों" },
    { en: "Squeeze glutes and lift hips toward the ceiling", hi: "ग्लूट्स को कसें और कूल्हों को ऊपर की ओर उठाएं" },
    { en: "Keep ribs down, avoid arching the back", hi: "पसलियों को नीचे रखें, कमर को न मोड़ें" },
    { en: "Lower slowly to the start position", hi: "धीरे-धीरे शुरुआती स्थिति में वापस आएं" },
  ],
  e4: [
    { en: "Lie on your back with arms pointing up", hi: "पीठ के बल लेटें, दोनों हाथ ऊपर की ओर सीधे रखें" },
    { en: "Bring knees to 90 degrees", hi: "घुटनों को 90 डिग्री पर लाएं" },
    { en: "Slowly lower opposite arm and leg", hi: "विपरीत हाथ और पैर को धीरे-धीरे नीचे लाएं" },
    { en: "Keep your lower back controlled", hi: "कमर को स्थिर और नियंत्रित रखें" },
    { en: "Return to start and repeat", hi: "शुरुआती स्थिति में वापस आएं और दोहराएं" },
  ],
  e5: [
    { en: "Start on hands and knees, spine neutral", hi: "हाथों और घुटनों के बल शुरू करें, रीढ़ सीधी रखें" },
    { en: "Extend opposite arm and leg together", hi: "विपरीत हाथ और पैर को एक साथ सीधा करें" },
    { en: "Keep hips level, avoid rotating the trunk", hi: "कूल्हों को समतल रखें, धड़ को न मोड़ें" },
    { en: "Return with control, switch sides", hi: "नियंत्रण से वापस आएं, दूसरी तरफ दोहराएं" },
  ],
  e6: [
    { en: "Lie on your side, elbow under shoulder", hi: "करवट लेकर लेटें, कोहनी कंधे के नीचे रखें" },
    { en: "Lift hips to form a straight line", hi: "कूल्हों को उठाकर सीधी रेखा बनाएं" },
    { en: "Keep core braced, avoid sagging", hi: "कोर को कसा रखें, कमर को झुकने न दें" },
    { en: "Hold, then lower with control", hi: "रोकें, फिर नियंत्रण से नीचे आएं" },
  ],
  e9: [
    { en: "Stand with feet shoulder-width apart", hi: "पैरों को कंधों जितना चौड़ा रखकर खड़े हों" },
    { en: "Bend knees and hips as if sitting back", hi: "ऐसे बैठें जैसे कुर्सी पर बैठ रहे हों, घुटने और कूल्हे मोड़ें" },
    { en: "Keep chest up and knees tracking over toes", hi: "छाती ऊपर रखें, घुटने पंजों की सीध में रहें" },
    { en: "Push through heels to stand", hi: "एड़ियों से ज़ोर लगाकर खड़े हों" },
  ],
  e13: [
    { en: "Stand tall, arm relaxed at your side", hi: "सीधे खड़े हों, हाथ बगल में ढीला रखें" },
    { en: "Raise arm forward to shoulder height, elbow straight", hi: "हाथ को आगे कंधे की ऊंचाई तक उठाएं, कोहनी सीधी रखें" },
    { en: "Keep movement slow and controlled", hi: "गति धीमी और नियंत्रित रखें" },
    { en: "Lower back down with control", hi: "नियंत्रण से हाथ नीचे लाएं" },
  ],
  e14: [
    { en: "Stand tall, arm relaxed at your side", hi: "सीधे खड़े हों, हाथ बगल में ढीला रखें" },
    { en: "Raise arm out to the side to shoulder height", hi: "हाथ को बगल में कंधे की ऊंचाई तक उठाएं" },
    { en: "Keep shoulder relaxed, avoid shrugging", hi: "कंधे को ढीला रखें, ऊपर न उचकाएं" },
    { en: "Lower back down with control", hi: "नियंत्रण से हाथ नीचे लाएं" },
  ],
  e15: [
    { en: "Sit near the edge of a sturdy chair", hi: "किसी मज़बूत कुर्सी के किनारे पर बैठें" },
    { en: "Lean slightly forward and stand up fully", hi: "थोड़ा आगे झुकें और पूरी तरह खड़े हो जाएं" },
    { en: "Keep knees aligned with toes", hi: "घुटनों को पंजों की सीध में रखें" },
    { en: "Sit back down with control", hi: "नियंत्रण से वापस बैठ जाएं" },
  ],
  e17: [
    { en: "Lie on your back, one knee bent with foot flat", hi: "पीठ के बल लेटें, एक घुटना मोड़ें और पैर ज़मीन पर सपाट रखें" },
    { en: "Extend the other leg straight, lifted off the floor", hi: "दूसरे पैर को सीधा रखें और ज़मीन से ऊपर उठाएं" },
    { en: "Push through the planted heel to lift your hips", hi: "ज़मीन पर टिकी एड़ी से ज़ोर लगाकर कूल्हे उठाएं" },
    { en: "Keep the lifted leg extended throughout", hi: "उठाए हुए पैर को पूरी तरह सीधा रखें" },
    { en: "Lower with control and repeat", hi: "नियंत्रण से नीचे आएं और दोहराएं" },
  ],
  e18: [
    { en: "Stand tall, holding onto a wall or chair for balance", hi: "सीधे खड़े हों, संतुलन के लिए दीवार या कुर्सी पकड़ें" },
    { en: "Keep your standing leg straight and steady", hi: "खड़े पैर को सीधा और स्थिर रखें" },
    { en: "Lift the other leg out to the side, keeping the toes forward", hi: "दूसरे पैर को बगल में उठाएं, पंजे आगे की ओर रखें" },
    { en: "Avoid leaning your torso to compensate", hi: "शरीर को झुकाकर संतुलन न बनाएं" },
    { en: "Lower with control and repeat", hi: "नियंत्रण से नीचे लाएं और दोहराएं" },
  ],
  e19: [
    { en: "Lie on your side, legs stacked, body in a straight line", hi: "करवट लेकर लेटें, पैर एक के ऊपर एक रखें, शरीर सीधी रेखा में हो" },
    { en: "Keep your top leg straight and lift it toward the ceiling", hi: "ऊपर वाले पैर को सीधा रखें और छत की ओर उठाएं" },
    { en: "Keep your hips stacked, don't let them roll back", hi: "कूल्हों को सीध में रखें, पीछे की ओर न मुड़ने दें" },
    { en: "Lower with control and repeat, then switch sides", hi: "नियंत्रण से नीचे लाएं और दोहराएं, फिर दूसरी तरफ करें" },
  ],
  e20: [
    { en: "Lie on your back, knees bent, feet flat", hi: "पीठ के बल लेटें, घुटने मुड़े हों, पैर ज़मीन पर सपाट हों" },
    { en: "Place a small ball or pillow between your knees", hi: "घुटनों के बीच एक छोटी गेंद या तकिया रखें" },
    { en: "Gently squeeze the ball, engaging your inner thighs and core", hi: "गेंद को धीरे से दबाएं, जांघों के अंदरूनी हिस्से और कोर को सक्रिय करें" },
    { en: "Hold, breathing normally, then release with control", hi: "सामान्य सांस लेते हुए रोकें, फिर नियंत्रण से छोड़ें" },
  ],
  e21: [
    { en: "Sit tall at the edge of a chair, hands resting behind you on the seat", hi: "कुर्सी के किनारे पर सीधे बैठें, हाथ पीछे सीट पर टिकाएं" },
    { en: "Gently slump your back and tuck your chin, then straighten one knee while lifting your chin up", hi: "धीरे से पीठ को झुकाएं और ठुड्डी को नीचे करें, फिर एक घुटना सीधा करते हुए ठुड्डी ऊपर उठाएं" },
    { en: "Reverse together: round your back and chin down as you bend the knee back down", hi: "साथ में उल्टा करें: पीठ को गोल करें और ठुड्डी नीचे करें जैसे ही घुटना वापस मोड़ें" },
    { en: "Move smoothly between the two positions — this should feel like a gentle stretch, never sharp pain", hi: "दोनों स्थितियों के बीच सहजता से घूमें — यह हल्का खिंचाव जैसा महसूस होना चाहिए, तेज़ दर्द नहीं" },
    { en: "Stop and tell your therapist if you feel tingling, numbness, or pain spreading down your leg", hi: "अगर पैर में झनझनाहट, सुन्नपन, या दर्द फैलता महसूस हो तो रुकें और अपने थेरेपिस्ट को बताएं" },
  ],
  e22: [
    { en: "Lie face down, arms extended overhead, legs straight", hi: "पेट के बल लेटें, हाथ ऊपर की ओर सीधे फैलाएं, पैर सीधे रखें" },
    { en: "Lift arms, chest, and legs off the floor at the same time, using your back and glutes", hi: "पीठ और ग्लूट्स का उपयोग करते हुए हाथ, छाती और पैरों को एक साथ ज़मीन से ऊपर उठाएं" },
    { en: "Hold briefly at the top, keeping your neck relaxed", hi: "ऊपर थोड़ी देर रुकें, गर्दन को ढीला रखें" },
    { en: "Lower with control back to the start", hi: "नियंत्रण से वापस शुरुआती स्थिति में आएं" },
    { en: "This loads the lower back more than Bird Dog — your therapist may prefer Bird Dog if you're sensitive to spinal loading", hi: "यह कमर पर बर्ड डॉग से ज़्यादा दबाव डालता है — अगर कमर संवेदनशील है तो थेरेपिस्ट बर्ड डॉग को प्राथमिकता दे सकते हैं" },
  ],
  e23: [
    { en: "Lie face down, prop up on forearms and toes", hi: "पेट के बल लेटें, कोहनियों और पंजों के बल ऊपर उठें" },
    { en: "Keep your body in a straight line from head to heels", hi: "सिर से एड़ी तक शरीर को एक सीधी रेखा में रखें" },
    { en: "Brace your core, avoid letting your hips sag or pike up", hi: "कोर को कसें, कूल्हों को न झुकने दें और न ऊपर उठने दें" },
    { en: "Hold, breathing normally, then release with control", hi: "सामान्य सांस लेते हुए रोकें, फिर नियंत्रण से छोड़ें" },
  ],
  e24: [
    { en: "Kneel on the floor, big toes touching, knees apart", hi: "ज़मीन पर घुटनों के बल बैठें, अंगूठे मिले हों, घुटने अलग रखें" },
    { en: "Sit back onto your heels and fold forward, arms reaching ahead", hi: "एड़ियों पर बैठते हुए आगे झुकें, हाथ आगे की ओर फैलाएं" },
    { en: "Let your forehead rest on the floor, breathe into your lower back", hi: "माथे को ज़मीन पर टिकाएं, कमर की ओर सांस लें" },
    { en: "Hold gently, come out slowly if you feel any pinching", hi: "धीरे से रोकें, अगर कहीं दबाव महसूस हो तो धीरे से बाहर आएं" },
  ],
  e25: [
    { en: "Lie on your back, knees bent, feet flat", hi: "पीठ के बल लेटें, घुटने मुड़े हों, पैर ज़मीन पर सपाट हों" },
    { en: "Bring one knee toward your chest, holding behind the thigh", hi: "एक घुटने को छाती की ओर लाएं, जांघ के पीछे पकड़ें" },
    { en: "Keep your lower back gently pressed to the floor", hi: "कमर को धीरे से ज़मीन पर दबाए रखें" },
    { en: "Hold, then switch sides", hi: "रोकें, फिर दूसरी तरफ करें" },
  ],
  e26: [
    { en: "Lie on your back, knees bent, feet flat", hi: "पीठ के बल लेटें, घुटने मुड़े हों, पैर ज़मीन पर सपाट हों" },
    { en: "Cross one ankle over the opposite knee", hi: "एक टखने को दूसरे घुटने के ऊपर क्रॉस करें" },
    { en: "Gently pull the uncrossed thigh toward your chest until you feel a stretch in the hip", hi: "बिना क्रॉस वाली जांघ को धीरे से छाती की ओर खींचें जब तक कूल्हे में खिंचाव महसूस न हो" },
    { en: "Hold, then switch sides", hi: "रोकें, फिर दूसरी तरफ करें" },
  ],
  e27: [
    { en: "Lie face down, hands under your shoulders", hi: "पेट के बल लेटें, हाथ कंधों के नीचे रखें" },
    { en: "Slowly press your chest up, letting your hips stay on the floor", hi: "धीरे-धीरे छाती को ऊपर उठाएं, कूल्हे ज़मीन पर टिके रहें" },
    { en: "Keep your lower back relaxed — this is a gentle press, not a strong push", hi: "कमर को ढीला रखें — यह हल्का दबाव है, ज़ोर से धक्का नहीं" },
    { en: "Lower back down with control", hi: "नियंत्रण से वापस नीचे आएं" },
    { en: "Often used for pain that centralizes with extension — check with your therapist which direction suits you", hi: "यह अक्सर उस दर्द के लिए उपयोग होता है जो पीछे झुकने से केंद्र की ओर आता है — अपने थेरेपिस्ट से पूछें कि कौन सी दिशा आपके लिए सही है" },
  ],
  e28: [
    { en: "Stand tall, feet hip-width apart", hi: "सीधे खड़े हों, पैर कूल्हों जितनी दूरी पर हों" },
    { en: "Place your hands on your lower back for support", hi: "हाथों को सहारे के लिए कमर पर रखें" },
    { en: "Gently lean backward from your hips, looking slightly upward", hi: "कूल्हों से धीरे से पीछे की ओर झुकें, थोड़ा ऊपर देखें" },
    { en: "Return to standing with control — move only as far as feels comfortable", hi: "नियंत्रण से वापस सीधे खड़े हों — जितना आरामदायक लगे उतना ही झुकें" },
  ],
};
export const DEFAULT_INSTRUCTIONS = [
  { en: "Move slowly and with control", hi: "धीरे और नियंत्रित तरीके से करें" },
  { en: "Keep breathing throughout the movement", hi: "पूरी कसरत के दौरान सांस लेते रहें" },
  { en: "Return to the starting position between reps", hi: "हर बार शुरुआती स्थिति में वापस आएं" },
  { en: "Stop and rest if you feel sharp pain", hi: "अगर तेज़ दर्द महसूस हो तो रुक जाएं और आराम करें" },
];
export function getInstructions(exerciseId) {
  return INSTRUCTIONS_MAP[exerciseId] || DEFAULT_INSTRUCTIONS;
}
