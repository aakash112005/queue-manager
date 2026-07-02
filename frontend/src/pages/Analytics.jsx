import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { api } from '../api';

const INK = '#211d1a';
const TEAL = '#285c56';
const AMBER = '#d98f2b';
const LINE = '#d9cfb8';

function Metric({ value, label }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export default function Analytics() {
  const [queues, setQueues] = useState([]);
  const [selected, setSelected] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listQueues().then((d) => setQueues(d.queues)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const fetcher = selected === 'overview' ? api.overviewAnalytics() : api.queueAnalytics(selected);
    fetcher
      .then((d) => setMetrics(d.metrics))
      .catch((e) => setError(e.message));
  }, [selected]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="sub">Wait times, throughput, and queue length trends.</p>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${LINE}` }}
        >
          <option value="overview">All queues</option>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!metrics ? (
        <div className="loading-line">Loading analytics…</div>
      ) : (
        <>
          <div className="metric-grid">
            <Metric value={metrics.waitingNow} label="Waiting right now" />
            <Metric value={metrics.servingNow} label="Being served" />
            <Metric value={`${metrics.avgWaitMinutes}m`} label="Avg. wait time" />
            <Metric value={`${metrics.avgServiceMinutes}m`} label="Avg. service time" />
            <Metric value={metrics.completedToday} label="Served today" />
            <Metric value={`${metrics.cancellationRate}%`} label="Cancellation rate" />
          </div>

          <div className="chart-card">
            <h3>Average wait time — last 7 days (minutes)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={metrics.waitTrend}>
                <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fontSize: 12, fill: INK }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12, fill: INK }} axisLine={{ stroke: LINE }} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="avgWaitMinutes" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Queue length — last 24 hours (people waiting)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.lengthTrend}>
                <defs>
                  <linearGradient id="lengthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AMBER} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={AMBER} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit' })}
                  tick={{ fontSize: 11, fill: INK }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 12, fill: INK }} axisLine={{ stroke: LINE }} tickLine={false} allowDecimals={false} />
                <Tooltip labelFormatter={(t) => new Date(t).toLocaleString()} />
                <Area type="monotone" dataKey="waiting" stroke={AMBER} fill="url(#lengthFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
