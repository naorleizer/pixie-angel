import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.services.llm_service import llm


DEFAULT_TYPE = "purchase"


def _load_categories_keywords() -> Dict[str, List[str]]:
    """Load category -> keywords from backend/app/ml_models/categories.json."""
    try:
        base = Path(__file__).resolve().parents[1] / "ml_models"
        path = base / "categories.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    # Normalize keywords to lowercase strings
                    return {str(cat): [str(k).lower() for k in (kw or [])] for cat, kw in data.items()}
    except Exception:
        pass
    return {}


_CATEGORIES_MAP = _load_categories_keywords()
# Allowed categories list, plus a local fallback "Other"
CATEGORIES = list(_CATEGORIES_MAP.keys())
if "Other" not in CATEGORIES:
    CATEGORIES.append("Other")


def _load_mcc_map() -> Dict[str, str]:
    """Load MCC code descriptions from model/mcc_codes.json if available."""
    try:
        # Resolve repo root: backend/app/services -> up 3 to repo root
        root = Path(__file__).resolve().parents[3]
        mcc_path = root / "model" / "mcc_codes.json"
        if mcc_path.exists():
            with open(mcc_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Expect { "MCC": "Description" } or list of objects
                if isinstance(data, dict):
                    return {str(k): str(v) for k, v in data.items()}
                elif isinstance(data, list):
                    # Try to map list[{"MCC":code,"Description":desc}]
                    out = {}
                    for item in data:
                        code = str(item.get("MCC", "")).strip()
                        desc = str(item.get("Description", "")).strip()
                        if code:
                            out[code] = desc
                    return out
    except Exception:
        pass
    return {}


_MCC_MAP = _load_mcc_map()


def categorize_heuristic(merchant: str, mcc: Optional[str]) -> Optional[Tuple[str, str]]:
    """
    First-pass hard heuristics using merchant name patterns and MCC descriptions
    driven by categories.json keywords.
    Returns (category, type) or None if inconclusive.
    """
    if not _CATEGORIES_MAP:
        return None

    m = (merchant or "").lower()
    mcc_desc = (_MCC_MAP.get(str(mcc)) or "").lower() if mcc else ""

    def contains_keyword(s: str, kw: str) -> bool:
        # word-boundary match; also handle multi-word phrases
        pat = r"\b" + re.escape(kw) + r"\b"
        return bool(re.search(pat, s))

    for cat, keywords in _CATEGORIES_MAP.items():
        for kw in keywords:
            if contains_keyword(m, kw) or (mcc_desc and contains_keyword(mcc_desc, kw)):
                return cat, DEFAULT_TYPE

    return None


def _load_model_weights() -> Optional[Dict[str, Dict[str, float]]]:
    """
    Load simple category weights from backend/ml_models/category_weights.json if present.
    Expected format: { "Dining": {"keyword": weight, ...}, "Groceries": {...}, ... }
    """
    try:
        base = Path(__file__).resolve().parents[2] / "ml_models"
        path = base / "category_weights.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception:
        pass
    return None


_WEIGHTS = _load_model_weights()


def categorize_with_model(merchant: str, mcc: Optional[str], amount: float) -> Optional[Tuple[str, str]]:
    """
    Second-pass categorization using precomputed weights (simplified scorer).
    If weights file is absent, returns None.
    """
    if not _WEIGHTS:
        return None
    m = (merchant or "").lower()
    mcc_desc = (_MCC_MAP.get(str(mcc)) or "").lower() if mcc else ""

    # Build a simple feature bag of words from merchant + mcc description
    tokens = set(re.findall(r"[a-zA-Z]+", m)) | set(re.findall(r"[a-zA-Z]+", mcc_desc))

    best_cat = None
    best_score = -1e9

    for cat, weights in _WEIGHTS.items():
        score = 0.0
        for tok in tokens:
            score += float(weights.get(tok, 0.0))
        # optional: nudge by amount scale (e.g., high spend for travel)
        if cat == "Travel":
            score += min(amount / 1000.0, 1.0) * 0.5
        if score > best_score:
            best_score = score
            best_cat = cat

    if best_cat:
        return best_cat, DEFAULT_TYPE
    return None


def categorize_batch_llm(items: List[Dict]) -> Dict[int, Dict[str, str]]:
    """
    Third-pass batched LLM categorization.
    Input items: list of dicts with keys {index, merchant, amount, mcc, city, state, zip, description}.
    Returns mapping: index -> {category, type}
    """
    if not items:
        return {}

    allowed = ", ".join(CATEGORIES)
    system_prompt = """
You are Pixie, a precise financial categorizer. Classify each transaction to a category and type.
Rules:
- Only respond with a valid JSON array.
- Each element must be an object: {"index": <int>, "category": <string>, "type": <string>}.
- Category must be one of: {allowed}.
- Type is one of: "purchase", "transfer", "refund", "fee", "income".
- Do not include commentary.
""".replace("{allowed}", allowed)

    user_message = json.dumps({"transactions": items}, ensure_ascii=False)

    def _attempt(user_msg: str, stricter: bool = False) -> Optional[List[Dict]]:
        kwargs = {}
        # If Gemini, ask for JSON mime type
        provider = os.getenv("LLM_PROVIDER", "").lower()
        if provider in ("google", "gemini"):
            kwargs["response_mime_type"] = "application/json"
        # tighten the prompt on retry
        sp = system_prompt if not stricter else system_prompt + "\nReturn ONLY the JSON array, no extra text."
        resp = llm.chat_with_system(user_message=user_msg, system_prompt=sp, **kwargs)
        try:
            data = json.loads(resp)
            if isinstance(data, list):
                return data
        except Exception:
            return None
        return None

    parsed = _attempt(user_message, stricter=False)
    if not parsed:
        parsed = _attempt(user_message, stricter=True)
    if not parsed:
        # final retry: wrap items as compact array to minimize hallucination
        compact = [{"index": it.get("index"), "merchant": it.get("merchant"), "amount": it.get("amount"), "mcc": it.get("mcc")} for it in items]
        parsed = _attempt(json.dumps({"transactions": compact}, ensure_ascii=False), stricter=True)

    result: Dict[int, Dict[str, str]] = {}
    for obj in (parsed or []):
        try:
            idx = int(obj.get("index"))
            cat = str(obj.get("category") or "Other")
            typ = str(obj.get("type") or DEFAULT_TYPE)
            # normalize
            if cat not in CATEGORIES:
                cat = "Other"
            result[idx] = {"category": cat, "type": typ}
        except Exception:
            continue
    return result


def categorize_transaction(merchant: str, mcc: Optional[str], amount: float) -> Optional[Tuple[str, str]]:
    """Run the heuristic + model pipeline for a single transaction."""
    h = categorize_heuristic(merchant, mcc)
    if h:
        return h
    m = categorize_with_model(merchant, mcc, amount)
    if m:
        return m
    return None
