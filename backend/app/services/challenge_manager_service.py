"""
Challenge Manager Service - Handles creation, updates, listing, and details
for user savings/spending challenges. Designed for use via LLM tool-calling.

Return format for all methods:
    { "status": "success"|"error", "result": <data or None>, "error_message": <str or None>, "error_code": <str or None> }
"""
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.extensions import db
from app.models.challenge import Challenge, ChallengeUpdate


class ChallengeManagerService:
    """Encapsulates challenge-related operations for tool-calling usage."""

    def execute(self, user_id: int, **arguments) -> Dict[str, Any]:
        """
        Dispatch based on the 'action' argument.
        Supported actions: create, add_update, get_details, list
        """
        action = arguments.get("action")
        if not action:
            return {
                "status": "error",
                "result": None,
                "error_message": "Missing required field: action",
                "error_code": "MISSING_FIELD"
            }

        try:
            if action == "create":
                return self.create_challenge(
                    user_id=user_id,
                    title=arguments.get("title"),
                    target_amount=arguments.get("target_amount"),
                    end_date=arguments.get("end_date"),
                    description=arguments.get("description"),
                    type=arguments.get("type", "spending_limit"),
                    color=arguments.get("color", "indigo"),
                )

            elif action == "add_update":
                return self.add_update(
                    user_id=user_id,
                    challenge_id=arguments.get("challenge_id"),
                    amount=arguments.get("amount"),
                    description=arguments.get("description"),
                )

            elif action == "get_details":
                return self.get_details(
                    user_id=user_id,
                    challenge_id=arguments.get("challenge_id"),
                )

            elif action == "list":
                return self.list_challenges(
                    user_id=user_id,
                    filter_type=arguments.get("filter", "current"),
                )

            else:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": f"Unsupported action: {action}",
                    "error_code": "UNKNOWN_ACTION"
                }

        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Challenge manager error: {str(e)}"
            }

    def create_challenge(
        self,
        user_id: int,
        title: Optional[str],
        target_amount: Optional[float],
        end_date: Optional[str],
        description: Optional[str] = None,
        type: str = "spending_limit",
        color: str = "indigo",
    ) -> Dict[str, Any]:
        """Create a new challenge for the user."""
        if not title:
            return {"status": "error", "result": None, "error_message": "Title is required", "error_code": "MISSING_FIELD"}
        if target_amount is None:
            return {"status": "error", "result": None, "error_message": "Target amount is required", "error_code": "MISSING_FIELD"}

        try:
            target_amount_val = float(target_amount)
        except (ValueError, TypeError):
            return {"status": "error", "result": None, "error_message": "Target amount must be a number", "error_code": "INVALID_AMOUNT"}

        try:
            end_dt = datetime.fromisoformat(end_date) if end_date else None
        except Exception:
            return {"status": "error", "result": None, "error_message": "end_date must be ISO8601 string (YYYY-MM-DD or full datetime)", "error_code": "INVALID_DATE"}

        challenge = Challenge(
            user_id=user_id,
            title=title,
            description=description,
            type=type,
            target_amount=target_amount_val,
            color=color,
            end_date=end_dt,
        )

        db.session.add(challenge)
        db.session.commit()

        result = challenge.to_dict()
        end_str = result.get('end_date') or 'no end date'
        msg = (
            f"Created challenge '{result.get('title')}' targeting {result.get('target_amount')}₪ by {end_str}. "
            f"Current progress: {result.get('current_amount')}₪ / {result.get('target_amount')}₪. Status: {result.get('status')}"
        )
        return {"status": "success", "result": result, "message": msg, "error_message": None}

    def add_update(self, user_id: int, challenge_id: Optional[int], amount: Optional[float], description: Optional[str]) -> Dict[str, Any]:
        """Add a signed update (positive=savings, negative=spending) to a challenge."""
        if challenge_id is None:
            return {"status": "error", "result": None, "error_message": "challenge_id is required", "error_code": "MISSING_FIELD"}
        if amount is None:
            return {"status": "error", "result": None, "error_message": "amount is required", "error_code": "MISSING_FIELD"}
        if not description:
            return {"status": "error", "result": None, "error_message": "description is required", "error_code": "MISSING_FIELD"}

        challenge = Challenge.query.filter_by(id=challenge_id, user_id=user_id).first()
        if not challenge:
            return {"status": "error", "result": None, "error_message": "Challenge not found", "error_code": "CHALLENGE_NOT_FOUND"}

        try:
            amount_val = float(amount)
        except (ValueError, TypeError):
            return {"status": "error", "result": None, "error_message": "Amount must be a number", "error_code": "INVALID_AMOUNT"}

        update = ChallengeUpdate(
            challenge_id=challenge.id,
            amount=amount_val,
            description=description,
        )
        db.session.add(update)
        db.session.commit()

        # Return the updated challenge with updates list
        result = challenge.to_dict(include_updates=True)
        msg = (
            f"Added update of {amount_val}₪ to '{result.get('title')}'. "
            f"Current progress: {result.get('current_amount')}₪ / {result.get('target_amount')}₪. Status: {result.get('status')}"
        )
        return {"status": "success", "result": result, "message": msg, "error_message": None}

    def get_details(self, user_id: int, challenge_id: Optional[int]) -> Dict[str, Any]:
        """Get a single challenge details including updates."""
        if challenge_id is None:
            return {"status": "error", "result": None, "error_message": "challenge_id is required", "error_code": "MISSING_FIELD"}

        challenge = Challenge.query.filter_by(id=challenge_id, user_id=user_id).first()
        if not challenge:
            return {"status": "error", "result": None, "error_message": "Challenge not found", "error_code": "CHALLENGE_NOT_FOUND"}

        result = challenge.to_dict(include_updates=True)
        msg = (
            f"Challenge '{result.get('title')}' details: target {result.get('target_amount')}₪, "
            f"current {result.get('current_amount')}₪, status {result.get('status')}."
        )
        return {"status": "success", "result": result, "message": msg, "error_message": None}

    def list_challenges(self, user_id: int, filter_type: str = "current") -> Dict[str, Any]:
        """List challenges for the user with optional filter: current|past|all."""
        query = Challenge.query.filter_by(user_id=user_id)
        now = datetime.utcnow()

        if filter_type == "current":
            query = query.filter((Challenge.end_date >= now) | (Challenge.end_date == None))
        elif filter_type == "past":
            query = query.filter(Challenge.end_date < now)
        # 'all' returns all

        challenges = query.order_by(Challenge.end_date.asc()).all()
        items = [c.to_dict() for c in challenges]
        count = len(items)
        msg = f"Found {count} {filter_type} challenge(s)."
        return {"status": "success", "result": items, "message": msg, "error_message": None}


# Singleton instance
challenge_manager = ChallengeManagerService()
