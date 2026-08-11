// Bilingual coaching feedback. Each tracker's getFeedback() returns keys from
// here; UI renders both languages together (see TrackedExerciseSession.jsx
// and PatientSessionComplete in ExerciseFlow.jsx). Translations are Hindi as
// spoken in everyday fitness/physio coaching in India (natural code-mixing
// with common loanwords like "फॉर्म", "रेप"), not formal/literary Hindi.
//
// `en`/`hi` are the full-sentence versions shown as on-screen text.
// `voiceEn`/`voiceHi` are short directive phrases for the live voice coach
// (voiceCoach.js) — full sentences are too slow to hear mid-rep, so these
// are the 1-3 word version a real trainer would actually shout out.

export const FEEDBACK_MESSAGES = {
  slowerReps: {
    en: "Move a little slower through each rep",
    hi: "हर रेप थोड़ा धीरे करें",
    voiceEn: "Slower",
    voiceHi: "धीरे",
  },
  lowerBackDown: {
    en: "Keep your lower back gently pressed to the floor",
    hi: "कमर को धीरे से ज़मीन पर दबाए रखें",
    voiceEn: "Back down",
    voiceHi: "पीठ नीचे",
  },
  keepRestingStill: {
    en: "Try to keep the resting arm and leg still",
    hi: "आराम कर रहे हाथ और पैर को स्थिर रखने की कोशिश करें",
    voiceEn: "Hold still",
    voiceHi: "स्थिर रहें",
  },
  goodFormGeneric: {
    good: true,
    en: "Controlled movement, good form throughout",
    hi: "नियंत्रित गति, फॉर्म अच्छा रहा",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  slowerRiseLower: {
    en: "Rise and lower a little slower",
    hi: "थोड़ा धीरे ऊपर उठें और नीचे आएं",
    voiceEn: "Slower",
    voiceHi: "धीरे",
  },
  keepHipsLevel: {
    en: "Keep both hips level as you lift",
    hi: "उठाते समय दोनों कूल्हों को समतल रखें",
    voiceEn: "Hips level",
    voiceHi: "कूल्हे बराबर",
  },
  goodBridgeHeight: {
    good: true,
    en: "Good bridge height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  noRocking: {
    en: "Keep your hips level, avoid rocking side to side",
    hi: "कूल्हों को समतल रखें, इधर-उधर न हिलें",
    voiceEn: "Hips still",
    voiceHi: "कूल्हे स्थिर",
  },
  keepNonWorkingLegUp: {
    en: "Keep the non-working leg lifted and straight",
    hi: "जो पैर काम नहीं कर रहा उसे ऊपर और सीधा रखें",
    voiceEn: "Leg up",
    voiceHi: "पैर ऊपर",
  },
  goodHeightLegExtended: {
    good: true,
    en: "Good height, leg stayed extended",
    hi: "अच्छी ऊंचाई, पैर सीधा रहा",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  moveBackFullBody: {
    en: "Move back — make sure your whole body is visible",
    hi: "पीछे हटें — सुनिश्चित करें कि आपका पूरा शरीर दिख रहा हो",
    voiceEn: "Move back",
    voiceHi: "पीछे हटें",
  },
  cameraSetupTipFrontal: {
    en: "Face the camera directly. Prop your phone so your head, hands, and feet are all in frame.",
    hi: "कैमरे के सामने सीधे खड़े हों। फ़ोन को इस तरह रखें कि सिर, हाथ और पैर — सभी फ्रेम में दिखें।",
    voiceEn: "Face the camera",
    voiceHi: "कैमरे के सामने खड़े हों",
  },
  cameraSetupTipSide: {
    en: "Lie down side-on to the camera. Prop your phone so your head, hands, and feet are all in frame.",
    hi: "कैमरे के सामने बग़ल में लेटें। फ़ोन को इस तरह रखें कि सिर, हाथ और पैर — सभी फ्रेम में दिखें।",
    voiceEn: "Lie side-on to the camera",
    voiceHi: "बग़ल में लेटें",
  },
  goodSquat: {
    good: true,
    en: "Good depth, controlled tempo",
    hi: "अच्छी गहराई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  chestUp: {
    en: "Keep your chest up as you squat",
    hi: "स्क्वाट करते समय छाती ऊपर रखें",
    voiceEn: "Chest up",
    voiceHi: "छाती ऊपर",
  },
  goodHipHinge: {
    good: true,
    en: "Good hinge, back stayed straight",
    hi: "अच्छा हिंज, पीठ सीधी रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  kneesSoft: {
    en: "Keep knees soft — this is a hip hinge, not a squat",
    hi: "घुटनों को हल्का मोड़े रखें — यह स्क्वाट नहीं, हिप हिंज है",
    voiceEn: "Knees soft",
    voiceHi: "घुटने ढीले",
  },
  goodStand: {
    good: true,
    en: "Stood up fully, controlled tempo",
    hi: "पूरी तरह खड़े हुए, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  goodHeelRaise: {
    good: true,
    en: "Good height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  goodShoulderFlexion: {
    good: true,
    en: "Good range, controlled tempo",
    hi: "अच्छी रेंज, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  evenArms: {
    en: "Raise both arms to the same height",
    hi: "दोनों हाथों को समान ऊंचाई तक उठाएं",
    voiceEn: "Arms even",
    voiceHi: "हाथ बराबर",
  },
  goodShoulderAbduction: {
    good: true,
    en: "Good height, both arms even",
    hi: "अच्छी ऊंचाई, दोनों हाथ समान रहे",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  keepStanceLegStill: {
    en: "Keep the standing leg still and balanced",
    hi: "खड़े पैर को स्थिर और संतुलित रखें",
    voiceEn: "Stand still",
    voiceHi: "स्थिर खड़े रहें",
  },
  goodHipAbduction: {
    good: true,
    en: "Good height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
};
