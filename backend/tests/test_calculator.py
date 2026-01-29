"""
Test script for calculator service
"""
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.calculator_service import calculator

def test_basic_arithmetic():
    """Test basic arithmetic operations"""
    tests = [
        ("10 + 5", 15),
        ("100 - 25", 75),
        ("12 * 5", 60),
        ("100 / 4", 25),
        ("2 ** 3", 8),
        ("17 % 5", 2),
    ]
    
    print("Testing Basic Arithmetic:")
    for expr, expected in tests:
        result = calculator.calculate(expr)
        actual = result.get("result")
        status = "✓" if actual == expected else "✗"
        print(f"  {status} {expr} = {actual} (expected {expected})")

def test_math_functions():
    """Test math functions"""
    tests = [
        ("sqrt(144)", 12),
        ("abs(-5)", 5),
        ("round(3.14159, 2)", 3.14),
    ]
    
    print("\nTesting Math Functions:")
    for expr, expected in tests:
        result = calculator.calculate(expr)
        actual = result.get("result")
        status = "✓" if abs(actual - expected) < 0.01 else "✗"
        print(f"  {status} {expr} = {actual} (expected {expected})")

def test_financial_functions():
    """Test financial functions"""
    print("\nTesting Financial Functions:")
    
    # percentage_of
    result = calculator.percentage_of(15, 100)
    print(f"  Percentage of: 15 of 100 = {result.get('result')}%")
    
    # percentage_change
    result = calculator.percentage_change(100, 150)
    print(f"  Percentage change: 100 to 150 = {result.get('result')}%")
    
    # simple_interest
    result = calculator.simple_interest(1000, 5, 2)
    print(f"  Simple interest: Principal 1000, Rate 5%, Time 2 years = {result.get('result')}")
    
    # compound_interest
    result = calculator.compound_interest(1000, 5, 2, 1)
    print(f"  Compound interest: Principal 1000, Rate 5%, Time 2 years = {result.get('result')}")

def test_error_handling():
    """Test error handling"""
    print("\nTesting Error Handling:")
    
    # Division by zero
    result = calculator.calculate("10 / 0")
    print(f"  Division by zero: {result.get('error_message')}")
    
    # Invalid expression
    result = calculator.calculate("10 +* 5")
    print(f"  Invalid syntax: {result.get('error_message')}")
    
    # Invalid percentage_of
    result = calculator.percentage_of(50, 0)
    print(f"  Percentage of zero: {result.get('error_message')}")

if __name__ == "__main__":
    try:
        test_basic_arithmetic()
        test_math_functions()
        test_financial_functions()
        test_error_handling()
        print("\n✓ All tests completed!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
