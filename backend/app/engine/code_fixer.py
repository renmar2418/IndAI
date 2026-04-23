"""
IndAI — Code Fixer
Demonstrates: Single Responsibility Principle

Applies security fixes to source code based on vulnerability findings.
"""


class CodeFixer:
    """
    Applies sequential fixes to source code.

    Handles line offset adjustments when fixes add or remove lines,
    ensuring all subsequent fixes reference correct line numbers.
    """

    def apply_fixes(self, source_code, findings):
        """
        Apply all suggested fixes to the source code.

        Args:
            source_code (str): Original source code.
            findings (list[dict]): List of vulnerability findings with suggested_fix.

        Returns:
            str: The corrected source code with all fixes applied.
        """
        if not findings:
            return source_code

        lines = source_code.split('\n')

        # Sort findings by line number in reverse order
        # This prevents line offset issues when inserting/replacing lines
        sorted_findings = sorted(
            findings,
            key=lambda f: f.get('line_number', 0),
            reverse=True
        )

        for finding in sorted_findings:
            line_num = finding.get('line_number', 0)
            suggested_fix = finding.get('suggested_fix', '')
            code_snippet = finding.get('code_snippet', '')

            if not suggested_fix or line_num <= 0 or line_num > len(lines):
                continue

            original_line = lines[line_num - 1]
            indentation = self._get_indentation(original_line)

            # Apply the fix with proper indentation
            fixed_lines = self._indent_fix(suggested_fix, indentation)

            # Replace the original line with the fix
            lines[line_num - 1] = fixed_lines

        return '\n'.join(lines)

    def _get_indentation(self, line):
        """Extract the leading whitespace from a line."""
        stripped = line.lstrip()
        return line[:len(line) - len(stripped)]

    def _indent_fix(self, fix, indentation):
        """Apply consistent indentation to a multi-line fix."""
        fix_lines = fix.split('\n')
        indented_lines = []
        for j, fix_line in enumerate(fix_lines):
            if j == 0:
                indented_lines.append(indentation + fix_line)
            else:
                indented_lines.append(indentation + fix_line)
        return '\n'.join(indented_lines)
