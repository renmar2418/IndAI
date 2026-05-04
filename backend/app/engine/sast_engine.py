"""
IndAI — SAST Engine (AST-Based Analysis)
Demonstrates: Strategy Pattern, Template Method

Uses Python's ast module for Python code analysis and enhanced regex
for JavaScript/other languages. Dramatically improves accuracy over
pure-regex scanning by understanding code structure.

Inspired by: GitHub Advanced Security (CodeQL), SonarQube
"""

import ast
import re
import logging
from app.engine.base_engine import BaseEngine

logger = logging.getLogger(__name__)


class SASTEngine(BaseEngine):
    """
    Static Application Security Testing engine.

    For Python code: Parses into an AST and walks the tree to find
    dangerous function calls, unsafe patterns, and taint flows.

    For other languages: Falls back to enhanced regex with context
    awareness (checks surrounding lines for sanitization).
    """

    def __init__(self):
        super().__init__(engine_type="sast", name="SAST Engine")

        # Dangerous Python function calls to detect via AST
        self._python_dangerous_calls = {
            "eval": {
                "rule_id": "SAST-PY-001",
                "severity": "critical",
                "title": "Dangerous eval() Call",
                "description": (
                    "eval() executes arbitrary Python code. If user input reaches "
                    "eval(), an attacker can execute system commands."
                ),
                "owasp": "A03:2021 - Injection",
                "fix": "# Use ast.literal_eval() for safe evaluation\nimport ast\nresult = ast.literal_eval(expression)",
            },
            "exec": {
                "rule_id": "SAST-PY-002",
                "severity": "critical",
                "title": "Dangerous exec() Call",
                "description": "exec() runs arbitrary Python statements, enabling full code execution.",
                "owasp": "A03:2021 - Injection",
                "fix": "# Avoid exec(). Use structured dispatch or safe alternatives.",
            },
            "compile": {
                "rule_id": "SAST-PY-003",
                "severity": "high",
                "title": "Dynamic Code Compilation",
                "description": "compile() creates code objects from strings, which can be executed.",
                "owasp": "A03:2021 - Injection",
                "fix": "# Avoid compile() with user input. Use safe alternatives.",
            },
            "__import__": {
                "rule_id": "SAST-PY-004",
                "severity": "high",
                "title": "Dynamic Import",
                "description": "__import__() with user-controlled module names enables arbitrary module loading.",
                "owasp": "A03:2021 - Injection",
                "fix": "# Use importlib with a whitelist of allowed modules.",
            },
        }

        # Dangerous Python module.function calls
        self._python_dangerous_attrs = {
            ("os", "system"): {
                "rule_id": "SAST-PY-010",
                "severity": "critical",
                "title": "OS Command Execution",
                "description": "os.system() executes shell commands. Use subprocess with shell=False.",
                "owasp": "A03:2021 - Injection",
                "fix": "import subprocess\nsubprocess.run(['command', 'arg'], shell=False)",
            },
            ("os", "popen"): {
                "rule_id": "SAST-PY-011",
                "severity": "critical",
                "title": "OS Command via popen",
                "description": "os.popen() opens a pipe to a shell command.",
                "owasp": "A03:2021 - Injection",
                "fix": "import subprocess\nresult = subprocess.run(['command'], capture_output=True, shell=False)",
            },
            ("subprocess", "call"): {
                "rule_id": "SAST-PY-012",
                "severity": "high",
                "title": "Subprocess Call — Check shell=False",
                "description": "subprocess.call() with shell=True is vulnerable to injection.",
                "owasp": "A03:2021 - Injection",
                "fix": "subprocess.call(['command', 'arg'], shell=False)",
            },
            ("pickle", "loads"): {
                "rule_id": "SAST-PY-013",
                "severity": "critical",
                "title": "Unsafe Pickle Deserialization",
                "description": "pickle.loads() can execute arbitrary code during deserialization.",
                "owasp": "A08:2021 - Software and Data Integrity Failures",
                "fix": "# Use json.loads() for safe deserialization\nimport json\ndata = json.loads(raw_data)",
            },
            ("yaml", "load"): {
                "rule_id": "SAST-PY-014",
                "severity": "high",
                "title": "Unsafe YAML Loading",
                "description": "yaml.load() without Loader=SafeLoader can execute arbitrary Python.",
                "owasp": "A08:2021 - Software and Data Integrity Failures",
                "fix": "import yaml\ndata = yaml.safe_load(raw_data)",
            },
        }

        # JavaScript dangerous patterns (regex-based with context)
        self._js_patterns = [
            {
                "rule_id": "SAST-JS-001",
                "pattern": re.compile(r'\beval\s*\(', re.IGNORECASE),
                "severity": "critical",
                "title": "Dangerous eval() Usage",
                "description": "eval() executes arbitrary JavaScript. Never use with user input.",
                "owasp": "A03:2021 - Injection",
                "fix": "// Use JSON.parse() for data, or Function constructor with caution",
            },
            {
                "rule_id": "SAST-JS-002",
                "pattern": re.compile(r'\.innerHTML\s*=', re.IGNORECASE),
                "severity": "high",
                "title": "Direct innerHTML Assignment",
                "description": "Setting innerHTML with unsanitized input enables XSS attacks.",
                "owasp": "A03:2021 - Injection",
                "fix": "element.textContent = userInput; // Safe alternative",
            },
            {
                "rule_id": "SAST-JS-003",
                "pattern": re.compile(r'document\.write\s*\(', re.IGNORECASE),
                "severity": "high",
                "title": "document.write() Usage",
                "description": "document.write() can inject arbitrary HTML/JS into the page.",
                "owasp": "A03:2021 - Injection",
                "fix": "// Use DOM manipulation: element.textContent or element.appendChild()",
            },
            {
                "rule_id": "SAST-JS-004",
                "pattern": re.compile(r'new\s+Function\s*\(', re.IGNORECASE),
                "severity": "critical",
                "title": "Dynamic Function Constructor",
                "description": "new Function() creates functions from strings, similar to eval().",
                "owasp": "A03:2021 - Injection",
                "fix": "// Define functions statically instead of from strings",
            },
            {
                "rule_id": "SAST-JS-005",
                "pattern": re.compile(r'child_process.*exec\s*\(', re.IGNORECASE),
                "severity": "critical",
                "title": "Command Injection via child_process",
                "description": "child_process.exec() runs shell commands. Use execFile() instead.",
                "owasp": "A03:2021 - Injection",
                "fix": "const { execFile } = require('child_process');\nexecFile('command', ['arg1'], callback);",
            },
        ]

    def scan(self, source_code: str, language: str = "javascript") -> list:
        """Run SAST analysis on the given source code."""
        findings = []

        if language and language.lower() == "python":
            findings.extend(self._scan_python_ast(source_code))
        else:
            findings.extend(self._scan_js_regex(source_code))

        return findings

    # ── Python AST Analysis ─────────────────────────

    def _scan_python_ast(self, source_code: str) -> list:
        """Parse Python code into an AST and walk for dangerous patterns."""
        findings = []
        lines = source_code.split("\n")

        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            logger.debug(f"[SAST] Python AST parse failed (line {e.lineno}), falling back to regex")
            return self._scan_python_regex_fallback(source_code)

        for node in ast.walk(tree):
            # Check direct dangerous function calls: eval(), exec(), etc.
            if isinstance(node, ast.Call):
                func_name = self._get_call_name(node)
                if func_name in self._python_dangerous_calls:
                    info = self._python_dangerous_calls[func_name]
                    line_num = getattr(node, "lineno", 0)
                    snippet = lines[line_num - 1] if 0 < line_num <= len(lines) else ""
                    findings.append(self._create_finding(
                        rule_id=info["rule_id"],
                        severity=info["severity"],
                        title=info["title"],
                        description=info["description"],
                        line_number=line_num,
                        column=getattr(node, "col_offset", 0) + 1,
                        code_snippet=snippet,
                        suggested_fix=info["fix"],
                        owasp_category=info["owasp"],
                    ))

                # Check module.function calls: os.system(), pickle.loads(), etc.
                attr_key = self._get_attr_call_key(node)
                if attr_key and attr_key in self._python_dangerous_attrs:
                    info = self._python_dangerous_attrs[attr_key]
                    line_num = getattr(node, "lineno", 0)
                    snippet = lines[line_num - 1] if 0 < line_num <= len(lines) else ""

                    # Check for shell=True in subprocess calls
                    if "subprocess" in attr_key[0]:
                        has_shell_true = any(
                            isinstance(kw.value, ast.Constant) and kw.value.value is True
                            for kw in node.keywords
                            if kw.arg == "shell"
                        )
                        if not has_shell_true:
                            continue  # shell=False is safe, skip

                    findings.append(self._create_finding(
                        rule_id=info["rule_id"],
                        severity=info["severity"],
                        title=info["title"],
                        description=info["description"],
                        line_number=line_num,
                        column=getattr(node, "col_offset", 0) + 1,
                        code_snippet=snippet,
                        suggested_fix=info["fix"],
                        owasp_category=info["owasp"],
                    ))

            # Detect SQL injection via string formatting in execute() calls
            if isinstance(node, ast.Call) and self._is_sql_execute(node):
                if self._has_string_formatting(node):
                    line_num = getattr(node, "lineno", 0)
                    snippet = lines[line_num - 1] if 0 < line_num <= len(lines) else ""
                    findings.append(self._create_finding(
                        rule_id="SAST-PY-020",
                        severity="critical",
                        title="SQL Injection via String Formatting",
                        description=(
                            "SQL query built with string formatting/concatenation. "
                            "Use parameterized queries instead."
                        ),
                        line_number=line_num,
                        column=getattr(node, "col_offset", 0) + 1,
                        code_snippet=snippet,
                        suggested_fix='cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
                        owasp_category="A03:2021 - Injection",
                    ))

        return findings

    def _get_call_name(self, node: ast.Call) -> str:
        """Extract function name from a Call node."""
        if isinstance(node.func, ast.Name):
            return node.func.id
        return ""

    def _get_attr_call_key(self, node: ast.Call):
        """Extract (module, method) tuple from an attribute call."""
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name):
                return (node.func.value.id, node.func.attr)
        return None

    def _is_sql_execute(self, node: ast.Call) -> bool:
        """Check if this is a cursor.execute() or db.execute() call."""
        if isinstance(node.func, ast.Attribute):
            return node.func.attr in ("execute", "executemany", "executescript")
        return False

    def _has_string_formatting(self, node: ast.Call) -> bool:
        """Check if the first argument uses string formatting (f-string, %, .format)."""
        if not node.args:
            return False
        first_arg = node.args[0]
        # f-string
        if isinstance(first_arg, ast.JoinedStr):
            return True
        # "..." % (...)
        if isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, ast.Mod):
            return True
        # "...".format(...)
        if isinstance(first_arg, ast.Call) and isinstance(first_arg.func, ast.Attribute):
            if first_arg.func.attr == "format":
                return True
        # String concatenation with +
        if isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, ast.Add):
            return True
        return False

    def _scan_python_regex_fallback(self, source_code: str) -> list:
        """Regex fallback when AST parsing fails."""
        findings = []
        lines = source_code.split("\n")
        patterns = [
            (re.compile(r'\beval\s*\('), "SAST-PY-001", "critical", "Dangerous eval() Call"),
            (re.compile(r'\bexec\s*\('), "SAST-PY-002", "critical", "Dangerous exec() Call"),
            (re.compile(r'\bos\.system\s*\('), "SAST-PY-010", "critical", "OS Command Execution"),
            (re.compile(r'\bpickle\.loads?\s*\('), "SAST-PY-013", "critical", "Unsafe Pickle Deserialization"),
        ]
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            for pat, rule_id, sev, title in patterns:
                if pat.search(line):
                    findings.append(self._create_finding(
                        rule_id=rule_id, severity=sev, title=title,
                        description=f"Detected {title.lower()} (regex fallback).",
                        line_number=i, column=1, code_snippet=line,
                        suggested_fix="# See SAST rule documentation for safe alternatives",
                        owasp_category="A03:2021 - Injection",
                    ))
        return findings

    # ── JavaScript Regex Analysis ───────────────────

    def _scan_js_regex(self, source_code: str) -> list:
        """Enhanced regex scanning for JavaScript with context awareness."""
        findings = []
        lines = source_code.split("\n")

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*"):
                continue

            for rule in self._js_patterns:
                match = rule["pattern"].search(line)
                if match:
                    # Context awareness: check if the next line has sanitization
                    if self._has_sanitization_context(lines, i):
                        continue

                    findings.append(self._create_finding(
                        rule_id=rule["rule_id"],
                        severity=rule["severity"],
                        title=rule["title"],
                        description=rule["description"],
                        line_number=i,
                        column=match.start() + 1,
                        code_snippet=line,
                        suggested_fix=rule["fix"],
                        owasp_category=rule["owasp"],
                    ))

        return findings

    def _has_sanitization_context(self, lines: list, line_num: int) -> bool:
        """Check surrounding lines for sanitization patterns."""
        sanitizers = [
            "sanitize", "escape", "encode", "DOMPurify",
            "validator", "htmlspecialchars", "strip_tags",
        ]
        start = max(0, line_num - 3)
        end = min(len(lines), line_num + 2)
        context = " ".join(lines[start:end]).lower()
        return any(s in context for s in sanitizers)
