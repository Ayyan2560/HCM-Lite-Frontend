import { Clock3, ShieldCheck, WalletCards } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock3,
    title: 'Time, without guesswork',
    text: 'Attendance is classified by one shared engine, from check-in to payroll.',
  },
  {
    icon: ShieldCheck,
    title: 'Scoped by role',
    text: 'Employees see their own records. HR and admins see the operating picture.',
  },
  {
    icon: WalletCards,
    title: 'Payroll with a paper trail',
    text: 'Drafts, finalization and payslips follow the backend rules exactly.',
  },
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <div className="auth-logo">
            <span className="brand-mark" aria-hidden="true"><span>H</span><i /></span>
            <span>
              <strong>HCM Lite</strong>
              <small>People operations</small>
            </span>
          </div>
          <p className="auth-kicker">Human capital, clearly managed</p>
          <h1 className="auth-headline">The calm workspace for your people.</h1>
          <p className="auth-lede">
            Attendance, leave, payroll and employee records in one connected system — built
            around the permissions and rules your team already works with.
          </p>
          <div className="auth-features">
            {FEATURES.map((feature) => (
              <div className="auth-feature" key={feature.title}>
                <span className="auth-feature-icon"><feature.icon size={15} /></span>
                <span>
                  <strong>{feature.title}</strong>
                  <span>{feature.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-aside-footer">
          <ShieldCheck size={13} />
          <span>Cookie-based sessions · Role-scoped access · Audited actions</span>
        </div>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}
