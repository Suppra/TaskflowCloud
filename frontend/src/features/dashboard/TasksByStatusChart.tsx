import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface StatusEntry {
  status: string;
  count: number;
}

interface Props {
  data: StatusEntry[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: '#1C1C1F', border: '1px solid #27272A' }}
    >
      <p style={{ color: '#A1A1AA' }} className="truncate max-w-[140px]">{label}</p>
      <p className="font-bold tabular-nums mt-0.5" style={{ color: '#FAFAFA', fontFamily: "'JetBrains Mono', monospace" }}>
        {payload[0].value} tareas
      </p>
    </div>
  );
}

/* Shorten long column IDs to display name */
function shortenStatus(s: string): string {
  if (s.length < 12) return s;
  return s.slice(0, 8) + '…';
}

export function TasksByStatusChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#52525B' }}>
          Tareas por columna
        </h3>
        <div
          className="flex items-center justify-center text-xs font-medium"
          style={{ height: 180, color: '#27272A' }}
        >
          Sin datos de columnas
        </div>
      </div>
    );
  }

  /* Horizontal bar — safe with data present */
  const chartData = data.map(d => ({ ...d, label: shortenStatus(d.status) }));
  const barHeight = Math.max(180, chartData.length * 36);

  return (
    <div className="rounded-xl p-4" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#52525B' }}>
        Tareas por columna
      </h3>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1F" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#52525B', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#71717A', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" name="Tareas" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill="#6366F1" fillOpacity={0.7 + (index * 0.05)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
