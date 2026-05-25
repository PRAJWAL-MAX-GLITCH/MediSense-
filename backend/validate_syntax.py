#!/usr/bin/env python3
"""
Quick syntax validation for response.py
Tests if the file has valid Python syntax
"""

import ast
import sys

def validate_python_file(filepath):
    """Validate Python file syntax"""
    print(f"Validating: {filepath}")
    print("-" * 60)
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
        
        # Try to parse the file
        ast.parse(code)
        print("✅ SYNTAX VALID")
        print(f"   File size: {len(code):,} bytes")
        print(f"   Lines: {len(code.splitlines())}")
        
        # Count functions
        tree = ast.parse(code)
        functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
        print(f"   Functions: {len(functions)}")
        print(f"   Function names: {', '.join(functions[:5])}{'...' if len(functions) > 5 else ''}")
        
        # Check for class definitions
        classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
        if classes:
            print(f"   Classes: {len(classes)}")
        
        # Check imports
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports.append(f"from {node.module}")
        
        print(f"   Imports: {len(set(imports))}")
        
        return True
        
    except SyntaxError as e:
        print(f"❌ SYNTAX ERROR at line {e.lineno}:")
        print(f"   {e.msg}")
        print(f"   {e.text}")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    filepath = "rag/response.py"
    
    print("=" * 60)
    print("🧪 RESPONSE.PY VALIDATION")
    print("=" * 60)
    print()
    
    if validate_python_file(filepath):
        print()
        print("=" * 60)
        print("✅ FILE IS VALID AND READY TO USE")
        print("=" * 60)
        sys.exit(0)
    else:
        print()
        print("=" * 60)
        print("❌ FILE HAS ERRORS - FIX BEFORE USE")
        print("=" * 60)
        sys.exit(1)
