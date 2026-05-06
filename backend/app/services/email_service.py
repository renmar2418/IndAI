"""
IndAI — Email Service (Gmail SMTP Provider)
Sends branded OTP verification emails using Python's smtplib and Gmail SMTP.

The HTML template is aligned to IndAI's UI/UX:
  - Deep Slate background (#020617)
  - Cyan (#00f0ff) and Purple (#a855f7) accent gradients
  - Inter font family
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service class for sending transactional emails via SMTP.
    Encapsulates email composition, template rendering, and delivery.
    """

    @staticmethod
    def send_otp_email(to_email, otp_code, purpose="register"):
        """
        Send a branded OTP verification email using Gmail SMTP.

        Args:
            to_email: Recipient email address.
            otp_code: The plain 6-digit OTP code to display.
            purpose: "register", "login", or "reset".

        Returns:
            dict with message status, None on failure.
        """
        try:
            # Get configurations
            smtp_server = current_app.config.get("MAIL_SERVER", "smtp.gmail.com")
            smtp_port = current_app.config.get("MAIL_PORT", 587)
            username = current_app.config.get("MAIL_USERNAME")
            password = current_app.config.get("MAIL_PASSWORD")
            from_email = current_app.config.get("MAIL_DEFAULT_SENDER")

            if not username or not password:
                raise ValueError("MAIL_USERNAME or MAIL_PASSWORD not configured.")

            subject = EmailService._get_subject(purpose)
            html_body = EmailService._render_otp_template(to_email, otp_code, purpose)

            # Construct the email
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = from_email
            message["To"] = to_email

            part = MIMEText(html_body, "html")
            message.attach(part)

            # Send via SMTP
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()  # Secure the connection
                server.login(username, password.replace(" ", ""))
                server.sendmail(username, to_email, message.as_string())

            logger.info(f"OTP email sent to {to_email} via Gmail SMTP (purpose={purpose})")
            return {"status": "sent", "to": to_email}

        except ValueError as ve:
            logger.error(f"Email configuration error: {ve}")
            raise

        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {e}", exc_info=True)
            return None

    @staticmethod
    def _get_subject(purpose):
        """Return the email subject based on purpose."""
        subjects = {
            "register": "Verify your IndAI account",
            "login": "Your IndAI login code",
            "reset": "Reset your IndAI password",
        }
        return subjects.get(purpose, "Your IndAI verification code")

    @staticmethod
    def _render_otp_template(to_email, otp_code, purpose):
        """
        Render the branded HTML email template.
        Fully inline CSS for maximum email client compatibility.
        """
        # Split OTP into individual digits for the styled boxes
        digits = list(str(otp_code))

        # Purpose-specific messaging
        if purpose == "register":
            heading = "Verify Your Email"
            message = "Welcome to IndAI! Use the verification code below to complete your registration."
        elif purpose == "login":
            heading = "Your Login Code"
            message = "Use the code below to sign in to your IndAI account."
        else:
            heading = "Password Reset Code"
            message = "Use the code below to reset your IndAI account password."

        digit_boxes = ""
        for d in digits:
            digit_boxes += (
                '<td style="width:44px;height:52px;background-color:#f0f9ff;'
                'border:2px solid #00c8ff;border-radius:10px;text-align:center;'
                'vertical-align:middle;font-family:\'Courier New\',monospace;'
                f'font-size:26px;font-weight:700;color:#0f172a;">{d}</td>'
            )

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{heading} - IndAI</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

    <!-- Outer wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;padding:40px 16px;">
        <tr>
            <td align="center">

                <!-- White card -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

                    <!-- Brand header bar -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#020617,#0f172a);padding:24px 32px;text-align:center;">
                            <span style="font-size:20px;font-weight:800;color:#e2e8f0;letter-spacing:-0.5px;">Ind</span><span style="font-size:20px;font-weight:900;color:#00e0ff;">AI</span>
                        </td>
                    </tr>

                    <!-- Email icon -->
                    <tr>
                        <td style="padding:32px 32px 0;text-align:center;">
                            <div style="width:56px;height:56px;margin:0 auto;background-color:#f0f9ff;border-radius:50%;line-height:56px;font-size:28px;">&#9993;</div>
                        </td>
                    </tr>

                    <!-- Heading -->
                    <tr>
                        <td style="padding:20px 32px 8px;text-align:center;font-size:22px;font-weight:700;color:#0f172a;">
                            {heading}
                        </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                        <td style="padding:0 32px 24px;text-align:center;font-size:15px;line-height:1.6;color:#475569;">
                            {message}
                        </td>
                    </tr>

                    <!-- OTP Code -->
                    <tr>
                        <td style="padding:0 32px 8px;text-align:center;">
                            <table role="presentation" cellpadding="0" cellspacing="6" border="0" style="margin:0 auto;">
                                <tr>
                                    {digit_boxes}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Expiry notice -->
                    <tr>
                        <td style="padding:12px 32px 28px;text-align:center;font-size:13px;color:#64748b;">
                            This code expires in <strong style="color:#f97316;">3 minutes</strong>. Do not share it with anyone.
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding:0 32px;">
                            <div style="height:1px;background-color:#e2e8f0;"></div>
                        </td>
                    </tr>

                    <!-- Help text -->
                    <tr>
                        <td style="padding:24px 32px 12px;text-align:center;font-size:13px;line-height:1.5;color:#94a3b8;">
                            Didn't request this code?<br>
                            You can safely ignore this email.
                        </td>
                    </tr>

                    <!-- Sent-to -->
                    <tr>
                        <td style="padding:4px 32px 28px;text-align:center;font-size:12px;color:#94a3b8;">
                            This email was sent to <strong style="color:#0f172a;">{to_email}</strong>
                        </td>
                    </tr>

                </table>

                <!-- Footer -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;">
                    <tr>
                        <td style="padding:20px 32px;text-align:center;font-size:11px;color:#94a3b8;">
                            &copy; 2026 IndAI &mdash; AI-Powered Code Security Analysis<br>
                            <a href="https://www.renmar.dev" style="color:#0ea5e9;text-decoration:none;">renmar.dev</a>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>'''
        return html
