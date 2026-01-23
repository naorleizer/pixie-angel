"""
Transaction History Service - exposes a compact transaction lookup for LLM tool-calling.
Returns structured JSON: { status, result, error_message, error_code }.
"""
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.transaction import Transaction


class TransactionHistoryService:
    """Fetch and filter a user's transactions for LLM usage."""

    DEFAULT_LIMIT = 20
    MAX_LIMIT = 100

    def execute(self, user_id: int, **arguments: Any) -> Dict[str, Any]:
        action = arguments.get("action", "list")
        if action != "list":
            return {
                "status": "error",
                "result": None,
                "error_message": f"Unsupported action: {action}",
                "error_code": "UNKNOWN_ACTION",
            }

        try:
            return self.list_transactions(
                user_id=user_id,
                limit=arguments.get("limit"),
                start_date=arguments.get("start_date"),
                end_date=arguments.get("end_date"),
                category=arguments.get("category"),
                merchant_query=arguments.get("merchant_query"),
                min_amount=arguments.get("min_amount"),
                max_amount=arguments.get("max_amount"),
                is_recurring=arguments.get("is_recurring"),
                is_essential=arguments.get("is_essential"),
                sort_by=arguments.get("sort_by", "date"),
                sort_order=arguments.get("sort_order", "desc"),
            )
        except Exception as exc:  # Defensive catch to avoid LLM crashes
            return {
                "status": "error",
                "result": None,
                "error_message": f"Transaction history error: {str(exc)}",
            }

    def list_transactions(
        self,
        user_id: int,
        limit: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None,
        merchant_query: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        is_recurring: Optional[Any] = None,
        is_essential: Optional[Any] = None,
        sort_by: str = "date",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        limit_value = self._normalize_limit(limit)
        if isinstance(limit_value, dict):
            return limit_value  # Already an error payload

        start_dt, start_err = self._parse_date(start_date)
        if start_err:
            return start_err

        end_dt, end_err = self._parse_date(end_date)
        if end_err:
            return end_err

        min_amt, min_err = self._parse_float(min_amount, "min_amount")
        if min_err:
            return min_err
        max_amt, max_err = self._parse_float(max_amount, "max_amount")
        if max_err:
            return max_err

        recur_flag, recur_err = self._parse_bool(is_recurring, "is_recurring")
        if recur_err:
            return recur_err
        essential_flag, essential_err = self._parse_bool(is_essential, "is_essential")
        if essential_err:
            return essential_err

        sort_err = self._validate_sort_params(sort_by, sort_order)
        if sort_err:
            return sort_err

        query = (
            Transaction.query.options(joinedload(Transaction.account))
            .filter(Transaction.user_id == user_id)
        )

        if start_dt:
            query = query.filter(Transaction.date >= start_dt)
        if end_dt:
            query = query.filter(Transaction.date <= end_dt)
        if category:
            query = query.filter(Transaction.category == category)
        if merchant_query:
            like_expr = f"%{merchant_query}%"
            query = query.filter(
                or_(
                    Transaction.merchant.ilike(like_expr),
                    Transaction.description.ilike(like_expr),
                )
            )
        if min_amt is not None:
            query = query.filter(Transaction.amount >= min_amt)
        if max_amt is not None:
            query = query.filter(Transaction.amount <= max_amt)
        if recur_flag is not None:
            query = query.filter(Transaction.is_recurring == recur_flag)
        if essential_flag is not None:
            query = query.filter(Transaction.is_essential == essential_flag)

        # Apply sorting
        order_clause = self._build_order_clause(sort_by, sort_order)
        transactions = query.order_by(order_clause).limit(limit_value).all()
        items = [self._format_transaction(tx) for tx in transactions]

        sort_desc = f"{sort_by} ({sort_order})"
        return {
            "status": "success",
            "result": items,
            "message": f"Returning {len(items)} transaction(s) (limit {limit_value}) sorted by {sort_desc}.",
            "error_message": None,
        }

    def _normalize_limit(self, limit: Optional[Any]) -> Any:
        if limit is None:
            return self.DEFAULT_LIMIT
        try:
            value = int(limit)
        except (TypeError, ValueError):
            return {
                "status": "error",
                "result": None,
                "error_message": "limit must be an integer",
                "error_code": "INVALID_LIMIT",
            }
        value = max(1, min(value, self.MAX_LIMIT))
        return value

    def _parse_date(self, date_str: Optional[str]):
        if date_str in (None, "", False):
            return None, None
        try:
            return datetime.fromisoformat(str(date_str)), None
        except Exception:
            return None, {
                "status": "error",
                "result": None,
                "error_message": "Date must be ISO8601 (YYYY-MM-DD or full datetime)",
                "error_code": "INVALID_DATE",
            }

    def _parse_float(self, value: Optional[Any], field: str):
        if value in (None, "", False):
            return None, None
        try:
            return float(value), None
        except (TypeError, ValueError):
            return None, {
                "status": "error",
                "result": None,
                "error_message": f"{field} must be a number",
                "error_code": "INVALID_AMOUNT",
            }

    def _parse_bool(self, value: Optional[Any], field: str):
        if value in (None, ""):
            return None, None
        if isinstance(value, bool):
            return value, None
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in ("true", "yes", "1"):
                return True, None
            if lowered in ("false", "no", "0"):
                return False, None
        return None, {
            "status": "error",
            "result": None,
            "error_message": f"{field} must be boolean (true/false)",
            "error_code": "INVALID_BOOLEAN",
        }

    def _validate_sort_params(self, sort_by: str, sort_order: str) -> Optional[Dict[str, Any]]:
        """Validate sort parameters."""
        valid_sorts = {"date", "amount", "category", "merchant"}
        valid_orders = {"asc", "desc"}

        if sort_by.lower() not in valid_sorts:
            return {
                "status": "error",
                "result": None,
                "error_message": f"sort_by must be one of: {', '.join(valid_sorts)}",
                "error_code": "INVALID_SORT_BY",
            }

        if sort_order.lower() not in valid_orders:
            return {
                "status": "error",
                "result": None,
                "error_message": f"sort_order must be 'asc' or 'desc'",
                "error_code": "INVALID_SORT_ORDER",
            }

        return None

    def _build_order_clause(self, sort_by: str, sort_order: str):
        """Build SQLAlchemy order clause based on sort_by and sort_order."""
        sort_by_lower = sort_by.lower()
        is_desc = sort_order.lower() == "desc"

        if sort_by_lower == "amount":
            col = Transaction.amount
        elif sort_by_lower == "category":
            col = Transaction.category
        elif sort_by_lower == "merchant":
            col = Transaction.merchant
        else:  # "date" is default
            col = Transaction.date

        return col.desc() if is_desc else col.asc()

    def _format_transaction(self, tx: Transaction) -> Dict[str, Any]:
        base = tx.to_dict()
        if tx.account:
            # Add lightweight account context for the LLM
            base["account_name"] = tx.account.account_name
            base["account_type"] = tx.account.account_type
            base["card_last_4"] = tx.account.card_last_4
        return base


transaction_history = TransactionHistoryService()
