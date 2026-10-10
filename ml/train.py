"""
Priora Lite: train our own offline triage model, distilled from Gemini-generated data.

Model: character n-gram TF-IDF (robust to Roman-Urdu spelling variation and typos)
  -> one-vs-rest logistic regression for SATS discriminators (multi-label)
  -> multinomial logistic regression for OPD department.
Per-discriminator thresholds are tuned on validation data for recall (F2): missing a red flag
is worse than a false alarm. Colour is NOT predicted: the deterministic SATS engine decides.

Usage: ml/.venv/bin/python ml/train.py
Outputs: ml/model/priora-lite.json (weights for TypeScript inference), ml/model/metrics.json,
         ml/data/test.jsonl (held-out split), ml/model/parity.json (Python probabilities for parity checks)
"""

import json
import math
import random
import re
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, fbeta_score, precision_score, recall_score
from sklearn.multiclass import OneVsRestClassifier
from sklearn.preprocessing import MultiLabelBinarizer

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "generated.jsonl"
EVAL = ROOT.parent / "eval" / "vignettes.json"
OUT = ROOT / "model"
SEED = 42
random.seed(SEED)
np.random.seed(SEED)


def normalize(text: str) -> str:
    """Same normalisation as the TypeScript inference (lib/lite/model.ts)."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── Load & clean ────────────────────────────────────────────────────────────
rows = []
for line in DATA.read_text(encoding="utf8").splitlines():
    try:
        rows.append(json.loads(line))
    except json.JSONDecodeError:
        pass  # tolerate a partially written last line
print(f"loaded {len(rows)} generated items")

seen, clean = set(), []
for r in rows:
    key = normalize(r["text"])
    if len(key) < 4 or key in seen:
        continue
    seen.add(key)
    r["norm"] = key
    clean.append(r)
print(f"after exact dedupe: {len(clean)}")

# Contamination check: drop training items too similar to the hand-written evaluation vignettes.
vignettes = json.loads(EVAL.read_text(encoding="utf8"))["cases"]
probe = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit([r["norm"] for r in clean] + [normalize(v["text"]) for v in vignettes])
A = probe.transform([r["norm"] for r in clean])
B = probe.transform([normalize(v["text"]) for v in vignettes])
sim = (A @ B.T).toarray().max(axis=1)
contaminated = int((sim >= 0.8).sum())
clean = [r for r, s in zip(clean, sim) if s < 0.8]
print(f"removed {contaminated} items too similar to eval vignettes (cosine >= 0.8); {len(clean)} remain")

# ── Split by generation job (keeps paraphrase families together) ──────────────
jobs = sorted({r["job"] for r in clean})
random.shuffle(jobs)
by_job = {j: [r for r in clean if r["job"] == j] for j in jobs}
train, val, test = [], [], []
for r_list in by_job.values():
    random.shuffle(r_list)
    n = len(r_list)
    test += r_list[: max(1, n // 7)]
    val += r_list[max(1, n // 7) : max(2, 2 * n // 7)]
    train += r_list[max(2, 2 * n // 7) :]
print(f"split: train {len(train)} / val {len(val)} / test {len(test)}")

# ── Features ────────────────────────────────────────────────────────────────
# Two feature blocks, each L2-normalised: character n-grams (spelling-robust) + word uni/bigrams (meaning).
vec = TfidfVectorizer(
    analyzer="char_wb", ngram_range=(2, 5), min_df=2, max_features=12000,
    sublinear_tf=True, lowercase=False, dtype=np.float32,  # normalize() already lowercases
)
wvec = TfidfVectorizer(
    analyzer="word", token_pattern=r"(?u)\b\w\w+\b", ngram_range=(1, 2), min_df=2, max_features=6000,
    sublinear_tf=True, lowercase=False, dtype=np.float32,
)
def feats(texts, fit=False):
    if fit:
        return hstack([vec.fit_transform(texts), wvec.fit_transform(texts)]).tocsr()
    return hstack([vec.transform(texts), wvec.transform(texts)]).tocsr()

Xtr = feats([r["norm"] for r in train], fit=True)
Xva = feats([r["norm"] for r in val])
Xte = feats([r["norm"] for r in test])

# ── Discriminators (multi-label) ───────────────────────────────────────────
# Pain intensity is not learned from words: offline mode asks the patient for a 0–10 pain score,
# and the deterministic SATS rules map it to pain_moderate / pain_severe.
EXCLUDED = {"pain_moderate", "pain_severe"}
# Emergency signs (RED): thresholds tuned for recall (F2). Others: balanced (F1).
RED_SIGNS = {"airway_compromised", "not_breathing", "seizure_current", "burn_facial_inhalation", "hypoglycaemia", "cardiac_arrest"}
for r in clean:
    r["discriminators"] = [d for d in r["discriminators"] if d not in EXCLUDED]

mlb = MultiLabelBinarizer()
mlb.fit([r["discriminators"] for r in clean])
Ytr = mlb.transform([r["discriminators"] for r in train])
Yva = mlb.transform([r["discriminators"] for r in val])
Yte = mlb.transform([r["discriminators"] for r in test])
# Pick regularisation on validation micro-F1.
best = None
for C in (1.0, 2.0, 4.0, 8.0):
    for cw in (None, "balanced"):
        m = OneVsRestClassifier(LogisticRegression(C=C, max_iter=3000, class_weight=cw)).fit(Xtr, Ytr)
        f = f1_score(Yva, (m.predict_proba(Xva) >= 0.5).astype(int), average="micro", zero_division=0)
        print(f"  C={C} class_weight={cw}: val micro-F1 {f:.3f}")
        if best is None or f > best[0]:
            best = (f, C, cw, m)
_, best_C, best_cw, disc = best
print(f"chosen C={best_C} class_weight={best_cw}")

Pva = disc.predict_proba(Xva)
thresholds = []
for k in range(len(mlb.classes_)):
    best_t, best_f = 0.5, -1.0
    if Yva[:, k].sum() == 0:
        thresholds.append(0.5)
        continue
    beta = 2 if mlb.classes_[k] in RED_SIGNS else 1
    for t in np.arange(0.1, 0.91, 0.05):
        f = fbeta_score(Yva[:, k], Pva[:, k] >= t, beta=beta, zero_division=0)
        if f > best_f:
            best_t, best_f = float(t), f
    thresholds.append(round(best_t, 2))

Pte = disc.predict_proba(Xte)
Yhat = (Pte >= np.array(thresholds)).astype(int)
per_label = {
    c: {
        "support": int(Yte[:, k].sum()),
        "precision": round(float(precision_score(Yte[:, k], Yhat[:, k], zero_division=0)), 3),
        "recall": round(float(recall_score(Yte[:, k], Yhat[:, k], zero_division=0)), 3),
        "threshold": thresholds[k],
    }
    for k, c in enumerate(mlb.classes_)
}

# ── Department ─────────────────────────────────────────────────────────────
dept = LogisticRegression(C=best_C, max_iter=3000, class_weight="balanced")
dept.fit(Xtr, [r["department"] for r in train])
dept_pred = dept.predict(Xte)
dept_acc = float(np.mean(dept_pred == np.array([r["department"] for r in test])))

metrics = {
    "items_generated": len(rows),
    "items_after_cleaning": len(clean),
    "removed_as_eval_contamination": contaminated,
    "split": {"train": len(train), "val": len(val), "test": len(test)},
    "features": int(Xtr.shape[1]),
    "discriminators": {
        "micro_f1": round(float(f1_score(Yte, Yhat, average="micro", zero_division=0)), 3),
        "micro_recall": round(float(recall_score(Yte, Yhat, average="micro", zero_division=0)), 3),
        "micro_precision": round(float(precision_score(Yte, Yhat, average="micro", zero_division=0)), 3),
        "per_label": per_label,
    },
    "department_accuracy": round(dept_acc, 3),
    "languages": dict(Counter(r["language"] for r in clean)),
}
print(json.dumps({k: v for k, v in metrics.items() if k != "discriminators"}, indent=2))
print("discriminators micro:", {k: v for k, v in metrics["discriminators"].items() if k != "per_label"})

# ── Export for TypeScript inference (sparse, pruned, rounded) ────────────────
def terms_of(v):
    out = [None] * len(v.vocabulary_)
    for term, i in v.vocabulary_.items():
        out[i] = term
    return out


def sparse_rows(coef: np.ndarray, prune: float = 0.08):
    out = []
    for row in coef:
        idx = np.nonzero(np.abs(row) >= prune)[0]
        out.append([[int(i), round(float(row[i]), 3)] for i in idx])
    return out


disc_coef = np.vstack([e.coef_[0] for e in disc.estimators_])
disc_bias = [float(e.intercept_[0]) for e in disc.estimators_]
model = {
    "name": "priora-lite",
    "version": 1,
    "trained_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "excluded_labels": sorted(EXCLUDED),
    "regularisation": {"C": best_C, "class_weight": best_cw},
    "teacher": "gemini-2.5-flash",
    "vectorizer": {
        "analyzer": "char_wb",
        "ngram_range": [2, 5],
        "sublinear_tf": True,
        "terms": terms_of(vec),
        "idf": [round(float(x), 4) for x in vec.idf_],
    },
    "word_vectorizer": {
        "analyzer": "word",
        "ngram_range": [1, 2],
        "sublinear_tf": True,
        "terms": terms_of(wvec),
        "idf": [round(float(x), 4) for x in wvec.idf_],
    },
    "discriminators": {
        "labels": list(mlb.classes_),
        "weights": sparse_rows(disc_coef),
        "bias": [round(b, 4) for b in disc_bias],
        "thresholds": thresholds,
    },
    "department": {
        "labels": list(dept.classes_),
        "weights": sparse_rows(dept.coef_),
        "bias": [round(float(b), 4) for b in dept.intercept_],
    },
}
OUT.mkdir(exist_ok=True)
(OUT / "priora-lite.json").write_text(json.dumps(model, separators=(",", ":")), encoding="utf8")
(OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf8")
(ROOT / "data" / "test.jsonl").write_text("\n".join(json.dumps({k: r[k] for k in ("text", "language", "department", "discriminators")}, ensure_ascii=False) for r in test) + "\n", encoding="utf8")

# Parity file: probabilities for the first 25 test items, to verify the TypeScript implementation.
parity = [
    {"text": test[i]["text"], "disc": [round(float(p), 4) for p in Pte[i]], "dept": dept.predict_proba(Xte[i])[0].round(4).tolist()}
    for i in range(min(25, len(test)))
]
(OUT / "parity.json").write_text(json.dumps(parity, ensure_ascii=False), encoding="utf8")
size_kb = (OUT / "priora-lite.json").stat().st_size / 1024
print(f"exported model: {size_kb:.0f} KB")
