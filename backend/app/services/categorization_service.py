"""
Transaction categorization pipeline with waterfall strategy.

Stages:
1. ML Model: RandomForest classifier with 0.7 confidence threshold
2. LLM: Batch processing via Gemini API (fallback for low-confidence predictions)

Each stage produces (category, confidence_score) where confidence ranges 0.0-1.0.
Items that don't meet threshold are passed to the next stage.
Failed LLM calls mark items as category=None with appropriate logging.
"""

import json
import os
import re
import logging
import joblib
import pickle
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from gensim.models import Word2Vec
    GENSIM_AVAILABLE = True
except ImportError:
    GENSIM_AVAILABLE = False

from app.services.llm_service import llm

# Configure logging
logger = logging.getLogger(__name__)

DEFAULT_TYPE = "purchase"
ML_CONFIDENCE_THRESHOLD = 0.5  # Items below this threshold go to LLM


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
    except Exception as e:
        logger.warning(f"Failed to load categories keywords: {e}")
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
    except Exception as e:
        logger.warning(f"Failed to load MCC map: {e}")
    return {}


_MCC_MAP = _load_mcc_map()


def _load_fasttext_model():
    """Load pre-trained Word2Vec embeddings model.
    
    Trained on Hugging Face mitulshah/transaction-categorization dataset.
    Word2Vec model (no character n-grams) for smaller file size.
    """
    if not GENSIM_AVAILABLE:
        logger.warning("Gensim not available, Word2Vec model disabled")
        return None
    try:
        base = Path(__file__).resolve().parents[1] / "ml_models"
        # Try Word2Vec model first
        model_path = base / "word2vec_model_hf.model"
        if model_path.exists():
            model = Word2Vec.load(str(model_path))
            logger.info(f"Loaded Word2Vec embeddings from {model_path} (vocab: {len(model.wv)})")
            return model
        # Fallback to old FastText model if exists
        model_path = base / "fasttext_model_hf.model"
        if model_path.exists():
            from gensim.models import FastText
            model = FastText.load(str(model_path))
            logger.info(f"Loaded FastText embeddings from {model_path} (vocab: {len(model.wv)})")
            return model
    except Exception as e:
        logger.warning(f"Failed to load Word2Vec model: {e}")
    return None


def _load_ml_model():
    """Load pre-trained RandomForest classifier for Word2Vec embeddings.
    
    The model is trained on Word2Vec embeddings of merchant names.
    - Features: 100-dimensional Word2Vec vectors
    - Algorithm: RandomForestClassifier with 50 estimators
    - Trained on: Hugging Face transaction-categorization dataset (3.6M samples)
    - Classes: 10 categories from categories.json
    """
    try:
        base = Path(__file__).resolve().parents[1] / "ml_models"
        # Try FastText-based model first
        model_path = base / "transaction_classifier_ft_hf.pkl"
        if model_path.exists():
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            logger.info(f"Loaded FastText-based classifier from {model_path}")
            return model
        # Fallback to old model
        model_path = base / "transaction_classifier.pkl"
        if model_path.exists():
            model = joblib.load(model_path)
            logger.info(f"Loaded legacy ML classifier from {model_path}")
            return model
    except Exception as e:
        logger.warning(f"Failed to load ML model: {e}")
    return None


_FASTTEXT_MODEL = _load_fasttext_model()
_ML_MODEL = _load_ml_model()


