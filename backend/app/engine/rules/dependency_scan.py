"""
Rule: Dependency Vulnerability Scan
OWASP A06:2021 — Vulnerable and Outdated Components
Severity: High

Detects known-vulnerable libraries in package.json or requirements.txt
by querying the OSV.dev API (free, no key required, maintained by Google).
"""

import re
import logging
import requests
from app.engine.security_rule import SecurityRule

logger = logging.getLogger(__name__)

# Timeout for external API calls (seconds)
OSV_API_TIMEOUT = 5
OSV_API_URL = "https://api.osv.dev/v1/query"


class DependencyScanRule(SecurityRule):
    """Detects known-vulnerable dependencies in manifest files."""

    def __init__(self):
        super().__init__()
        self._rule_id = "INDAI-020"
        self._title = "Vulnerable Dependency Detected"
        self._description = (
            "A dependency in your project has known security vulnerabilities. "
            "Outdated or vulnerable packages are a major attack vector (OWASP A06)."
        )
        self._severity = "high"
        self._owasp_category = "A06:2021 - Vulnerable and Outdated Components"
        self._supported_languages = ["all"]

    def check(self, source_code, lines):
        """Detect manifest files and query OSV for vulnerabilities."""
        findings = []

        # Detect if the code is a package.json
        npm_packages = self._parse_npm(source_code)
        if npm_packages:
            findings.extend(self._query_osv_batch(npm_packages, "npm", lines))
            return findings

        # Detect if the code is a requirements.txt
        pip_packages = self._parse_pip(source_code, lines)
        if pip_packages:
            findings.extend(self._query_osv_batch(pip_packages, "PyPI", lines))
            return findings

        return findings

    def _parse_npm(self, source_code):
        """Parse package names and versions from package.json content."""
        packages = []
        # Check if this looks like a package.json
        if '"dependencies"' not in source_code and '"devDependencies"' not in source_code:
            return packages

        # Match "package-name": "^1.2.3" or "~1.2.3" or "1.2.3"
        pattern = re.compile(
            r'"([a-zA-Z0-9@/._-]+)"\s*:\s*"[\^~]?(\d+\.\d+\.\d+[^"]*)"'
        )
        for match in pattern.finditer(source_code):
            name = match.group(1)
            version = match.group(2)
            # Skip meta fields
            if name in ("name", "version", "description", "main", "license", "scripts"):
                continue
            packages.append({"name": name, "version": version, "pos": match.start()})

        return packages

    def _parse_pip(self, source_code, lines):
        """Parse package names and versions from requirements.txt content."""
        packages = []
        # Heuristic: at least 2 lines must match 'package==version' or 'package>=version'
        pip_pattern = re.compile(r'^([a-zA-Z0-9_.-]+)\s*[=<>!~]=+\s*(\d+[\d.]*\S*)', re.MULTILINE)
        matches = pip_pattern.findall(source_code)
        if len(matches) < 2:
            return packages

        for match in pip_pattern.finditer(source_code):
            name = match.group(1)
            version = match.group(2)
            packages.append({"name": name, "version": version, "pos": match.start()})

        return packages

    def _query_osv_batch(self, packages, ecosystem, lines):
        """Query OSV.dev API for known vulnerabilities."""
        findings = []

        for pkg in packages:
            try:
                payload = {
                    "version": pkg["version"],
                    "package": {
                        "name": pkg["name"],
                        "ecosystem": ecosystem,
                    }
                }
                resp = requests.post(OSV_API_URL, json=payload, timeout=OSV_API_TIMEOUT)

                if resp.status_code == 200:
                    data = resp.json()
                    vulns = data.get("vulns", [])
                    if vulns:
                        # Find the line number where this package appears
                        line_num = self._find_line_number(pkg["name"], lines)
                        vuln_ids = [v.get("id", "Unknown") for v in vulns[:3]]
                        severity = self._get_worst_severity(vulns)

                        findings.append(
                            self._create_finding(
                                line_number=line_num,
                                column=1,
                                code_snippet=f'{pkg["name"]}=={pkg["version"]}' if ecosystem == "PyPI"
                                             else f'"{pkg["name"]}": "{pkg["version"]}"',
                                suggested_fix=self.get_fix(f'{pkg["name"]}=={pkg["version"]}'),
                                description=(
                                    f'{pkg["name"]}@{pkg["version"]} has {len(vulns)} known '
                                    f'vulnerabilit{"y" if len(vulns) == 1 else "ies"}: '
                                    f'{", ".join(vuln_ids)}. Update to the latest secure version.'
                                ),
                            )
                        )
                        # Override severity based on actual CVE data
                        if findings:
                            findings[-1]["severity"] = severity

            except requests.exceptions.Timeout:
                logger.warning(f"OSV API timeout for {pkg['name']}")
            except requests.exceptions.ConnectionError:
                logger.warning(f"OSV API unreachable for {pkg['name']}")
            except Exception as e:
                logger.warning(f"OSV query failed for {pkg['name']}: {e}")

        return findings

    def _find_line_number(self, package_name, lines):
        """Find the line number where a package name appears."""
        for i, line in enumerate(lines, 1):
            if package_name in line:
                return i
        return 1

    def _get_worst_severity(self, vulns):
        """Extract the worst severity from OSV vulnerability data."""
        severity_map = {"CRITICAL": "critical", "HIGH": "high", "MODERATE": "medium", "LOW": "low"}
        worst = "medium"  # Default if no severity data
        worst_order = 2

        for vuln in vulns:
            for sev_entry in vuln.get("severity", []):
                score_str = sev_entry.get("score", "")
                # CVSS score based
                try:
                    score = float(score_str.split("/")[0]) if "/" in str(score_str) else float(score_str)
                    if score >= 9.0:
                        return "critical"
                    elif score >= 7.0 and worst_order > 1:
                        worst = "high"
                        worst_order = 1
                    elif score >= 4.0 and worst_order > 2:
                        worst = "medium"
                        worst_order = 2
                except (ValueError, TypeError):
                    pass

            # Check database_specific severity
            db_severity = vuln.get("database_specific", {}).get("severity", "")
            if db_severity.upper() in severity_map:
                mapped = severity_map[db_severity.upper()]
                order = {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(mapped, 4)
                if order < worst_order:
                    worst = mapped
                    worst_order = order

        return worst

    def get_fix(self, code_snippet):
        return (
            "# SECURITY: Update this dependency to the latest secure version\n"
            "# Run: npm update <package> (for npm)\n"
            "# Run: pip install --upgrade <package> (for pip)\n"
            "# Check https://osv.dev for vulnerability details"
        )
