"""
IndAI — AI Summary Generator
Generates human-readable security scan summaries in multiple languages.

Supports: English, Tagalog, French, Mandarin (中文), Spanish, Japanese, Korean
"""


class SummaryGenerator:
    """
    Generates intelligent, context-aware summaries of scan results.
    Supports fluent multi-language output.
    """

    SUPPORTED_LANGUAGES = {
        "en": "English",
        "tl": "Tagalog",
        "fr": "Français",
        "zh": "中文",
        "es": "Español",
        "ja": "日本語",
        "ko": "한국어",
    }

    # Severity labels per language
    _SEVERITY_LABELS = {
        "en": {"critical": "critical", "high": "high", "medium": "medium", "low": "low", "info": "informational"},
        "tl": {"critical": "kritikal", "high": "mataas", "medium": "katamtaman", "low": "mababa", "info": "pang-impormasyon"},
        "fr": {"critical": "critique", "high": "élevée", "medium": "moyenne", "low": "faible", "info": "informatif"},
        "zh": {"critical": "严重", "high": "高危", "medium": "中等", "low": "低危", "info": "信息"},
        "es": {"critical": "crítica", "high": "alta", "medium": "media", "low": "baja", "info": "informativo"},
        "ja": {"critical": "重大", "high": "高", "medium": "中", "low": "低", "info": "情報"},
        "ko": {"critical": "심각", "high": "높음", "medium": "보통", "low": "낮음", "info": "정보"},
    }

    # Templates per language
    _TEMPLATES = {
        "en": {
            "clean": "✅ Great news! Your {language} code passed the security audit with no vulnerabilities detected. The code follows secure coding practices and is safe for deployment.",
            "summary_intro": "🔍 Security scan of your {language} code found {total} {issue_word} across {categories} OWASP {cat_word}.",
            "severity_line": "— {count} {severity} severity {issue_word}",
            "top_finding": "⚠️ Most critical finding: \"{title}\" — {description}",
            "recommendation": "🛡️ Recommendation: Start by fixing the {worst_severity} severity issues first, particularly those related to {top_category}. {action_hint}",
            "action_hints": {
                "A03:2021 Injection": "Use parameterized queries and avoid concatenating user input into commands.",
                "A01:2021 Broken Access Control": "Implement proper access control checks on all endpoints.",
                "A02:2021 Cryptographic Failures": "Replace weak hashing algorithms with bcrypt or argon2.",
                "A07:2021 Auth Failures": "Enforce strong authentication with MFA and rate limiting.",
                "default": "Review the OWASP Top 10 guidelines for detailed remediation steps.",
            },
            "issue_word": ("issue", "issues"),
            "cat_word": ("category", "categories"),
        },
        "tl": {
            "clean": "✅ Magandang balita! Ang iyong {language} code ay pumasa sa security audit nang walang nakitang vulnerability. Ang code ay sumusunod sa secure coding practices at ligtas na i-deploy.",
            "summary_intro": "🔍 Ang security scan ng iyong {language} code ay nakakita ng {total} {issue_word} sa {categories} OWASP {cat_word}.",
            "severity_line": "— {count} {severity} na antas ng {issue_word}",
            "top_finding": "⚠️ Pinaka-kritikal na natuklasan: \"{title}\" — {description}",
            "recommendation": "🛡️ Rekomendasyon: Unahin mong ayusin ang mga {worst_severity} severity issues, lalo na ang may kinalaman sa {top_category}. {action_hint}",
            "action_hints": {
                "A03:2021 Injection": "Gumamit ng parameterized queries at iwasan ang pag-concatenate ng user input sa mga commands.",
                "A01:2021 Broken Access Control": "Maglagay ng tamang access control checks sa lahat ng endpoints.",
                "A02:2021 Cryptographic Failures": "Palitan ang mahihinang hashing algorithms ng bcrypt o argon2.",
                "A07:2021 Auth Failures": "Magpatupad ng malakas na authentication gamit ang MFA at rate limiting.",
                "default": "Suriin ang OWASP Top 10 guidelines para sa mga detalyadong hakbang sa pag-aayos.",
            },
            "issue_word": ("isyu", "mga isyu"),
            "cat_word": ("kategorya", "mga kategorya"),
        },
        "fr": {
            "clean": "✅ Bonne nouvelle ! Votre code {language} a passé l'audit de sécurité sans aucune vulnérabilité détectée. Le code suit les bonnes pratiques de codage sécurisé et peut être déployé en toute sécurité.",
            "summary_intro": "🔍 L'analyse de sécurité de votre code {language} a trouvé {total} {issue_word} dans {categories} {cat_word} OWASP.",
            "severity_line": "— {count} {issue_word} de sévérité {severity}",
            "top_finding": "⚠️ Découverte la plus critique : \"{title}\" — {description}",
            "recommendation": "🛡️ Recommandation : Commencez par corriger les problèmes de sévérité {worst_severity}, en particulier ceux liés à {top_category}. {action_hint}",
            "action_hints": {
                "A03:2021 Injection": "Utilisez des requêtes paramétrées et évitez de concaténer les entrées utilisateur dans les commandes.",
                "A01:2021 Broken Access Control": "Implémentez des vérifications de contrôle d'accès appropriées sur tous les endpoints.",
                "A02:2021 Cryptographic Failures": "Remplacez les algorithmes de hachage faibles par bcrypt ou argon2.",
                "A07:2021 Auth Failures": "Appliquez une authentification forte avec MFA et limitation de débit.",
                "default": "Consultez les directives OWASP Top 10 pour des étapes de remédiation détaillées.",
            },
            "issue_word": ("problème", "problèmes"),
            "cat_word": ("catégorie", "catégories"),
        },
        "zh": {
            "clean": "✅ 好消息！您的 {language} 代码通过了安全审计，未检测到任何漏洞。代码遵循安全编码实践，可以安全部署。",
            "summary_intro": "🔍 对您的 {language} 代码进行安全扫描，在 {categories} 个 OWASP {cat_word}中发现了 {total} 个{issue_word}。",
            "severity_line": "— {count} 个{severity}级别的{issue_word}",
            "top_finding": "⚠️ 最关键的发现：「{title}」— {description}",
            "recommendation": "🛡️ 建议：优先修复{worst_severity}级别的问题，特别是与 {top_category} 相关的问题。{action_hint}",
            "action_hints": {
                "A03:2021 Injection": "使用参数化查询，避免将用户输入拼接到命令中。",
                "A01:2021 Broken Access Control": "在所有端点上实施适当的访问控制检查。",
                "A02:2021 Cryptographic Failures": "将弱哈希算法替换为 bcrypt 或 argon2。",
                "A07:2021 Auth Failures": "使用 MFA 和速率限制实施强认证。",
                "default": "请参阅 OWASP Top 10 指南了解详细的修复步骤。",
            },
            "issue_word": ("问题", "问题"),
            "cat_word": ("类别", "类别"),
        },
        "es": {
            "clean": "✅ ¡Buenas noticias! Su código {language} pasó la auditoría de seguridad sin vulnerabilidades detectadas. El código sigue las mejores prácticas de codificación segura y es seguro para implementar.",
            "summary_intro": "🔍 El escaneo de seguridad de su código {language} encontró {total} {issue_word} en {categories} {cat_word} OWASP.",
            "severity_line": "— {count} {issue_word} de severidad {severity}",
            "top_finding": "⚠️ Hallazgo más crítico: \"{title}\" — {description}",
            "recommendation": "🛡️ Recomendación: Comience corrigiendo los problemas de severidad {worst_severity}, particularmente los relacionados con {top_category}. {action_hint}",
            "action_hints": {
                "A03:2021 Injection": "Use consultas parametrizadas y evite concatenar entradas de usuario en los comandos.",
                "A01:2021 Broken Access Control": "Implemente verificaciones de control de acceso adecuadas en todos los endpoints.",
                "A02:2021 Cryptographic Failures": "Reemplace los algoritmos de hash débiles con bcrypt o argon2.",
                "A07:2021 Auth Failures": "Aplique autenticación fuerte con MFA y limitación de velocidad.",
                "default": "Revise las guías OWASP Top 10 para pasos de remediación detallados.",
            },
            "issue_word": ("problema", "problemas"),
            "cat_word": ("categoría", "categorías"),
        },
        "ja": {
            "clean": "✅ 素晴らしいニュース！{language} コードはセキュリティ監査に合格し、脆弱性は検出されませんでした。コードはセキュアコーディングのベストプラクティスに従っており、安全にデプロイできます。",
            "summary_intro": "🔍 {language} コードのセキュリティスキャンにより、{categories} つの OWASP {cat_word}で {total} 件の{issue_word}が見つかりました。",
            "severity_line": "— {severity}レベルの{issue_word}が {count} 件",
            "top_finding": "⚠️ 最も重要な発見：「{title}」— {description}",
            "recommendation": "🛡️ 推奨事項：まず{worst_severity}レベルの問題を修正してください。特に {top_category} に関連する問題を優先してください。{action_hint}",
            "action_hints": {
                "A03:2021 Injection": "パラメータ化されたクエリを使用し、ユーザー入力をコマンドに結合しないでください。",
                "A01:2021 Broken Access Control": "すべてのエンドポイントに適切なアクセス制御チェックを実装してください。",
                "A02:2021 Cryptographic Failures": "弱いハッシュアルゴリズムを bcrypt または argon2 に置き換えてください。",
                "A07:2021 Auth Failures": "MFA とレート制限を使用した強力な認証を実施してください。",
                "default": "詳細な修正手順については、OWASP Top 10 ガイドラインを参照してください。",
            },
            "issue_word": ("問題", "問題"),
            "cat_word": ("カテゴリ", "カテゴリ"),
        },
        "ko": {
            "clean": "✅ 좋은 소식입니다! {language} 코드가 보안 감사를 통과했으며 취약점이 발견되지 않았습니다. 코드는 보안 코딩 모범 사례를 따르며 안전하게 배포할 수 있습니다.",
            "summary_intro": "🔍 {language} 코드의 보안 스캔에서 {categories}개의 OWASP {cat_word}에서 {total}건의 {issue_word}을(를) 발견했습니다.",
            "severity_line": "— {severity} 수준의 {issue_word} {count}건",
            "top_finding": "⚠️ 가장 심각한 발견: \"{title}\" — {description}",
            "recommendation": "🛡️ 권장 사항: {worst_severity} 수준의 문제를 먼저 해결하세요. 특히 {top_category}와(과) 관련된 문제를 우선적으로 처리하세요. {action_hint}",
            "action_hints": {
                "A03:2021 Injection": "매개변수화된 쿼리를 사용하고 사용자 입력을 명령에 연결하지 마세요.",
                "A01:2021 Broken Access Control": "모든 엔드포인트에 적절한 접근 제어 검사를 구현하세요.",
                "A02:2021 Cryptographic Failures": "약한 해싱 알고리즘을 bcrypt 또는 argon2로 교체하세요.",
                "A07:2021 Auth Failures": "MFA와 속도 제한을 사용한 강력한 인증을 시행하세요.",
                "default": "자세한 수정 단계는 OWASP Top 10 가이드라인을 참조하세요.",
            },
            "issue_word": ("문제", "문제"),
            "cat_word": ("카테고리", "카테고리"),
        },
    }

    @classmethod
    def generate(cls, findings, language_code="javascript", lang="en"):
        """
        Generate an AI-style summary from scan findings.

        Args:
            findings: List of vulnerability findings from the scanner
            language_code: The programming language that was scanned
            lang: The output language code (en, tl, fr, zh, es, ja, ko)

        Returns:
            dict: {
                'summary_text': str,
                'language': str,
                'severity_breakdown': dict,
                'risk_level': str,
            }
        """
        if lang not in cls._TEMPLATES:
            lang = "en"

        t = cls._TEMPLATES[lang]
        sev_labels = cls._SEVERITY_LABELS[lang]

        # No vulnerabilities — clean code
        if not findings:
            return {
                "summary_text": t["clean"].format(language=language_code.capitalize()),
                "language": cls.SUPPORTED_LANGUAGES.get(lang, "English"),
                "language_code": lang,
                "severity_breakdown": {},
                "risk_level": "safe",
            }

        # Count severities
        severity_counts = {}
        categories = set()
        top_finding = None
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

        for f in findings:
            sev = f.get("severity", "info")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            categories.add(f.get("owasp_category", "Unknown"))

            if top_finding is None or severity_order.get(sev, 5) < severity_order.get(top_finding.get("severity", "info"), 5):
                top_finding = f

        total = len(findings)
        num_cats = len(categories)

        # Pick issue/category word (singular vs plural)
        issue_w = t["issue_word"][0] if total == 1 else t["issue_word"][1]
        cat_w = t["cat_word"][0] if num_cats == 1 else t["cat_word"][1]

        # Build summary
        parts = []

        # Intro line
        parts.append(t["summary_intro"].format(
            language=language_code.capitalize(),
            total=total,
            issue_word=issue_w,
            categories=num_cats,
            cat_word=cat_w,
        ))

        # Severity breakdown
        for sev in ["critical", "high", "medium", "low", "info"]:
            count = severity_counts.get(sev, 0)
            if count > 0:
                sw = t["issue_word"][0] if count == 1 else t["issue_word"][1]
                parts.append(t["severity_line"].format(
                    count=count,
                    severity=sev_labels.get(sev, sev),
                    issue_word=sw,
                ))

        # Top finding
        if top_finding:
            parts.append("")
            parts.append(t["top_finding"].format(
                title=top_finding.get("title", "Unknown"),
                description=top_finding.get("description", ""),
            ))

        # Recommendation
        worst_sev = min(severity_counts.keys(), key=lambda s: severity_order.get(s, 5))
        top_cat = top_finding.get("owasp_category", "") if top_finding else ""
        action_hint = t["action_hints"].get(top_cat, t["action_hints"]["default"])

        parts.append("")
        parts.append(t["recommendation"].format(
            worst_severity=sev_labels.get(worst_sev, worst_sev),
            top_category=top_cat,
            action_hint=action_hint,
        ))

        # Risk level
        if severity_counts.get("critical", 0) > 0:
            risk = "critical"
        elif severity_counts.get("high", 0) > 0:
            risk = "high"
        elif severity_counts.get("medium", 0) > 0:
            risk = "medium"
        else:
            risk = "low"

        # ---------------------------------------------------------
        # TRUE GENERATIVE AI INTEGRATION
        # ---------------------------------------------------------
        try:
            from app.engine.ai_provider import AIProviderChain
            import logging
            
            provider_chain = AIProviderChain()
            if provider_chain.has_providers:
                # Format findings for the prompt context
                findings_text = ""
                for i, f in enumerate(findings, 1):
                    findings_text += f"{i}. [{f.get('severity', 'info').upper()}] {f.get('title', 'Unknown')} (Rule: {f.get('rule_id', 'Unknown')})\n"
                    findings_text += f"   Description: {f.get('description', 'None')}\n"
                    if f.get('code_snippet'):
                        findings_text += f"   Code snippet: `{f.get('code_snippet', '').strip()}`\n\n"
                
                lang_name = cls.SUPPORTED_LANGUAGES.get(lang, "English")
                
                # Request the executive abstract
                ai_text = provider_chain.generate_summary(findings_text, lang_name)
            else:
                # Fallback to statically templated summary
                ai_text = "\n".join(parts)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to generate true AI summary: {e}")
            ai_text = "\n".join(parts)

        return {
            "summary_text": ai_text,
            "language": cls.SUPPORTED_LANGUAGES.get(lang, "English"),
            "language_code": lang,
            "severity_breakdown": {sev_labels.get(k, k): v for k, v in severity_counts.items()},
            "risk_level": risk,
        }

    @classmethod
    def get_supported_languages(cls):
        """Return all supported output languages."""
        return [
            {"code": code, "name": name}
            for code, name in cls.SUPPORTED_LANGUAGES.items()
        ]
