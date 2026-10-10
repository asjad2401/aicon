/**
 * Spoken kiosk phrases (Urdu + English). Audio is pre-generated once with Gemini TTS
 * (scripts/generate-voice.mts → public/voice/<key>.m4a) so playback is instant at the kiosk.
 * Follow-up questions are simple yes/no questions, one per SATS sign, in everyday Urdu.
 */

export const FOLLOW_UP_QUESTIONS: Record<string, { ur: string; en: string }> = {
  airway_compromised: { ur: "کیا گلا بند ہو رہا ہے یا سانس لینے میں آواز آ رہی ہے؟", en: "Is the throat closing, or is there a noise when breathing?" },
  not_breathing: { ur: "کیا سانس بالکل رک رہی ہے یا ہونٹ نیلے ہو رہے ہیں؟", en: "Is breathing stopping, or are the lips turning blue?" },
  seizure_current: { ur: "کیا ابھی جھٹکے لگ رہے ہیں؟", en: "Are there fits or jerking right now?" },
  burn_facial_inhalation: { ur: "کیا چہرہ جلا ہے یا دھواں اندر گیا ہے؟", en: "Is the face burnt, or was smoke breathed in?" },
  hypoglycaemia: { ur: "کیا آپ شوگر کے مریض ہیں اور شوگر بہت کم ہو گئی ہے؟", en: "Are you diabetic, and has your sugar dropped very low?" },
  cardiac_arrest: { ur: "کیا مریض گر گیا ہے اور جواب نہیں دے رہا؟", en: "Has the patient collapsed and stopped responding?" },
  sob_acute: { ur: "کیا آج اچانک سانس پھول رہی ہے اور بات کرنا مشکل ہے؟", en: "Is there sudden breathlessness today, making it hard to talk?" },
  coughing_blood: { ur: "کیا کھانسی میں خون آتا ہے؟", en: "Is there blood when you cough?" },
  chest_pain: { ur: "کیا سینے میں درد یا دباؤ ہے، جو بازو یا جبڑے تک جاتا ہے؟", en: "Is there chest pain or pressure, perhaps going to the arm or jaw?" },
  haemorrhage_uncontrolled: { ur: "کیا خون دبانے سے بھی نہیں رک رہا؟", en: "Is the bleeding not stopping even with pressure?" },
  seizure_post_ictal: { ur: "کیا ابھی دورہ پڑا تھا اور اب بہت غنودگی ہے؟", en: "Was there a fit just now, and now a lot of drowsiness?" },
  focal_neurology_acute: { ur: "کیا اچانک منہ ٹیڑھا ہوا، زبان لڑکھڑائی یا ایک طرف کمزوری آئی؟", en: "Did the face droop, speech slur, or one side go weak suddenly?" },
  reduced_consciousness: { ur: "کیا مریض بہت غنودگی میں ہے یا ٹھیک سے جواب نہیں دے رہا؟", en: "Is the patient very drowsy or not answering properly?" },
  psychosis_aggression: { ur: "کیا مریض خود کو یا کسی اور کو نقصان پہنچانے کی بات کر رہا ہے؟", en: "Is the patient talking about harming themselves or others?" },
  threatened_limb: { ur: "کیا ہاتھ یا پاؤں ٹھنڈا، پیلا یا سن ہو گیا ہے؟", en: "Is an arm or leg cold, pale or numb?" },
  dislocation_large_joint: { ur: "کیا کندھا، کہنی، گھٹنا یا ٹخنہ اپنی جگہ سے ہل گیا ہے؟", en: "Has a shoulder, elbow, knee or ankle come out of place?" },
  fracture_compound: { ur: "کیا ہڈی جلد سے باہر نظر آ رہی ہے؟", en: "Can the bone be seen through the skin?" },
  burn_major: { ur: "کیا جلن بڑے حصے پر ہے، یا بجلی یا کیمیکل سے جلا ہے؟", en: "Is the burn large, or from electricity or chemicals?" },
  poisoning_overdose: { ur: "کیا کوئی زہر، کیڑے مار دوا یا بہت سی گولیاں کھائی ہیں؟", en: "Has any poison, pesticide or a lot of tablets been swallowed?" },
  diabetic_ketosis: { ur: "کیا شوگر بہت زیادہ ہے اور الٹیاں یا تیز سانس ہے؟", en: "Is the sugar very high, with vomiting or fast breathing?" },
  vomiting_fresh_blood: { ur: "کیا الٹی میں تازہ خون آیا ہے؟", en: "Is there fresh blood in the vomit?" },
  pregnancy_abdo: { ur: "کیا آپ حاملہ ہیں اور پیٹ میں درد ہے؟", en: "Are you pregnant and having stomach pain?" },
  haemorrhage_controlled: { ur: "کیا خون آیا تھا جو اب رک گیا ہے؟", en: "Was there bleeding that has now stopped?" },
  dislocation_small_joint: { ur: "کیا انگلی اپنی جگہ سے ہل گئی ہے؟", en: "Has a finger or toe come out of place?" },
  fracture_closed: { ur: "کیا ہڈی ٹوٹی ہوئی لگتی ہے، جگہ ٹیڑھی ہے یا وزن نہیں ڈال سکتے؟", en: "Does a bone look broken: bent, or you can't put weight on it?" },
  burn_other: { ur: "کیا جسم پر کوئی چھوٹی جلن ہے؟", en: "Is there a small burn anywhere?" },
  abdominal_pain: { ur: "کیا پیٹ میں درد ہے؟", en: "Is there stomach pain?" },
  diabetic_hyperglycaemia: { ur: "کیا شوگر کی ریڈنگ بہت زیادہ آ رہی ہے؟", en: "Is your sugar reading very high?" },
  vomiting_persistent: { ur: "کیا بار بار الٹی ہو رہی ہے اور کچھ پیٹ میں نہیں رکتا؟", en: "Is there repeated vomiting, with nothing staying down?" },
  pregnancy_trauma: { ur: "کیا آپ حاملہ ہیں اور کوئی چوٹ لگی ہے؟", en: "Are you pregnant and have you been injured?" },
};

