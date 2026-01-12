# Partially Implemented Code Pieces

This file tracks functions and code sections that are incomplete, stubbed, or need finishing work. As pieces are completed, they should be marked with a ✅ and dated.

## Current Status

### 1. **ML Model Categorization** 
**Location**: `backend/app/services/categorization_service.py::categorize_with_model()`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**: 
- Loads pre-trained RandomForest model from `backend/app/ml_models/transaction_classifier.pkl`
- Features: amount, month, day, hour, merchant_name, merchant_city, merchant_state, use_chip
- Returns (category, confidence_score) tuple
- Threshold: 0.7 confidence (below = pass to LLM)
- Proper error handling with logging

---

### 2. **Confidence Score Storage in Transaction Model**
**Location**: `backend/app/models/transaction.py`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**: 
- Added `categorization_confidence: Float` (0.0-1.0)
- Added `categorization_source: String` (enum: heuristic, ml, llm, manual)
- Updated Transaction.to_dict() to include these fields
- Migration c8325b5cdee5 applied successfully

---

### 3. **Waterfall Categorization Pipeline**
**Location**: `backend/app/services/categorization_service.py`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**:

- Doesn't aggregate uncategorized items for batched LLM processing
- No logging of which stage succeeded/failed
- Doesn't respect confidence threshold (0.7) for ML stage

**Requirements**:
- Implement `categorize_batch_waterfall()` function
- Stage 1: Heuristic (hard-coded rules)
- Stage 1: Transaction type hints (salary → Income, bill_payment → Bills & Utilities, etc.)
- Stage 2: Keyword heuristics on merchant name + MCC
- Stage 3: ML Model with 0.7 confidence threshold
- Stage 4: LLM batch processing
- Returns (category, confidence, source) for each transaction
- Logs decision at each stage

---

### 4. **LLM Failure Handling**
**Location**: `backend/app/routes/api.py::_process_csv_upload()`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**:
- Catches LiteLLM exceptions in batch categorization
- Items remain with category=None, confidence=None, source=None on failure
- Logs error details: "LLM batch categorization failed: {error}"
- User receives partial success message: "N items need manual review"
- Return status includes 'uncategorized' count

---

### 5. **Logging Infrastructure**
**Location**: `backend/app/services/categorization_service.py`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**:
- Python `logging` module configured with logger instance
- Log levels: DEBUG (stage decisions), WARNING (missing artifacts), ERROR (failures)
- Used in:
  - categorize_heuristic(): DEBUG on match
  - categorize_with_model(): DEBUG on success, ERROR on model load failures
  - categorize_transaction_waterfall(): DEBUG logs for each stage decision
  - api.py: current_app.logger.error() for LLM batch failures and unexpected errors

---

### 6. **Manual Category Corrections → Training Data**
**Location**: `backend/app/routes/api.py::update_transaction()`
**Status**: ✅ COMPLETED (Jan 12, 2025)
**Implementation**:
- Added PATCH /api/transactions/<id> endpoint
- Updates category and marks as 'manual' source with 1.0 confidence
- Logs manual corrections with original category and user_id
- Frontend integrated with category dropdown in transactions table

---

### 7. **Transaction UI Redesign**
**Location**: `frontend/src/transactions.js` and `frontend/src/screens/transactions.html`
**Status**: ✅ COMPLETED (Jan 12, 2026)
**Implementation**:
- Redesigned as 2-row compact layout per transaction for mobile
- Row 1: Date | Description | Category dropdown
- Row 2: Account/Card metadata | Amount (green for income, red for expenses)
- Removed source filter dropdown and confidence badges (backend-only concerns)
- Account info display: account_name, card_last_4, country code, recurring indicator
- Light borders between related rows, darker borders between transactions
- Compact padding: py-1 throughout, select dropdown py-0.5
- Real-time category filtering and updates

---

### 8. **Recent Transactions Widget on Dashboard**
**Location**: `frontend/src/dashboard.js::loadRecentTransactions()` and dashboard HTML
**Status**: ✅ COMPLETED (Jan 12, 2026)
**Implementation**:
- New `loadRecentTransactions()` function fetches from `/api/transactions`
- Displays 5 most recent transactions in dashboard widget
- Shows: Description | Date | Amount (color-coded)
- Toggles between empty state and transaction list
- Called on dashboard initialization alongside challenges and notifications
- Uses real API data instead of mock state

---

### 9. **Transaction Title Priority Fix**
**Location**: `backend/app/routes/api.py::upload_transactions()` and frontend `transactions.js`
**Status**: ✅ COMPLETED (Jan 12, 2026)
**Implementation**:
- Backend priority: merchant_name OR description OR transaction_type OR f'Transaction on {date}'
- Frontend: description OR merchant OR 'Unknown'
- Fixed "null" string display issue in frontend
- Proper null/empty handling throughout UI

---

## Completed Items

- ✅ **ML Model Categorization** (Jan 12, 2026)
- ✅ **Confidence Score Storage** (Jan 12, 2026)
- ✅ **Waterfall Pipeline** (Jan 12, 2026)
- ✅ **LLM Failure Handling** (Jan 12, 2026)
- ✅ **Logging Infrastructure** (Jan 12, 2026)
- ✅ **Manual Category Corrections** (Jan 12, 2026)
- ✅ **Transaction UI Redesign** (Jan 12, 2026)
- ✅ **Recent Transactions Widget** (Jan 12, 2026)
- ✅ **Transaction Title Priority Fix** (Jan 12, 2026)

---

## How to Update This File

1. **When starting work on a piece**: Change status to 🔄 IN PROGRESS, add date
2. **When completing**: Change to ✅ COMPLETED, add completion date
3. **Format**: Keep consistent with above examples (Location, Status, Implementation)

---

## Pending Implementation Items

### 10. **Challenges API Wiring**
**Location**: `frontend/src/challenge.js`
**Status**: ❌ NOT IMPLEMENTED
**Issue**: Frontend uses mock challenge data instead of real API
**Requirements**:
- Replace `state.challenges` with API calls to `/api/challenges`
- Update challenge form to POST to backend
- Implement real challenge deletion and updates
**Target Completion**: Next session

---

### 11. **ML Model Artifacts Verification**
**Location**: `backend/app/ml_models/`
**Status**: 🔄 IN PROGRESS
**Issue**: Model artifacts not present in repository
**Requirements**:
- Ensure classifier.pkl, categories.json, model_metadata.json exist
- Generated from `model/classifier.ipynb`
**Target Completion**: Next session (blocking CSV import testing)
