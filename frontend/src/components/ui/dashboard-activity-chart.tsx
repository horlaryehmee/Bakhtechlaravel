import { useId, useState } from 'react'

type Point = { date: string; label: string; visitors: number; pageViews: number }

/** Responsive, keyboard-accessible chart using the dashboard's measured traffic. */
export function DashboardActivityChart({ data }: { data: Point[] }) {
  const [days, setDays] = useState(30)
  const [selected, setSelected] = useState<string | null>(null)
  const gradient = useId()
  const points = data.slice(-days)
  const ceiling = Math.max(1, ...points.map((point) => Math.max(point.visitors, point.pageViews)))
  const x = (index: number) => 32 + index * 536 / Math.max(1, points.length - 1)
  const y = (value: number) => 188 - value / ceiling * 160
  const path = (key: 'visitors' | 'pageViews') => points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point[key])}`).join(' ')
  const active = points.find((point) => point.date === selected)
  return <article className="dashboard-chart lg:col-span-2">
    <div className="dashboard-chart-heading"><div><h3>Website activity</h3><p>Visitors and page views from your recorded traffic</p></div>
      <div className="dashboard-segment" aria-label="Chart period">{[7, 30].map((value) => <button type="button" key={value} aria-pressed={days === value} onClick={() => { setDays(value); setSelected(null) }}>{value} days</button>)}</div>
    </div>
    {!points.length ? <div className="dashboard-chart-empty">Activity will appear here when visitor data is available.</div> : <>
      <div className="dashboard-chart-readout" aria-live="polite">{active ? `${active.label}: ${active.visitors.toLocaleString()} visitors · ${active.pageViews.toLocaleString()} page views` : `${points.length} recorded days · Select a day below to inspect its activity`}</div>
      <svg viewBox="0 0 600 220" className="dashboard-chart-svg" role="img" aria-label={`Visitors and page views for the last ${points.length} recorded days`}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--admin-primary)" stopOpacity=".2"/><stop offset="1" stopColor="var(--admin-primary)" stopOpacity="0"/></linearGradient></defs>
        {[0, .5, 1].map((fraction) => <g key={fraction}><line x1="32" x2="568" y1={y(ceiling * fraction)} y2={y(ceiling * fraction)} stroke="var(--admin-line)" strokeDasharray="3 5"/><text x="0" y={y(ceiling * fraction) - 5} fill="var(--admin-muted)" fontSize="10">{Math.round(ceiling * fraction)}</text></g>)}
        <path d={`${path('visitors')} L${x(points.length - 1)},188 L32,188 Z`} fill={`url(#${gradient})`}/>
        <path d={path('pageViews')} fill="none" stroke="var(--admin-muted)" strokeWidth="2" strokeDasharray="5 5"/>
        <path d={path('visitors')} fill="none" stroke="var(--admin-primary)" strokeWidth="2.5"/>
        {points.map((point, index) => <circle key={point.date} cx={x(index)} cy={y(point.visitors)} r={point.date === selected ? 5 : 3} fill="var(--admin-primary)"><title>{`${point.label}: ${point.visitors} visitors, ${point.pageViews} page views`}</title></circle>)}
        <text x="32" y="212" fill="var(--admin-muted)" fontSize="11">{points[0].label}</text><text x="568" y="212" textAnchor="end" fill="var(--admin-muted)" fontSize="11">{points[points.length - 1].label}</text>
      </svg>
      <div className="dashboard-chart-days" aria-label="Inspect daily traffic">{points.map((point) => <button type="button" key={point.date} aria-pressed={selected === point.date} onFocus={() => setSelected(point.date)} onClick={() => setSelected(point.date)}>{point.label}</button>)}</div>
    </>}
    <div className="dashboard-chart-legend"><span>● Visitors</span><span>┄ Page views</span></div>
  </article>
}
