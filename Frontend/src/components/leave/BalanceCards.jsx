import { formatNumber } from '../../lib/format';

const TONES = ['brand', 'info', 'violet', 'success'];

export default function BalanceCards({ balances = [], compact = false }) {
  return (
    <div className={`balance-grid ${compact ? 'balance-grid-compact' : ''}`}>
      {balances.map((balance, index) => {
        const quota = balance.quota;
        const used = Number(balance.used) || 0;
        const pending = Number(balance.pending) || 0;
        const percent = balance.unlimited || !quota ? 100 : Math.min(100, (used / quota) * 100);
        return (
          <div className={`balance-card balance-${TONES[index % TONES.length]}`} key={balance.type}>
            <div className="balance-top">
              <span>{balance.label}</span>
              <span className={`badge badge-${balance.unlimited ? 'success' : 'neutral'}`}>
                {balance.unlimited ? 'Unlimited' : `${formatNumber(balance.available)} left`}
              </span>
            </div>
            <div className="balance-value">
              {balance.unlimited ? '—' : formatNumber(balance.available)}
              <small>{balance.unlimited ? ' no annual cap' : ` / ${formatNumber(quota)} days`}</small>
            </div>
            {!balance.unlimited && (
              <div className="balance-bar" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
            )}
            <div className="balance-meta">
              <span>{formatNumber(used)} used</span>
              <span>{pending ? `${formatNumber(pending)} pending` : 'No pending'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
