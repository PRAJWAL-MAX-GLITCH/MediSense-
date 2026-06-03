import os
import ast
import sys

def get_imports(directory):
    imports = set()
    for root, _, files in os.walk(directory):
        if 'venv' in root or '.venv' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), path)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for n in node.names:
                                imports.add(n.name.split('.')[0])
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                imports.add(node.module.split('.')[0])
                except Exception as e:
                    print(f"Error parsing {path}: {e}")
    return sorted(list(imports))

stdlib = set(sys.builtin_module_names) | {
    'os', 'sys', 'json', 'datetime', 're', 'logging', 'typing', 'contextlib', 'io', 'math', 'urllib', 'time', 'subprocess', 'shutil', 'pathlib'
}

ext_imports = [imp for imp in get_imports('backend') if imp not in stdlib]
print("External imports found:", ext_imports)
