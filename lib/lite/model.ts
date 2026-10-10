/**
 * Priora Lite inference: our own offline triage model (trained in ml/train.py).
 *
 * Reimplements scikit-learn's char_wb TF-IDF (sublinear tf, L2 norm) + logistic regression
 * exactly, so the same weights run in Node or the browser with no network and no Python.
 * Predicts SATS discriminators + department; the deterministic SATS engine assigns the colour.
 */

export type LiteModel = {
  name: string;
  version: number;
  vectorizer: { ngram_range: [number, number]; terms: string[]; idf: number[] };
  /** Word uni/bigram block; its feature indices follow the character block. */
  word_vectorizer?: { ngram_range: [number, number]; terms: string[]; idf: number[] };
  discriminators: { labels: string[]; weights: [number, number][][]; bias: number[]; thresholds: number[] };
  department: { labels: string[]; weights: [number, number][][]; bias: number[] };
};

export type LitePrediction = {
  discriminators: { id: string; probability: number }[];
  department: string;
  departmentConfidence: number;
  /** Highest probability among discriminators that fell just under their threshold. */
  nearMiss: number;
};

/** Must match normalize() in ml/train.py. */
export function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** scikit-learn `_char_wb_ngrams`: pad each word with spaces, emit n-grams inside the word only. */
export function charWbNgrams(text: string, [minN, maxN]: [number, number]) {
  const out: string[] = [];
  for (const word of text.split(" ").filter(Boolean)) {
    const w = Array.from(` ${word} `); // code points, like Python str
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      out.push(w.slice(offset, offset + n).join(""));
      while (offset + n < w.length) {
        offset++;
        out.push(w.slice(offset, offset + n).join(""));
      }
      if (offset === 0) break; // short word counted once
    }
  }
  return out;
}

/** scikit-learn word analyzer with token_pattern (?u)\b\w\w+\b, then n-grams joined by spaces. */
export function wordNgrams(text: string, [minN, maxN]: [number, number]) {
  const tokens = text.match(/[\p{L}\p{N}_]{2,}/gu) ?? [];
  const out: string[] = [];
  for (let n = minN; n <= maxN; n++) for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Mutually exclusive SATS signs: keep only the most probable member of each group. */
export const EXCLUSIVE_GROUPS = [
  ["haemorrhage_controlled", "haemorrhage_uncontrolled"],
  ["dislocation_small_joint", "dislocation_large_joint"],
  ["fracture_closed", "fracture_compound"],
  ["burn_other", "burn_major"],
  ["seizure_current", "seizure_post_ictal"],
  ["pregnancy_trauma", "pregnancy_abdo"],
  ["hypoglycaemia", "diabetic_hyperglycaemia", "diabetic_ketosis"],
];

export class PrioraLite {
  private index: Map<string, number>;
  private wordIndex: Map<string, number>;

  constructor(private model: LiteModel) {
    this.index = new Map(model.vectorizer.terms.map((t, i) => [t, i]));
    this.wordIndex = new Map((model.word_vectorizer?.terms ?? []).map((t, i) => [t, i]));
  }

  /** One TF-IDF block (sublinear tf, L2-normalised), written into x at the given offset. */
  private block(grams: string[], index: Map<string, number>, idf: number[], offset: number, x: Map<number, number>) {
    const counts = new Map<number, number>();
    for (const g of grams) {
      const i = index.get(g);
      if (i !== undefined) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    const vals = [...counts].map(([i, c]) => [i, (1 + Math.log(c)) * idf[i]] as const);
    const norm = Math.sqrt(vals.reduce((s, [, v]) => s + v * v, 0)) || 1;
    for (const [i, v] of vals) x.set(offset + i, v / norm);
  }

  /** Sparse feature vector (feature index → value): character block, then word block. */
  vectorize(text: string) {
    const t = normalize(text);
    const x = new Map<number, number>();
    const v = this.model.vectorizer;
    this.block(charWbNgrams(t, v.ngram_range), this.index, v.idf, 0, x);
    const w = this.model.word_vectorizer;
    if (w) this.block(wordNgrams(t, w.ngram_range), this.wordIndex, w.idf, v.terms.length, x);
    return x;
  }

  private scores(x: Map<number, number>, weights: [number, number][][], bias: number[]) {
    return weights.map((row, k) => row.reduce((s, [i, w]) => s + w * (x.get(i) ?? 0), bias[k]));
  }

  /** Raw probabilities (for parity checks with Python). */
  probabilities(text: string) {
    const x = this.vectorize(text);
    const d = this.model.discriminators;
    const disc = this.scores(x, d.weights, d.bias).map(sigmoid);
    const dep = this.model.department;
    const z = this.scores(x, dep.weights, dep.bias);
    const m = Math.max(...z);
    const e = z.map((v) => Math.exp(v - m));
    const sum = e.reduce((a, b) => a + b, 0);
    return { disc, dept: e.map((v) => v / sum) };
  }

  predict(text: string): LitePrediction {
    const { disc, dept } = this.probabilities(text);
    const d = this.model.discriminators;
    let hits = d.labels
      .map((id, k) => ({ id, probability: disc[k], threshold: d.thresholds[k] }))
      .filter((h) => h.probability >= h.threshold)
      .sort((a, b) => b.probability - a.probability)
      .map(({ id, probability }) => ({ id, probability }));
    for (const group of EXCLUSIVE_GROUPS) {
      const inGroup = hits.filter((h) => group.includes(h.id));
      if (inGroup.length > 1) hits = hits.filter((h) => !group.includes(h.id) || h === inGroup[0]);
    }
    const nearMiss = Math.max(0, ...d.labels.map((_, k) => (disc[k] < d.thresholds[k] && disc[k] >= d.thresholds[k] * 0.6 ? disc[k] : 0)));
    const best = dept.indexOf(Math.max(...dept));
    return { discriminators: hits, department: this.model.department.labels[best], departmentConfidence: dept[best], nearMiss };
  }
}
