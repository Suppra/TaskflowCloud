import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface VelocityEntry {
  date: string;
  completadas: number;
  creadas: number;
}

interface Props {
  data: VelocityEntry[];
}

/* Custom tooltip ───────────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: '#1C1C1F', border: '1px solid #27272A' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: '#A1A1AA', fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#71717A' }}>{p.name}:</span>
          <span className="font-bold tabular-nums" style={{ color: '#FAFAFA', fontFamily: "'JetBrains Mono', monospace" }}>
            {p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function VelocityChart({ data }: Props) {
  const hasData = data.some(d => d.creadas > 0 || d.completadas > 0);

  return (
    <div className="rounded-xl p-4" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#52525B' }}>
        Velocidad — ultimos 7 dias
      </h3>

      {!hasData ? (
        <div
          className="flex items-center justify-center text-xs font-medium"
          style={{ height: 220, color: '#27272A' }}
        >
          Sin actividad esta semana
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1F" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#52525B', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={{ stroke: '#1C1C1F' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#52525B', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#52525B', paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="creadas"
              name="Creadas"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#818CF8' }}
            />
            <Line
              type="monotone"
              dataKey="completadas"
              name="Completadas"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#34D399' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
