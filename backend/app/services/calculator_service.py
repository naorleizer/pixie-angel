"""
Calculator Service - Safe arithmetic and financial calculations
Uses numexpr for safe expression evaluation and AST for whitelisted function calls
"""
import math
import ast
import numexpr as ne
from typing import Union, Dict, Any

class CalculatorService:
    """
    Provides safe mathematical and financial calculations.
    """
    
    def __init__(self):
        """Initialize calculator service."""
        self.max_expression_length = 500
        # Whitelist of allowed financial methods mapped to their implementations
        self.financial_functions = {
            'compound_interest': self.compound_interest,
            'simple_interest': self.simple_interest,
            'percentage_of': self.percentage_of,
            'percentage_change': self.percentage_change
        }
    
    def calculate(self, expression: str) -> Dict[str, Any]:
        """
        Evaluate a mathematical expression.
        Handles both standard math (via numexpr) and financial function calls (via AST).
        
        Args:
            expression: Mathematical expression (e.g., "10 + 5", "compound_interest(1000, 5, 2)")
        """
        try:
            # Validate expression length
            if len(expression) > self.max_expression_length:
                return {
                    "status": "error",
                    "result": None,
                    "error_message": f"Expression too long (max {self.max_expression_length} characters)"
                }
            
            expression = expression.strip()
            
            # Log the expression for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Calculator evaluating expression: {expression}")
            
            # 1. Try to parse as a financial function call first
            # We use AST to safely inspect the call without executing it blindly
            try:
                tree = ast.parse(expression, mode='eval')
                if isinstance(tree.body, ast.Call) and isinstance(tree.body.func, ast.Name):
                    func_name = tree.body.func.id
                    if func_name in self.financial_functions:
                        return self._execute_financial_function(tree.body)
            except SyntaxError:
                pass  # Not a valid function call, fall through to numexpr logic

            # 2. Fall back to standard math evaluation using numexpr
            safe_dict = self._build_safe_dict()
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
            return {"status": "error", "result": None, "error_message": "Division by zero error"}
        except ValueError as e:
            return {"status": "error", "result": None, "error_message": f"Invalid value: {str(e)}"}
        except Exception as e:
            return {"status": "error", "result": None, "error_message": f"Calculation error: {str(e)}"}

    def _execute_financial_function(self, call_node: ast.Call) -> Dict[str, Any]:
        """Helper to safely execute a whitelisted function call from an AST node."""
        func_name = call_node.func.id
        func = self.financial_functions[func_name]
        
        # Extract positional arguments
        args = []
        for arg in call_node.args:
            if isinstance(arg, (ast.Num, ast.Constant)): # Handle python < 3.8 and >= 3.8
                args.append(arg.n if hasattr(arg, 'n') else arg.value)
            elif isinstance(arg, ast.UnaryOp) and isinstance(arg.op, ast.USub) and isinstance(arg.operand, (ast.Num, ast.Constant)):
                # Handle negative numbers
                val = arg.operand.n if hasattr(arg.operand, 'n') else arg.operand.value
                args.append(-val)
            else:
                raise ValueError(f"Arguments for {func_name} must be numbers")
        
        # Extract keyword arguments
        kwargs = {}
        for keyword in call_node.keywords:
            if isinstance(keyword.value, (ast.Num, ast.Constant)):
                val = keyword.value.n if hasattr(keyword.value, 'n') else keyword.value.value
                kwargs[keyword.arg] = val
            elif isinstance(keyword.value, ast.UnaryOp) and isinstance(keyword.value.op, ast.USub) and isinstance(keyword.value.operand, (ast.Num, ast.Constant)):
                val = keyword.value.operand.n if hasattr(keyword.value.operand, 'n') else keyword.value.operand.value
                kwargs[keyword.arg] = -val
            else:
                raise ValueError(f"Arguments for {func_name} must be numbers")

        # Execute
        try:
            return func(*args, **kwargs)
        except TypeError as e:
            import logging
            logger = logging.getLogger(__name__)
            arg_str = ', '.join(map(str, args))
            kwarg_str = ', '.join(f"{k}={v}" for k, v in kwargs.items())
            call_str = f"{func_name}({', '.join(filter(None, [arg_str, kwarg_str]))})"
            logger.error(f"Function {call_str} failed: {str(e)}")
            return {
                "status": "error", 
                "result": None, 
                "error_message": f"{call_str} failed: {str(e)}"
            }

    def percentage_of(self, part: Union[int, float], whole: Union[int, float]) -> Dict[str, Any]:
        """Calculate what percentage part is of whole."""
        try:
            if whole == 0:
                return {"status": "error", "result": None, "error_message": "Whole cannot be zero"}
            result = round((part / whole) * 100, 2)
            return {"status": "success", "result": result, "error_message": None}
        except Exception as e:
            return {"status": "error", "result": None, "error_message": str(e)}
    
    def percentage_change(self, original: Union[int, float], new: Union[int, float]) -> Dict[str, Any]:
        """Calculate the percentage change from original to new value."""
        try:
            if original == 0:
                return {"status": "error", "result": None, "error_message": "Original value cannot be zero"}
            result = round(((new - original) / original) * 100, 2)
            return {"status": "success", "result": result, "error_message": None}
        except Exception as e:
            return {"status": "error", "result": None, "error_message": str(e)}
    
    def compound_interest(self, principal: Union[int, float], rate: Union[int, float], time: Union[int, float], frequency: int = 1) -> Dict[str, Any]:
        """
        Calculate compound interest.
        Args: rate (percentage, e.g. 5 for 5%)
        """
        try:
            if principal <= 0 or rate < 0 or time <= 0:
                return {"status": "error", "result": None, "error_message": "Invalid input values (must be positive)"}
            
            amount = principal * ((1 + (rate / 100) / frequency) ** (frequency * time))
            return {"status": "success", "result": round(amount, 2), "error_message": None}
        except Exception as e:
            return {"status": "error", "result": None, "error_message": str(e)}
    
    def simple_interest(self, principal: Union[int, float], rate: Union[int, float], time: Union[int, float]) -> Dict[str, Any]:
        """Calculate simple interest. Args: rate (percentage, e.g. 5 for 5%)"""
        try:
            if principal <= 0 or rate < 0 or time <= 0:
                return {"status": "error", "result": None, "error_message": "Invalid input values (must be positive)"}
            
            amount = principal + (principal * (rate / 100) * time)
            return {"status": "success", "result": round(amount, 2), "error_message": None}
        except Exception as e:
            return {"status": "error", "result": None, "error_message": str(e)}
    
    def _build_safe_dict(self) -> Dict[str, Any]:
        """Build a safe dictionary for numexpr evaluation."""
        return {
            'sqrt': math.sqrt, 'abs': abs, 'sin': math.sin, 'cos': math.cos,
            'tan': math.tan, 'log': math.log, 'log10': math.log10, 'exp': math.exp,
            'ceil': math.ceil, 'floor': math.floor, 'round': round,
            'min': min, 'max': max, 'pow': pow, 'pi': math.pi, 'e': math.e,
        }

# Singleton instance
calculator = CalculatorService()