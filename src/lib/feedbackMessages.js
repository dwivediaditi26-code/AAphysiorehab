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
// Exception: the cameraSetupTip* entries — their voice lines are the full
// sentence, because they are read out once in the first-time guide (guideScript.js)
// before any exercise starts, not shouted mid-rep.

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
  liftHipsHigher: {
    en: "Lift your hips a little higher",
    hi: "कमर को थोड़ा और ऊपर उठाएं",
    voiceEn: "Lift higher",
    voiceHi: "कमर ऊपर",
  },
  keepHipsUp: {
    en: "Keep your hips up — don't let them drop mid-lift",
    hi: "कमर को ऊपर रखें — बीच में नीचे न गिरने दें",
    voiceEn: "Hips up",
    voiceHi: "कमर ऊपर",
  },
  // Fires when the near-side knee straightens well past where it started the
  // rep — a leg lifting/extending off the mat during a two-leg bridge (see
  // gluteBridgeTracker.js). "Bend your knee" names the geometry directly.
  keepKneeBent: {
    en: "Keep your knee bent and your foot flat on the ground",
    hi: "घुटने को मुड़ा रखें, पैर ज़मीन पर टिका रखें",
    voiceEn: "Bend your knee",
    voiceHi: "घुटना मोड़ें",
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
    en: "Part of your body is out of frame — move your phone back",
    hi: "आपके शरीर का हिस्सा फ्रेम से बाहर है — फ़ोन को पीछे करें",
    voiceEn: "Move back",
    voiceHi: "पीछे हटें",
  },
  // Bridging only needs the pelvis and lower limb in frame — say exactly that.
  moveBackLowerBody: {
    en: "Your hips, knees and feet need to be in frame — move your phone back",
    hi: "आपके कूल्हे, घुटने और पैर फ्रेम में दिखने चाहिए — फ़ोन को पीछे करें",
    voiceEn: "Move back",
    voiceHi: "पीछे हटें",
  },
  moveCloser: {
    en: "Move a little closer so the camera sees you clearly",
    hi: "थोड़ा पास आएं ताकि कैमरा आपको साफ़ देख सके",
    voiceEn: "Move closer",
    voiceHi: "थोड़ा पास आएं",
  },
  lowConfidence: {
    en: "Camera can't see your body clearly — add light, use a plain floor, avoid loose clothing",
    hi: "कैमरा आपका शरीर साफ़ नहीं देख पा रहा — रोशनी बढ़ाएं, सादा फ़र्श रखें, ढीले कपड़े न पहनें",
    voiceEn: "Add more light",
    voiceHi: "रोशनी बढ़ाएं",
  },
  getInPosition: {
    en: "Get in position — the count starts when the camera sees you clearly",
    hi: "सही स्थिति में आएं — कैमरा साफ़ देखते ही गिनती शुरू होगी",
    voiceEn: "Get in position",
    voiceHi: "सही स्थिति में आएं",
  },
  holdStill: {
    en: "Hold still for a second…",
    hi: "एक पल स्थिर रहें…",
    voiceEn: "Hold still",
    voiceHi: "स्थिर रहें",
  },
  noPersonDetected: {
    en: "Can't see you — check your camera and lighting",
    hi: "आप दिख नहीं रहे — कैमरा और रोशनी जांचें",
    voiceEn: "Can't see you",
    voiceHi: "आप दिख नहीं रहे",
  },
  cameraSetupTipFrontal: {
    en: "Prop your phone at waist height, about 6 to 8 feet (2 metres) away, and stand facing it. Your whole body, at least from head to knees, should be in view.",
    hi: "फ़ोन को कमर की ऊंचाई पर, लगभग छह से आठ फ़ुट (दो मीटर) दूर टिकाएं और उसके सामने खड़े हों। आपका पूरा शरीर, कम से कम सिर से घुटनों तक, दिखना चाहिए।",
    voiceEn: "Prop your phone at waist height, about six to eight feet away, and stand facing it. Your whole body, at least from head to knees, should be in view.",
    voiceHi: "फ़ोन को कमर की ऊंचाई पर, लगभग छह से आठ फ़ुट दूर टिकाएं और उसके सामने खड़े हों। आपका पूरा शरीर, कम से कम सिर से घुटनों तक, दिखना चाहिए।",
  },
  cameraSetupTipStandingSide: {
    en: "Prop your phone at waist height, about 6 to 8 feet (2 metres) away, and stand with your side to it. Your whole body, at least from head to knees, should be in view.",
    hi: "फ़ोन को कमर की ऊंचाई पर, लगभग छह से आठ फ़ुट (दो मीटर) दूर टिकाएं और उसकी तरफ़ बग़ल करके खड़े हों। आपका पूरा शरीर, कम से कम सिर से घुटनों तक, दिखना चाहिए।",
    voiceEn: "Prop your phone at waist height, about six to eight feet away, and stand with your side to it. Your whole body, at least from head to knees, should be in view.",
    voiceHi: "फ़ोन को कमर की ऊंचाई पर, लगभग छह से आठ फ़ुट दूर टिकाएं और उसकी तरफ़ बग़ल करके खड़े हों। आपका पूरा शरीर, कम से कम सिर से घुटनों तक, दिखना चाहिए।",
  },
  // Spoken confirmation for the air-gesture "point and hold" control — the
  // screen changes too, but the whole point is not needing to look at it.
  gesturePaused: {
    en: "Paused",
    hi: "रोका",
    voiceEn: "Paused",
    voiceHi: "रुका",
  },
  gestureResumed: {
    en: "Resumed",
    hi: "फिर शुरू",
    voiceEn: "Resumed",
    voiceHi: "फिर शुरू",
  },
  letsGetStarted: {
    en: "Let's get started in…",
    hi: "चलिए शुरू करते हैं…",
    voiceEn: "Let's get started in",
    voiceHi: "चलिए शुरू करते हैं",
  },
  goCue: {
    en: "Go!",
    hi: "शुरू!",
    voiceEn: "Go",
    voiceHi: "शुरू",
  },
  cameraSetupTipLowerBody: {
    en: "Put your phone on the floor, about 4 to 5 feet (1.2 to 1.5 metres) away, and lie with your side to it. Your hips, knees and feet should be in view — your head doesn't need to be.",
    hi: "फ़ोन को ज़मीन के पास, लगभग चार से पांच फ़ुट (सवा से डेढ़ मीटर) दूर रखें और उसकी तरफ़ बग़ल करके लेटें। आपके कूल्हे, घुटने और पैर दिखने चाहिए — सिर का दिखना ज़रूरी नहीं।",
    voiceEn: "Put your phone on the floor, about four to five feet away, and lie with your side to it. Your hips, knees and feet should be in view. Your head doesn't need to be.",
    voiceHi: "फ़ोन को ज़मीन के पास, लगभग चार से पांच फ़ुट दूर रखें और उसकी तरफ़ बग़ल करके लेटें। आपके कूल्हे, घुटने और पैर दिखने चाहिए। सिर का दिखना ज़रूरी नहीं।",
  },
  cameraSetupTipSide: {
    en: "Put your phone on the floor beside your mat, about 5 to 6 feet (1.5 to 2 metres) away, and lie with your side to it. Your whole body, from head to feet, should be in view.",
    hi: "फ़ोन को चटाई के बगल में ज़मीन के पास, लगभग पांच से छह फ़ुट (डेढ़ से दो मीटर) दूर रखें और उसकी तरफ़ बग़ल करके लेटें। सिर से पैर तक आपका पूरा शरीर दिखना चाहिए।",
    voiceEn: "Put your phone on the floor beside your mat, about five to six feet away, and lie with your side to it. Your whole body, from head to feet, should be in view.",
    voiceHi: "फ़ोन को चटाई के बगल में ज़मीन के पास, लगभग पांच से छह फ़ुट दूर रखें और उसकी तरफ़ बग़ल करके लेटें। सिर से पैर तक आपका पूरा शरीर दिखना चाहिए।",
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
  liftTogether: {
    en: "Lift chest and legs together",
    hi: "छाती और पैर एक साथ उठाएं",
    voiceEn: "Lift together",
    voiceHi: "साथ में उठाएं",
  },
  goodSuperman: {
    good: true,
    en: "Good lift, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  keepHipsDown: {
    en: "Keep your hips on the floor",
    hi: "कूल्हों को ज़मीन पर रखें",
    voiceEn: "Hips down",
    voiceHi: "कूल्हे नीचे",
  },
  goodPressUp: {
    good: true,
    en: "Good press, controlled tempo",
    hi: "अच्छा प्रेस, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  keepBottomLegStill: {
    en: "Keep your bottom leg still",
    hi: "नीचे वाले पैर को स्थिर रखें",
    voiceEn: "Bottom leg still",
    voiceHi: "नीचे वाला पैर स्थिर",
  },
  goodLegRaise: {
    good: true,
    en: "Good height, controlled tempo",
    hi: "अच्छी ऊंचाई, गति नियंत्रित रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },
  goodHold: {
    good: true,
    en: "Good hold, steady position",
    hi: "अच्छी पकड़, स्थिर स्थिति",
    voiceEn: "Good hold",
    voiceHi: "अच्छी पकड़",
  },
  holdBroke: {
    en: "Position broke before time was up — reset and try again",
    hi: "समय पूरा होने से पहले स्थिति टूट गई — फिर से कोशिश करें",
    voiceEn: "Hold again",
    voiceHi: "फिर से रोकें",
  },
  keepHipsUpPlank: {
    en: "Keep your hips up, avoid sagging",
    hi: "कूल्हों को ऊपर रखें, झुकने न दें",
    voiceEn: "Hips up",
    voiceHi: "कूल्हे ऊपर",
  },

  // --- Seated neck exercises: framing / setup (head and shoulders only) ---
  moveBackUpperBody: {
    en: "Your head and both shoulders need to be in frame — move your phone back a little",
    hi: "आपका सिर और दोनों कंधे फ्रेम में दिखने चाहिए — फ़ोन को थोड़ा पीछे करें",
    voiceEn: "Move back a little",
    voiceHi: "थोड़ा पीछे हटें",
  },
  cameraSetupTipSeatedFrontal: {
    en: "Sit tall on a chair facing the phone. Prop it at face height, about an arm's length away (2 to 3 feet), so your head and both shoulders are clearly in view.",
    hi: "फ़ोन के सामने कुर्सी पर सीधे बैठें। फ़ोन को चेहरे की ऊंचाई पर, एक हाथ की दूरी यानी दो से तीन फ़ुट पर टिकाएं, ताकि आपका सिर और दोनों कंधे साफ़ दिखें।",
    voiceEn: "Sit tall on a chair facing the phone. Prop it at face height, about an arm's length away, two to three feet, so your head and both shoulders are clearly in view.",
    voiceHi: "फ़ोन के सामने कुर्सी पर सीधे बैठें। फ़ोन को चेहरे की ऊंचाई पर, एक हाथ की दूरी यानी दो से तीन फ़ुट पर टिकाएं, ताकि आपका सिर और दोनों कंधे साफ़ दिखें।",
  },
  cameraSetupTipSeatedSide: {
    en: "Sit tall on a chair with your side to the phone. Prop it at head height, about 3 feet away, so your head and shoulder are clearly in view.",
    hi: "कुर्सी पर सीधे इस तरह बैठें कि आपकी बग़ल फ़ोन की तरफ़ हो। फ़ोन को सिर की ऊंचाई पर, लगभग तीन फ़ुट दूर टिकाएं, ताकि आपका सिर और कंधा साफ़ दिखें।",
    voiceEn: "Sit tall on a chair with your side to the phone. Prop it at head height, about three feet away, so your head and shoulder are clearly in view.",
    voiceHi: "कुर्सी पर सीधे इस तरह बैठें कि आपकी बग़ल फ़ोन की तरफ़ हो। फ़ोन को सिर की ऊंचाई पर, लगभग तीन फ़ुट दूर टिकाएं, ताकि आपका सिर और कंधा साफ़ दिखें।",
  },

  // --- Chin tuck (cervical retraction) ---
  tuckFurther: {
    en: "Draw your head a little further back",
    hi: "सिर को थोड़ा और पीछे खींचें",
    voiceEn: "Head back",
    voiceHi: "सिर पीछे",
  },
  keepChinLevel: {
    en: "Keep your chin level — slide your head straight back, don't nod",
    hi: "ठुड्डी सीधी रखें — सिर को सीधा पीछे खिसकाएं, नीचे न झुकाएं",
    voiceEn: "Chin level",
    voiceHi: "ठुड्डी सीधी",
  },
  goodChinTuck: {
    good: true,
    en: "Good — head drawn straight back, chin level",
    hi: "बढ़िया — सिर सीधा पीछे गया, ठुड्डी सीधी रही",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },

  // --- Neck rotation (look right / look left) ---
  turnFurther: {
    en: "Turn a little further, until you feel a gentle stretch",
    hi: "थोड़ा और घुमाएं, जब तक हल्का खिंचाव महसूस न हो",
    voiceEn: "Turn a bit more",
    voiceHi: "थोड़ा और घुमाएं",
  },
  keepShouldersSquare: {
    en: "Keep your shoulders facing forward — turn only your neck",
    hi: "कंधे सामने की तरफ़ रखें — सिर्फ़ गर्दन घुमाएं",
    voiceEn: "Shoulders still",
    voiceHi: "कंधे स्थिर",
  },
  goodNeckRotation: {
    good: true,
    en: "Smooth, easy turn — nicely done",
    hi: "आराम से घुमाया — बहुत अच्छा",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },

  // --- Neck side bend (ear toward shoulder) ---
  bendFurther: {
    en: "Bring your ear a little closer to your shoulder",
    hi: "कान को कंधे की तरफ़ थोड़ा और झुकाएं",
    voiceEn: "Ear to shoulder",
    voiceHi: "कान कंधे की तरफ़",
  },
  shouldersLevel: {
    en: "Keep both shoulders level — don't lift your shoulder up to your ear",
    hi: "दोनों कंधे बराबर रखें — कंधे को कान की तरफ़ ऊपर न उठाएं",
    voiceEn: "Shoulders level",
    voiceHi: "कंधे बराबर",
  },
  goodNeckSideBend: {
    good: true,
    en: "Good side stretch, shoulders stayed level",
    hi: "बढ़िया खिंचाव, कंधे बराबर रहे",
    voiceEn: "Good",
    voiceHi: "बढ़िया",
  },

  // --- Neck: shared ---
  slowNeck: {
    en: "Move your neck slowly and smoothly — no jerking",
    hi: "गर्दन को धीरे-धीरे और आराम से घुमाएं — झटका न दें",
    voiceEn: "Slowly",
    voiceHi: "धीरे-धीरे",
  },

  // --- Shoulder raise: compensation cues (flexion + abduction) ---
  dontShrug: {
    en: "Keep your shoulder relaxed — don't shrug it up",
    hi: "कंधे को ढीला रखें — ऊपर न उचकाएं",
    voiceEn: "Relax shoulders",
    voiceHi: "कंधे ढीले",
  },
  standTallNoLean: {
    en: "Stand tall — don't lean your body to lift your arm",
    hi: "सीधे खड़े रहें — हाथ उठाने के लिए शरीर को न झुकाएं",
    voiceEn: "Stand tall",
    voiceHi: "सीधे खड़े रहें",
  },
  elbowStraight: {
    en: "Keep your elbow straight",
    hi: "कोहनी को सीधा रखें",
    voiceEn: "Elbow straight",
    voiceHi: "कोहनी सीधी",
  },
  raiseArmHigher: {
    en: "Raise your arm a little higher, up to shoulder height",
    hi: "हाथ को थोड़ा और ऊपर उठाएं, कंधे की ऊंचाई तक",
    voiceEn: "A bit higher",
    voiceHi: "थोड़ा और ऊपर",
  },
};
