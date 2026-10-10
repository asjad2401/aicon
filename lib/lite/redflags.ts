import { normalize } from "./model";

/**
 * Red-flag safety lexicon for Priora Lite (offline triage).
 * Hand-curated, high-recall phrases for emergency and very-urgent SATS signs in English,
 * Roman Urdu and Urdu script. Hits are UNIONED with the model's predictions: the lexicon can
 * only add red flags, never remove them. Simple negation handling ("dard nahi", "no chest pain").
 * Clinical configuration: review with clinicians.
 */

type Rule = { id: string; patterns: RegExp[] };

const R = (s: string) => new RegExp(s, "u");

export const RED_FLAG_RULES: Rule[] = [
  {
    id: "not_breathing",
    patterns: [
      R("not breathing|stopped breathing|can'?t breathe at all|turn(ing|ed) blue|lips? (are |is )?(turning )?blue"),
      R("saa?ns (bilkul )?(nahi|nahin|band) (aa|le|ho)|saa?ns ruk gayi|(honth|hont) neel"),
      R("سانس (بالکل )?(نہیں آ|بند ہو|رک گئی)|ہونٹ نیلے"),
    ],
  },
  {
    id: "airway_compromised",
    patterns: [R("chok(ing|ed)|throat (is )?(closing|swollen shut)"), R("gala band|dam ghut"), R("گلا بند|دم گھٹ")],
  },
  {
    id: "cardiac_arrest",
    patterns: [R("no pulse|heart (has )?stopped|collapsed and (is )?not (breathing|responding)"), R("nabz nahi"), R("نبض نہیں")],
  },
  {
    id: "seizure_current",
    patterns: [R("(fitting|convulsing|having (a )?fits?|seizure (right )?now|shaking all over)"), R("jhatke (lag|aa) rahe|mirgi"), R("جھٹکے (لگ|آ) رہے|مرگی")],
  },
  {
    id: "reduced_consciousness",
    patterns: [R("unconscious|unresponsive|not waking|won'?t wake|passed out|fainted"), R("be ?hosh|hosh (mein )?nahi"), R("بے ہوش|ہوش (میں )?نہیں")],
  },
  {
    id: "hypoglycaemia",
    patterns: [R("(sugar|glucose) (is |has )?(very )?(low|dropped)|low sugar"), R("sugar (bohat |bahut )?(kam|gir) (ho )?gayi"), R("شوگر (بہت )?(کم|گر)")],
  },
  {
    id: "burn_facial_inhalation",
    patterns: [R("burns? (on|to) (his|her|my|the) face|face (is |was |got )?burn|smoke inhal|inhaled smoke"), R("chehr[ae] jal"), R("چہرہ جل|دھواں (اندر|سانس)")],
  },
  {
    id: "focal_neurology_acute",
    patterns: [
      R("slurred speech|speech (is )?slurred|face (is )?droop|mouth (is )?(drooping|twisted)|one side (of (the|his|her|my) body )?(is )?(weak|numb)|can'?t move (his|her|my) (arm|leg)|stroke"),
      R("fa+lij|laq?wa|munh (tera|teda|tedha|terha)|zaba?n (larkhara|lar khara|lurkh)|bol(ne|na) (mein|me) (mushkil|dikkat|taklif)|ek taraf (se )?(kamzori|sun)|(bazu|baazu|tang|taang) (mein|me) (achanak )?kamzori"),
      R("فالج|لقوہ|منہ ٹیڑھا|زبان (لڑکھڑا|لڑ کھڑا)|بولنے میں (مشکل|دقت)|ایک طرف (سے )?(کمزوری|سن)|(بازو|ٹانگ) میں (اچانک )?کمزوری"),
    ],
  },
  {
    id: "chest_pain",
    patterns: [
      R("chest (pain|tightness|pressure|heaviness)|pain in (my |his |her |the )?chest"),
      R("(seen[ae]y?|sine|seene|chhati|chati) (mein|me|main|par|pe)? ?(dard|dabao|dabaav|bhari|bharipan|jakra?n)"),
      R("سینے (میں|پر) (درد|دباؤ|جکڑن|بھاری)|چھاتی (میں|پر) درد"),
    ],
  },
  {
    id: "sob_acute",
    patterns: [
      R("short(ness)? of breath|breathless|can'?t breathe|difficulty breathing|hard to breathe|gasping"),
      R("saa?ns (phool|ukhar|ruk ruk)|saa?ns (lene|lena) (mein|me) (mushkil|taklif|dikkat)|saa?ns nahi aa rahi"),
      R("سانس (پھول|اکھڑ|رک رک)|سانس لینے میں (مشکل|تکلیف|دقت)|سانس نہیں آ رہی"),
    ],
  },
  {
    id: "coughing_blood",
    patterns: [R("cough(ing)? (up )?blood|blood (in|with) (the )?cough"), R("khansi (mein|me|ke sath) khoon|khoon (wali|ki) khansi"), R("کھانسی (میں|کے ساتھ) خون|خون (والی|کی) کھانسی")],
  },
  {
    id: "vomiting_fresh_blood",
    patterns: [R("vomit(ing|ed)? (up )?blood|blood in (the |his |her |my )?vomit"), R("ult(i|iyon|iyan) (mein|me) khoon|khoon ki ult"), R("الٹی (میں|کے ساتھ) خون|خون کی الٹی")],
  },
  {
    id: "haemorrhage_uncontrolled",
    patterns: [R("bleeding (won'?t|will not|is not|isn'?t|doesn'?t) stop|heavy bleeding|bleeding a lot"), R("khoon (nahi|nahin) ruk|khoon band nahi"), R("خون (نہیں رک|بند نہیں)")],
  },
  {
    id: "poisoning_overdose",
    patterns: [
      R("poison|overdose|swallowed (\\w+ )?(pills|tablets|chemical)|pesticide|rat (poison|medicine)|kerosene"),
      R("zeh[ae]r|keer[ae] maar|choo?ha?y? maar|goliyan (kha|nigal) l"),
      R("زہر|کیڑے مار|چوہے مار|گولیاں (کھا|نگل) ل"),
    ],
  },
  {
    id: "pregnancy_abdo",
    patterns: [
      R("(pregnant|pregnancy).{0,50}(pain|cramp)|(stomach|abdominal|belly) pain.{0,50}pregnan"),
      R("(ha+mla|ummeed se|umeed se|pregnant).{0,50}(pait|pet).{0,20}dard"),
      R("(حاملہ|امید سے).{0,50}(پیٹ).{0,20}درد"),
    ],
  },
];

// Negation: an English negator just before, or an Urdu/Roman-Urdu negator just after the match.
const NEG_BEFORE = /(no|not|without|denies|بغیر)\s+(\S+\s+){0,2}$/u;
const NEG_AFTER = /^\s*(\S+\s+){0,2}(nahi|nahin|nai|نہیں|نہ)\b/u;

export function redFlags(text: string): { id: string; phrase: string }[] {
  const t = normalize(text);
  const hits: { id: string; phrase: string }[] = [];
  for (const rule of RED_FLAG_RULES) {
    for (const re of rule.patterns) {
      const m = re.exec(t);
      if (!m) continue;
      const before = t.slice(Math.max(0, m.index - 25), m.index);
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + 20);
      // "saans nahi aa rahi" style phrases contain the negator themselves; only check outside the match.
      if (NEG_BEFORE.test(before) || (NEG_AFTER.test(after) && !/nahi|نہیں/u.test(m[0]))) continue;
      hits.push({ id: rule.id, phrase: m[0] });
      break;
    }
  }
  return hits;
}
