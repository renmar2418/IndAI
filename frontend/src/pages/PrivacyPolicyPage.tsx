import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
          Last updated: May 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>1. Information We Collect</h2>
            <p>When you use IndAI, specifically when authenticating via third-party providers like Facebook or Google, we collect the following information:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Your name and display name</li>
              <li>Your email address</li>
              <li>Your profile picture (if available)</li>
            </ul>
            <p style={{ marginTop: '12px' }}>When you use email/password registration, we collect your email, username, and a securely hashed password. We never store plaintext passwords.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>2. How We Use Your Information</h2>
            <p>We use the collected information solely for:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Authentication</strong> — To verify your identity and securely log you into your account</li>
              <li><strong>Account management</strong> — To personalize your dashboard, scan history, and profile</li>
              <li><strong>Service improvement</strong> — To understand usage patterns and improve the platform</li>
              <li><strong>Communication</strong> — To notify you of important account or service updates</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>3. Information Sharing</h2>
            <p>We do <strong>not</strong> sell, trade, or otherwise transfer your personal information to outside parties. Your data is strictly used for providing the IndAI service. We do not share your submitted code with third parties. AI-powered analysis is performed through secure API calls, and your code is not stored by third-party AI providers beyond the processing window.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>4. Data Storage & Security</h2>
            <p>Your data is stored on secure cloud servers. We use industry-standard security measures including:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>HTTPS encryption for all data in transit</li>
              <li>JWT-based authentication tokens with expiration</li>
              <li>Bcrypt password hashing for credential-based accounts</li>
              <li>Role-based access control (RBAC) for administrative functions</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>5. Data Deletion</h2>
            <p>You have the right to request the deletion of your data at any time. If you wish to delete your account and all associated data (including data collected from Facebook or Google), you can:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Contact us directly at <span style={{ color: 'var(--accent-cyan)' }}>gombiorenmar998@gmail.com</span></li>
              <li>Request deletion through the admin panel (for admin-managed users)</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Upon receiving a valid deletion request, we will permanently delete your account, profile information, scan history, and all associated data within 30 days. This action is irreversible.</p>
          </section>



          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>6. Cookies & Local Storage</h2>
            <p>IndAI uses browser local storage to store your authentication token (JWT) for maintaining your login session. We do not use third-party tracking cookies. No advertising cookies are used on this platform.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>7. Children's Privacy</h2>
            <p>IndAI is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 13, we will take steps to delete that information promptly.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes. Continued use of the platform after changes are posted constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>9. Contact Us</h2>
            <p>If you have any questions, concerns, or data deletion requests, please contact us at:</p>
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
          <Link to="/terms" style={{ color: 'var(--text-secondary)', fontWeight: 500, textDecoration: 'none' }}>
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
