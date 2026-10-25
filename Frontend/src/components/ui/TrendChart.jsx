import { formatDate, weekday } from '../../lib/format';

export default function TrendChart({ points = [], height = 220 }) {
  const data = (points || []).filter((point) => point.attendanceRate !== null && point.attendanceRate !== undefined);
  if (data.length < 2) {
    return (
      <div className="chart-empty" style={{ height }}>
        Attendance trend needs at least two recorded working days.
      </div>
    );
  }

  const width = 720;
  const pad = { top: 18, right: 16, bottom: 30, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(100, ...data.map((point) => Number(point.attendanceRate) || 0));
  const min = 0;

  const x = (index) => pad.left + (index / (data.length - 1)) * innerW;
  const y = (value) => pad.top + innerH - ((value - min) / (max - min)) * innerH;

  const line = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.attendanceRate)}`).join(' ');
  const area = `${line} L ${x(data.length - 1)} ${pad.top + innerH} L ${x(0)} ${pad.top + innerH} Z`;
  const ticks = [0, 25, 50, 75, 100].filter((tick) => tick <= max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily attendance rate trend">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f54eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2f54eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" className="chart-axis-label">{tick}%</text>
          </g>
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} className="chart-line" />
        {data.map((point, index) => (
          <g key={point.date}>
            <circle cx={x(index)} cy={y(point.attendanceRate)} r="3.5" className="chart-dot">
              <title>{`${formatDate(point.date)} (${weekday(point.date)}): ${point.attendanceRate}% attendance · ${point.present + point.late + point.halfDay + point.missingCheckout} in, ${point.onLeave} on leave`}</title>
            </circle>
            {index % labelEvery === 0 && (
              <text x={x(index)} y={height - 8} textAnchor="middle" className="chart-axis-label">
                {formatDate(point.date, { day: '2-digit', month: 'short', year: undefined })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