def categorize_heuristic(merchant: str, mcc: Optional[str]) -> Optional[Tuple[str, float]]:
    """
    First-pass hard heuristics using merchant name patterns and MCC descriptions
    driven by categories.json keywords.
    Returns (category, confidence) with confidence=1.0 if match found, or None.
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
                return cat, 1.0  # Return confidence=1.0 for heuristic matches

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


def _text_to_vector(text: str) -> Optional[np.ndarray]:
    """Convert merchant name to Word2Vec embedding vector."""
    if not _FASTTEXT_MODEL:
        return None
    try:
        tokens = str(text).upper().split()
        # Handle OOV words - Word2Vec doesn't have character n-grams
        vectors = [_FASTTEXT_MODEL.wv[word] for word in tokens if word in _FASTTEXT_MODEL.wv]
        if not vectors:
            return None
        return np.mean(vectors, axis=0)
    except Exception:
        return None


def categorize_with_model(
    merchant: str, 
    mcc: Optional[str], 
    amount: float,
    merchant_city: Optional[str] = None,
    merchant_state: Optional[str] = None,
    use_chip: Optional[bool] = None
) -> Optional[Tuple[str, float]]:
    """
    ML model categorization using Word2Vec embeddings + RandomForest.
    
    Features: 100-dimensional Word2Vec vectors from merchant name.
    Trained on 3.6M transactions from Hugging Face dataset.
    Returns (category, confidence) tuple, or None if model unavailable.
    """
    if not _ML_MODEL or not _FASTTEXT_MODEL:
        return None
    
    try:
        # Convert merchant name to FastText vector
        vector = _text_to_vector(merchant or 'unknown')
        if vector is None:
            return None
        
        # Reshape for sklearn
        features = vector.reshape(1, -1)
        
        # Get prediction and probability
        prediction = _ML_MODEL.predict(features)[0]
        probabilities = _ML_MODEL.predict_proba(features)[0]
        max_confidence = float(max(probabilities))
        
        logger.debug(f"ML prediction: {prediction} (confidence={max_confidence:.3f})")
        
        return str(prediction), max_confidence
        
    except Exception as e:
        logger.error(f"ML model categorization failed: {e}")
        return None


def categorize_batch_ml(merchants: List[str], threshold: float = 0.5) -> List[Tuple[Optional[str], Optional[float], bool]]:
    """
    FAST batch ML categorization for multiple merchants at once.
    
    This is much faster than calling categorize_with_model() in a loop because:
    1. Vectorizes all merchants in one pass
    2. Runs batch prediction on all vectors at once
    
    Args:
        merchants: List of merchant names to categorize
        threshold: Confidence threshold (below this -> needs LLM)
    
    Returns:
        List of tuples: (category, confidence, needs_llm)
        - category: predicted category or None if below threshold
        - confidence: prediction confidence 0.0-1.0
        - needs_llm: True if confidence < threshold
    """
    if not _ML_MODEL or not _FASTTEXT_MODEL or not merchants:
        return [(None, None, True) for _ in merchants]
    
    try:
        # Batch vectorize all merchants
        vectors = []
        for merchant in merchants:
            vec = _text_to_vector(merchant or 'unknown')
            if vec is not None:
                vectors.append(vec)
            else:
                vectors.append(np.zeros(100))  # Fallback for OOV
        
        X = np.array(vectors)
        
        # Batch predict
        predictions = _ML_MODEL.predict(X)
        probabilities = _ML_MODEL.predict_proba(X)
        confidences = probabilities.max(axis=1)
        
        # Build results
        results = []
        for i, (pred, conf) in enumerate(zip(predictions, confidences)):
            conf_float = float(conf)
            if conf_float >= threshold:
                results.append((str(pred), conf_float, False))
            else:
                results.append((None, conf_float, True))
        
        logger.info(f"Batch ML categorization: {len(merchants)} items, {sum(1 for r in results if not r[2])} handled by ML")
        return results
        
    except Exception as e:
        logger.error(f"Batch ML categorization failed: {e}")
        return [(None, None, True) for _ in merchants]


def categorize_batch_llm(items: List[Dict]) -> Dict[int, Dict[str, any]]:
    """
    Third-pass batched LLM categorization with confidence scoring.
    
    Input items: list of dicts with keys {index, merchant, amount, mcc, city, state, zip, description}.
    Returns mapping: index -> {category, confidence, type}
    On API failure, returns empty dict (items remain category=None)
    """
    if not items:
        return {}

    allowed = ", ".join(CATEGORIES)
    system_prompt = """
