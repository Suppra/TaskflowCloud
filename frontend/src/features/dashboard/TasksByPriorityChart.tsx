import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

interface PriorityEntry {
  priority: string;
  count: number;
  color: string;
}

interface Props {
  data: PriorityEntry[];
}

/* Map old backend colors → design system colors */
const PRIORITY_COLORS: Record<string, string> = {
  Low:      '#52525B',
  Medium:   '#EAB308',
  High:     '#F97316',
  Critical: '#EF4444',
};

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
      <p style={{ color: '#A1A1AA' }}>{label}</p>
      <p className="font-bold tabular-nums mt-0.5" style={{ color: '#FAFAFA', fontFamily: "'JetBrains Mono', monospace" }}>
        {payload[0].value} tareas
      </p>
    </div>
  );
}

export function TasksByPriorityChart({ data }: Props) {
  const hasData = data.some(d => d.count > 0);

  return (
    <div className="rounded-xl p-4" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#52525B' }}>
        Tareas por prioridad
      </h3>

      {!hasData ? (
        <div
          className="flex items-center justify-center text-xs font-medium"
          style={{ height: 180, color: '#27272A' }}
        >
          Sin tareas registradas
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1F" />
            <XAxis
              dataKey="priority"
              tick={{ fill: '#52525B', fontSize: 10 }}
              axisLine={{ stroke: '#1C1C1F' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#52525B', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" name="Tareas" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={PRIORITY_COLORS[entry.priority] ?? '#52525B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
