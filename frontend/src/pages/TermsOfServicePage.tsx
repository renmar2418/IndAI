import { Link } from 'react-router-dom';

export default function TermsOfServicePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '60px 20px',
    }}>
      <div style={{
        maxWidth: '780px',
        margin: '0 auto',
        background: 'var(--bg-card)',
        padding: '48px',
        borderRadius: '16px',
        border: '1px solid var(--border-card)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
          Last updated: May 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
            <p>By accessing or using the IndAI platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. IndAI is an AI-powered code security auditing platform designed for educational and professional use.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>2. Description of Service</h2>
            <p>IndAI provides automated code vulnerability scanning, AI-powered security analysis, and code fix generation. The Service includes:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Static code analysis for multiple programming languages</li>
              <li>AI-generated vulnerability reports and remediation suggestions</li>
              <li>Code export and PDF reporting capabilities</li>
              <li>GitHub repository batch scanning</li>
              <li>Code snippet sharing functionality</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>3. User Accounts</h2>
            <p>You may create an account using email registration or third-party authentication providers (Google, Facebook). You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and current information during registration.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Submit malicious code designed to attack or compromise our infrastructure</li>
              <li>Attempt to gain unauthorized access to other users' accounts or data</li>
              <li>Abuse the scanning API through excessive automated requests</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to develop competing products</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>5. Intellectual Property</h2>
            <p>You retain all ownership rights to the code you submit for scanning. IndAI does not claim any intellectual property rights over your code. Submitted code is processed for analysis purposes only and is stored securely in your account for your reference.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>6. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. While IndAI strives for accuracy, AI-generated vulnerability analysis and code fixes may contain errors. You are solely responsible for reviewing and testing any code modifications suggested by the Service before deploying them to production environments.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>7. Limitation of Liability</h2>
            <p>IndAI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. This includes, but is not limited to, damages resulting from acting on security recommendations or applying AI-generated code fixes.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>8. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account if you violate these terms. You may delete your account at any time by contacting us or using the account settings in the platform. Upon deletion, all associated data will be permanently removed.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>9. Changes to Terms</h2>
            <p>We may update these Terms of Service from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised terms. We will notify users of significant changes via email or an in-app notification.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>10. Contact</h2>
            <p>If you have questions about these Terms, please contact us at:</p>
            <p style={{ marginTop: '8px', color: 'var(--accent-cyan)' }}>
              gombiorenmar998@gmail.com
            </p>
          </section>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--accent-cyan)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Link>
          <Link to="/privacy-policy" style={{ color: 'var(--text-secondary)', fontWeight: 500, textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