You are Pixie, a precise financial categorizer. Classify each transaction to a category and type.
You will get a list of transactions, and you will determine a categorization for each of them based on the allowed categories
Add a confidence measurment for each categorization made, based on how confidence you are in the category you decided on.
Rules:
- Only respond with a valid JSON array.
- Each element must be an object: {"index": <int>, "category": <string>, "type": <string>, "confidence": <float 0.0-1.0>}.
- Category must be one of: {allowed}.
- Type is one of: "purchase", "transfer", "refund", "fee", "income".
- Confidence ranges 0.0 (unsure) to 1.0 (certain). Default to 0.8 for reasonable matches.
- Do not include commentary.
""".replace("{allowed}", allowed)


    user_message = json.dumps({"transactions": items}, ensure_ascii=False)

    response_schema = {
        "name": "transaction_categorizations",
        "schema": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "category": {"type": "string"},
                    "type": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["index", "category", "type"],
                "additionalProperties": False,
            },
        },
    }

    def _coerce_list(obj: any) -> Optional[List[Dict]]:
        if isinstance(obj, list):
            return obj
        if isinstance(obj, str):
            cleaned = obj.strip()
            # Strip code fences if present
            fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
            if fence:
                cleaned = fence.group(1).strip()
            try:
                parsed = json.loads(cleaned)
                return parsed if isinstance(parsed, list) else None
            except Exception:
                return None
        return None

    def _attempt(user_msg: str, stricter: bool = False) -> Optional[List[Dict]]:
        sp = system_prompt if not stricter else system_prompt + "\nReturn ONLY the JSON array, no extra text."
        try:
            data = llm.chat_json(system_prompt=sp, user_message=user_msg, response_schema=response_schema)
            return _coerce_list(data)
        except Exception:
            return None

    parsed = _attempt(user_message, stricter=False)
    if not parsed:
        parsed = _attempt(user_message, stricter=True)
    if not parsed:
        # final retry: wrap items as compact array to minimize hallucination
        compact = [{"index": it.get("index"), "merchant": it.get("merchant"), "amount": it.get("amount"), "mcc": it.get("mcc")} for it in items]
        parsed = _attempt(json.dumps({"transactions": compact}, ensure_ascii=False), stricter=True)

    result: Dict[int, Dict[str, any]] = {}
    for obj in (parsed or []):
        try:
            idx = int(obj.get("index"))
            cat = str(obj.get("category") or "Other")
            typ = str(obj.get("type") or DEFAULT_TYPE)
            conf = float(obj.get("confidence", 0.8))  # Default to 0.8 if not provided
            # normalize
            if cat not in CATEGORIES:
                cat = "Other"
            result[idx] = {"category": cat, "type": typ, "confidence": max(0.0, min(1.0, conf))}
        except Exception:
            continue
    return result


def categorize_transaction_waterfall(
    merchant_name: Optional[str],
    mcc_code: Optional[str],
    amount: float,
    transaction_type: Optional[str] = None,
    merchant_city: Optional[str] = None,
    merchant_state: Optional[str] = None,
    use_chip: Optional[bool] = None
) -> Tuple[Optional[str], Optional[float], Optional[str]]:
    """
    Main waterfall categorization pipeline with three stages.
    
    Args:
        merchant_name: Merchant name or description
        mcc_code: Merchant Category Code
        amount: Transaction amount
        transaction_type: Optional transaction type hint (salary, bill_payment, etc.)
        merchant_city: Merchant city (for ML features)
        merchant_state: Merchant state (for ML features)
        use_chip: Whether chip was used (for ML features)
    
    Returns:
        Tuple of (category, confidence, source) where:
        - category: Categorized transaction type or None
        - confidence: 0.0-1.0 confidence score or None
        - source: 'heuristic', 'ml', 'llm', or None
    """
    
    # Stage 1: ML Model (if confidence >= threshold, return; else continue to LLM)
    # Note: Heuristics stage removed due to high false positive rate
    ml_result = categorize_with_model(
        merchant=merchant_name or '',
        mcc=mcc_code,
        amount=amount,
        merchant_city=merchant_city,
        merchant_state=merchant_state,
        use_chip=use_chip
    )
    if ml_result:
        category, confidence = ml_result
        if confidence >= ML_CONFIDENCE_THRESHOLD:
            logger.debug(f"ML Model: {merchant_name} -> {category} (confidence={confidence})")
            return (category, confidence, 'ml')
        else:
            logger.debug(f"ML Model confidence {confidence} < {ML_CONFIDENCE_THRESHOLD}, deferring to LLM")
    
    # Stage 2: LLM (defer to batch processing in CSV import)
    # Return None to indicate this item needs LLM categorization
    logger.debug(f"No confident categorization for {merchant_name}, deferred to LLM batch")
    return (None, None, None)


def categorize_transaction(
    merchant: str, 
    mcc: Optional[str], 
    amount: float,
    transaction_type: Optional[str] = None
) -> Optional[Tuple[str, str]]:
    """
    Legacy compatibility function - runs heuristic + model pipeline.
    For new code, use categorize_transaction_waterfall() instead.
    
    Returns:
        Tuple of (category, type) or None
    """
    # Use transaction_type hints to improve categorization
    if transaction_type:
        type_lower = transaction_type.lower()
        
        # Map common transaction types to categories
        type_category_map = {
            'salary': 'Income',
            'bill_payment': 'Bills & Utilities',
            'subscription': 'Entertainment',
            'transfer_in': 'Transfers',
            'transfer_out': 'Transfers',
            'atm_withdrawal': 'Cash',
            'interest': 'Income',
            'fee': 'Fees',
            'credit_card_payment': 'Credit Card Payment',
        }
        
        if type_lower in type_category_map:
            return (type_category_map[type_lower], transaction_type)
    
    # Run existing heuristic pipeline
    h = categorize_heuristic(merchant, mcc)
    if h:
        return (h[0], h[1])
    m = categorize_with_model(merchant, mcc, amount)
    if m:
        return (m[0], m[1])
    return None

