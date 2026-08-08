// Bilingual coaching feedback. Each tracker's getFeedback() returns keys from
// here; UI renders both languages together (see TrackedExerciseSession.jsx
// and PatientSessionComplete in ExerciseFlow.jsx). Translations are Hindi as
// spoken in everyday fitness/physio coaching in India (natural code-mixing
// with common loanwords like "फॉर्म", "रेप"), not formal/literary Hindi.

export const FEEDBACK_MESSAGES = {
  slowerReps: {
    en: "Move a little slower through each rep",
    hi: "हर रेप थोड़ा धीरे करें",
  },
  lowerBackDown: {
    en: "Keep your lower back gently pressed to the floor",
    hi: "कमर को धीरे से ज़मीन पर दबाए रखें",
  },
  keepRestingStill: {
    en: "Try to keep the resting arm and leg still",
    hi: "आराम कर रहे हाथ और पैर को स्थिर रखने की कोशिश करें",
  },
  goodFormGeneric: {
    en: "Controlled movement, good form throughout",
    hi: "नियंत्रित गति, फॉर्म अच्छा रहा",
  },
  slowerRiseLower: {
    en: "Rise and lower a little slower",
    hi: "थोड़ा धीरे ऊपर उठें और नीचे आएं",
  },
  keepHipsLevel: {
    en: "Keep both hips level as you lift",
    hi: "उठाते समय दोनों कूल्हों को समतल रखें",
  },
  goodBridgeHeight: {
    en: "Good bridge height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
  },
  noRocking: {
    en: "Keep your hips level, avoid rocking side to side",
    hi: "कूल्हों को समतल रखें, इधर-उधर न हिलें",
  },
  keepNonWorkingLegUp: {
    en: "Keep the non-working leg lifted and straight",
    hi: "जो पैर काम नहीं कर रहा उसे ऊपर और सीधा रखें",
  },
  goodHeightLegExtended: {
    en: "Good height, leg stayed extended",
    hi: "अच्छी ऊंचाई, पैर सीधा रहा",
  },
  moveBackFullBody: {
    en: "Move back — make sure your whole body is visible",
    hi: "पीछे हटें — सुनिश्चित करें कि आपका पूरा शरीर दिख रहा हो",
  },
  cameraSetupTip: {
    en: "Stand side-on to the camera. Prop your phone so your head, hands, and feet are all in frame.",
    hi: "कैमरे के सामने बग़ल में खड़े हों। फ़ोन को इस तरह रखें कि सिर, हाथ और पैर — सभी फ्रेम में दिखें।",
  },
  goodSquat: {
    en: "Good depth, controlled tempo",
    hi: "अच्छी गहराई, गति नियंत्रित रही",
  },
  chestUp: {
    en: "Keep your chest up as you squat",
    hi: "स्क्वाट करते समय छाती ऊपर रखें",
  },
  goodHipHinge: {
    en: "Good hinge, back stayed straight",
    hi: "अच्छा हिंज, पीठ सीधी रही",
  },
  kneesSoft: {
    en: "Keep knees soft — this is a hip hinge, not a squat",
    hi: "घुटनों को हल्का मोड़े रखें — यह स्क्वाट नहीं, हिप हिंज है",
  },
  goodStand: {
    en: "Stood up fully, controlled tempo",
    hi: "पूरी तरह खड़े हुए, गति नियंत्रित रही",
  },
  goodHeelRaise: {
    en: "Good height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
  },
  goodShoulderFlexion: {
    en: "Good range, controlled tempo",
    hi: "अच्छी रेंज, गति नियंत्रित रही",
  },
};
