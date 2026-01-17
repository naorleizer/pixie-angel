"""
Calculator Service - Safe arithmetic and financial calculations
Uses numexpr for safe expression evaluation and extended math operations
"""
import math
import numexpr as ne
from typing import Union, Dict, Any
import json


class CalculatorService:
    """
    Provides safe mathematical and financial calculations using numexpr.
    Supports basic arithmetic, financial functions, and mathematical operations.
    """
    
    def __init__(self):
        """Initialize calculator service."""
        self.max_expression_length = 500
    
    def calculate(self, expression: str) -> Dict[str, Any]:
        """
        Evaluate a mathematical expression safely using numexpr.
        
        Args:
            expression: Mathematical expression to evaluate
                       Examples: "10 + 5", "100 * 0.15", "sqrt(144)"
        
        Returns:
            {"status": "success" | "error", "result": value, "error_message": str}
        """
        try:
            # Validate expression length
            if len(expression) > self.max_expression_length:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": f"Expression too long (max {self.max_expression_length} characters)"
                }
            
            # Clean expression
            expression = expression.strip()
            
            # Build safe variable dictionary with math functions
            safe_dict = self._build_safe_dict()
            
            # Evaluate using numexpr for safety
            result = ne.evaluate(expression, local_dict=safe_dict)
            
            # Convert numpy types to Python types
            if hasattr(result, 'item'):
                result = result.item()
            
            # Round to avoid floating point precision issues
            if isinstance(result, float):
                result = round(result, 10)
            
            return {
                "status": "success",
                "result": result,
                "error_message": None
            }
        
        except ZeroDivisionError:
            return {
                "status": "error",
                "result": None,
                "error_message": "Division by zero error"
            }
        except ValueError as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Invalid value: {str(e)}"
            }
        except SyntaxError as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Invalid expression syntax: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Calculation error: {str(e)}"
            }
    
    def percentage_of(self, part: Union[int, float], whole: Union[int, float]) -> Dict[str, Any]:
        """
        Calculate what percentage part is of whole.
        
        Args:
            part: The part amount
            whole: The whole amount
        
        Returns:
            {"status": "success" | "error", "result": percentage, "error_message": str}
        """
        try:
            if whole == 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Cannot calculate percentage: whole cannot be zero"
                }
            
            result = (part / whole) * 100
            result = round(result, 2)
            
            return {
                "status": "success",
                "result": result,
                "error_message": None
            }
        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Percentage calculation error: {str(e)}"
            }
    
    def percentage_change(self, original: Union[int, float], new: Union[int, float]) -> Dict[str, Any]:
        """
        Calculate the percentage change from original to new value.
        
        Args:
            original: Original value
            new: New value
        
        Returns:
            {"status": "success" | "error", "result": percentage_change, "error_message": str}
        """
        try:
            if original == 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Cannot calculate percentage change: original value cannot be zero"
                }
            
            result = ((new - original) / original) * 100
            result = round(result, 2)
            
            return {
                "status": "success",
                "result": result,
                "error_message": None
            }
        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Percentage change calculation error: {str(e)}"
            }
    
    def compound_interest(
        self,
        principal: Union[int, float],
        rate: Union[int, float],
        time: Union[int, float],
        frequency: int = 1
    ) -> Dict[str, Any]:
        """
        Calculate compound interest.
        Formula: A = P(1 + r/n)^(nt)
        
        Args:
            principal: Initial principal amount
            rate: Annual interest rate (as percentage, e.g., 5 for 5%)
            time: Time period in years
            frequency: Compounding frequency per year (default 1 = annual)
                      1=annual, 2=semi-annual, 4=quarterly, 12=monthly
        
        Returns:
            {"status": "success" | "error", "result": final_amount, "error_message": str}
        """
        try:
            if principal <= 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Principal must be positive"
                }
            
            if rate < 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Interest rate cannot be negative"
                }
            
            if time <= 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Time period must be positive"
                }
            
            # Convert percentage to decimal
            r = rate / 100
            
            # Apply compound interest formula
            amount = principal * ((1 + r / frequency) ** (frequency * time))
            amount = round(amount, 2)
            
            return {
                "status": "success",
                "result": amount,
                "error_message": None
            }
        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Compound interest calculation error: {str(e)}"
            }
    
    def simple_interest(
        self,
        principal: Union[int, float],
        rate: Union[int, float],
        time: Union[int, float]
    ) -> Dict[str, Any]:
        """
        Calculate simple interest.
        Formula: I = P * r * t, Final Amount = P + I
        
        Args:
            principal: Initial principal amount
            rate: Annual interest rate (as percentage, e.g., 5 for 5%)
            time: Time period in years
        
        Returns:
            {"status": "success" | "error", "result": final_amount, "error_message": str}
        """
        try:
            if principal <= 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Principal must be positive"
                }
            
            if rate < 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Interest rate cannot be negative"
                }
            
            if time <= 0:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": "Time period must be positive"
                }
            
            # Convert percentage to decimal
            r = rate / 100
            
            # Calculate interest and final amount
            interest = principal * r * time
            amount = principal + interest
            amount = round(amount, 2)
            
            return {
                "status": "success",
                "result": amount,
                "error_message": None
            }
        except Exception as e:
            return {
                "status": "error",
                "result": None,
                "error_message": f"Simple interest calculation error: {str(e)}"
            }
    
    def _build_safe_dict(self) -> Dict[str, Any]:
        """
        Build a safe dictionary of allowed variables and functions for numexpr evaluation.
        
        Returns:
            Dictionary with safe math functions and constants
        """
        return {
            # Math functions
            'sqrt': math.sqrt,
            'abs': abs,
            'sin': math.sin,
            'cos': math.cos,
            'tan': math.tan,
            'log': math.log,
            'log10': math.log10,
            'exp': math.exp,
            'ceil': math.ceil,
            'floor': math.floor,
            'round': round,
            'min': min,
            'max': max,
            'pow': pow,
            # Constants
            'pi': math.pi,
            'e': math.e,
        }


# Singleton instance
calculator = CalculatorService()
