"""
Tests for challenge_manager tool: list, create, add_update, get_details, and error handling.
Note: These tests focus on tool registry and service behavior, not external LLM calls.
"""
import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.llm_service import TOOLS_REGISTRY, execute_tool
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.chat import ChatSession


def setup_module(module):
    """Initialize app context and a test user/session."""
    global app, ctx, user, session
    app = create_app()
    ctx = app.app_context()
    ctx.push()

    # Ensure DB is ready (uses configured SQLite instance)
    db.create_all()

    # Create a user and chat session
    user = User(username="tester", email="test@example.com")
    db.session.add(user)
    db.session.commit()

    session = ChatSession(user_id=user.id, title="Tool Test")
    db.session.add(session)
    db.session.commit()


def teardown_module(module):
    db.session.remove()
    db.drop_all()
    ctx.pop()


def test_registry_has_challenge_manager():
    assert "challenge_manager" in TOOLS_REGISTRY
    tool = TOOLS_REGISTRY["challenge_manager"]
    assert tool["function"]["name"] == "challenge_manager"
    assert "parameters" in tool["function"]


def test_list_empty():
    # Execute list with empty challenges
    result = execute_tool("challenge_manager", {"action": "list", "filter": "all"}, session_id=session.id)
    assert result["status"] == "success"
    assert isinstance(result["result"], list)
    assert len(result["result"]) == 0


def test_create_challenge_and_get_details():
    # Create
    create_res = execute_tool(
        "challenge_manager",
        {
            "action": "create",
            "title": "No-Spend Weekend",
            "target_amount": 200,
            "end_date": "2030-01-01",
            "description": "Avoid eating out; use groceries",
            "type": "spending_limit",
            "color": "rose"
        },
        session_id=session.id
    )
    assert create_res["status"] == "success"
    challenge = create_res["result"]
    assert challenge["title"] == "No-Spend Weekend"
    challenge_id = challenge["id"]

    # Get details
    details_res = execute_tool(
        "challenge_manager",
        {"action": "get_details", "challenge_id": challenge_id},
        session_id=session.id
    )
    assert details_res["status"] == "success"
    det = details_res["result"]
    assert det["id"] == challenge_id
    assert isinstance(det.get("updates", []), list)


def test_add_update_positive_and_negative():
    # Ensure at least one challenge
    list_res = execute_tool("challenge_manager", {"action": "list", "filter": "all"}, session_id=session.id)
    assert list_res["status"] == "success"
    items = list_res["result"]
    assert len(items) >= 1
    challenge_id = items[0]["id"]

    # Add savings (+)
    up1 = execute_tool(
        "challenge_manager",
        {"action": "add_update", "challenge_id": challenge_id, "amount": 50, "description": "Saved by cooking at home"},
        session_id=session.id
    )
    assert up1["status"] == "success"
    # Add spending (-)
    up2 = execute_tool(
        "challenge_manager",
        {"action": "add_update", "challenge_id": challenge_id, "amount": -20, "description": "Coffee out"},
        session_id=session.id
    )
    assert up2["status"] == "success"

    # Verify amounts moved (current_amount field present)
    det = up2["result"]
    assert "current_amount" in det


def test_invalid_challenge_id_error():
    res = execute_tool(
        "challenge_manager",
        {"action": "add_update", "challenge_id": 999999, "amount": 10, "description": "Test"},
        session_id=session.id
    )
    assert res["status"] == "error"
    assert res.get("error_code") == "CHALLENGE_NOT_FOUND"


if __name__ == '__main__':
    try:
        print("\n" + "█" * 60)
        print("CHALLENGE MANAGER TOOL TESTS")
        print("█" * 60 + "\n")

        setup_module(None)
        test_registry_has_challenge_manager()
        test_list_empty()
        test_create_challenge_and_get_details()
        test_add_update_positive_and_negative()
        test_invalid_challenge_id_error()
        teardown_module(None)

        print("\n✓ ALL CHALLENGE MANAGER TESTS PASSED!\n")
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