/** Fixed kiosk lines. */
export const KIOSK_LINES: Record<string, { ur: string; en: string }> = {
  greeting: { ur: "السلام علیکم۔ بٹن دبائیں اور اپنی تکلیف اپنے الفاظ میں بتائیں۔", en: "Hello. Press the button and tell us what's wrong in your own words." },
  one_question: { ur: "شکریہ۔ صرف ایک سوال اور۔", en: "Thank you. Just one more question." },
  emergency_now: { ur: "فوراً ایمرجنسی جائیں۔ عملے کو اطلاع دے دی گئی ہے۔", en: "Go to Emergency right now. Staff have been alerted." },
};

/** "Go to the nurse, then <department>" for every department. */
export const DEPARTMENT_DIRECTIONS: Record<string, { ur: string; en: string }> = {
  emergency: { ur: "براہ کرم فوراً ایمرجنسی جائیں۔", en: "Please go to Emergency right away." },
  medical: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر میڈیکل او پی ڈی۔", en: "Please see the triage nurse, then Medical OPD." },
  cardiology: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر امراضِ قلب کے شعبے میں۔", en: "Please see the triage nurse, then Cardiology." },
  surgical: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر سرجیکل او پی ڈی۔", en: "Please see the triage nurse, then Surgical OPD." },
  orthopaedics: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر ہڈی جوڑ کے شعبے میں۔", en: "Please see the triage nurse, then Orthopaedics." },
  gynae: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر گائنی کے شعبے میں۔", en: "Please see the triage nurse, then Gynae." },
  paediatrics: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر بچوں کے شعبے میں۔", en: "Please see the triage nurse, then Paediatrics." },
  ent: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر کان ناک گلے کے شعبے میں۔", en: "Please see the triage nurse, then ENT." },
  eye: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر آنکھوں کے شعبے میں۔", en: "Please see the triage nurse, then the Eye department." },
  dermatology: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر جلد کے شعبے میں۔", en: "Please see the triage nurse, then Dermatology." },
  psychiatry: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر نفسیات کے شعبے میں۔", en: "Please see the triage nurse, then Psychiatry." },
  dental: { ur: "براہ کرم پہلے نرس کے پاس جائیں، پھر دانتوں کے شعبے میں۔", en: "Please see the triage nurse, then Dental." },
};

export const voiceUrl = (kind: "q" | "line" | "dept", key: string) => `/voice/${kind}-${key}.m4a`;
