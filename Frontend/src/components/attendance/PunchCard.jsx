import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import {
  formatDateLong, formatDuration, formatTime, todayKey,
} from '../../lib/format';

function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

const STATUS_COPY = {
  present: 'Checked in',
  late: 'Checked in late',
  half_day: 'Half day recorded',
  missing_checkout: 'Missing check-out',
};

export default function PunchCard({ data, organization, onCheckIn, onCheckOut, busy = false }) {
  const now = useLiveTime();
  const record = data?.today?.record || data?.record || null;
  const date = data?.today?.date || todayKey(organization?.timezone);
  const status = record?.status;
  const hasIn = Boolean(record?.checkIn);
  const hasOut = Boolean(record?.checkOut);
  const open = record?.open ?? (hasIn && !hasOut);

  const clock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: organization?.timezone || undefined,
  }).format(now);

  return (
    <div className="punch-card">
      <div className="punch-top">
        <span className="punch-label">My day</span>
        <span className="punch-date">{formatDateLong(date)}</span>
      </div>
      <div className="punch-time">{clock}</div>
      <div className="punch-status">
        <span className={`punch-dot ${!open ? 'is-off' : status === 'late' ? 'is-late' : ''}`} />
        {hasOut ? 'Day complete' : open ? (STATUS_COPY[status] || 'Currently checked in') : 'Not checked in yet'}
        {record?.lateMinutes > 0 && open ? ` · ${record.lateMinutes} min late` : ''}
      </div>

      <div className="punch-meta">
        <div>
          <span>Check in</span>
          <strong>{hasIn ? formatTime(record.checkIn) : '—'}</strong>
        </div>
        <div>
          <span>Check out</span>
          <strong>{hasOut ? formatTime(record.checkOut) : '—'}</strong>
        </div>
        <div>
          <span>Worked</span>
          <strong>{record?.workedMinutes ? formatDuration(record.workedMinutes) : '—'}</strong>
        </div>
      </div>

      <div className="punch-actions">
        <button type="button" className="btn btn-in" onClick={onCheckIn} disabled={busy || hasIn}>
          <LogIn size={15} /> {hasIn ? 'Checked in' : busy ? 'Checking in…' : 'Check in'}
        </button>
        <button type="button" className="btn btn-out" onClick={onCheckOut} disabled={busy || !open || hasOut}>
          <LogOut size={15} /> {hasOut ? 'Checked out' : busy ? 'Please wait…' : 'Check out'}
        </button>
      </div>
    </div>
  );
}
