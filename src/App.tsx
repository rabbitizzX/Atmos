import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Activity, ArrowRight, ArrowUp, BarChart3, CalendarDays,
  ChevronRight, CloudRain, Cpu, Download, Droplets, Gauge, Info, Leaf, Menu,
  Moon, Radio, Sun, Thermometer, Wind, X,
} from 'lucide-react';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend,
  LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  firebaseDataProvider,
  type HistoryReading,
  type LiveReading,
} from '@/data/data-provider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

type Period = '20' | '7' | '3' | 'today' | 'custom' | 'day';
type Theme = 'light' | 'dark';
type ChartKind = 'line' | 'bar' | 'doughnut';

const palette = ['#16877f', '#e1a744', '#7388aa', '#62ad7b', '#c66f54'];

const isoFromDisplay = (value: string) => {
  const [day, month, year] = value.split('-');
  return `${year}-${month}-${day}`;
};

const prettyDate = (iso: string) => {
  if (!iso) return '';

  const [year, month, day] = iso.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const shortIsoDate = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;

const timeLabel = (time: string) => time.slice(0, 5);

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const fixed = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : '—';

const rowIso = (row: HistoryReading) => isoFromDisplay(row.date);

const csvEscape = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;

function useDataset() {
  const [history, setHistory] = useState<HistoryReading[]>([]);

  const [live, setLive] = useState<LiveReading>({
    temperature: 0,
    humidity: 0,
    feelsLike: 0,
    airQuality: 'Unknown',
    rain: 0,
    timestamp: new Date(0).toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setFailed(false);

    Promise.all([
      firebaseDataProvider.getHistory(),
      firebaseDataProvider.getLiveReading(),
    ])
      .then(([rows, snapshot]) => {
        if (!active) return;

        setHistory(rows);
        setLive(snapshot);
        setFailed(false);
      })
      .catch((error: unknown) => {
        console.error('Unable to load Firebase environmental data.', error);

        if (active) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [retry]);

  return {
    history,
    live,
    loading,
    failed,
    retry: () => setRetry((n) => n + 1),
  };
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('atmos-theme');

    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('atmos-theme', theme);
  }, [theme]);

  return {
    theme,
    toggle: () =>
      setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };
}

function useHistoryFilter(history: HistoryReading[]) {
  const dates = useMemo(
    () => Array.from(new Set(history.map(rowIso))).sort(),
    [history]
  );

  const latestDate = dates.length ? dates[dates.length - 1] : '';

  const earliestDate = dates.length ? dates[0] : '';

  const [period, setPeriod] = useState<Period>('20');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    if (!dates.length) return;

    setFrom((current) => current || earliestDate);
    setTo((current) => current || latestDate);
    setSelectedDay((current) => current || latestDate);
  }, [dates, earliestDate, latestDate]);

  const choosePeriod = (next: Period) => {
    if (!dates.length) {
      setPeriod(next);
      return;
    }

    setPeriod(next);

    if (next === '20') {
      const startIndex = Math.max(0, dates.length - 20);
      setFrom(dates[startIndex]);
      setTo(latestDate);
      setSelectedDay(latestDate);
    }

    if (next === '7') {
      const startIndex = Math.max(0, dates.length - 7);
      setFrom(dates[startIndex]);
      setTo(latestDate);
      setSelectedDay(latestDate);
    }

    if (next === '3') {
      const startIndex = Math.max(0, dates.length - 3);
      setFrom(dates[startIndex]);
      setTo(latestDate);
      setSelectedDay(latestDate);
    }

    if (next === 'today') {
      setFrom(latestDate);
      setTo(latestDate);
      setSelectedDay(latestDate);
    }

    if (next === 'day') {
      setFrom(selectedDay || latestDate);
      setTo(selectedDay || latestDate);
    }
  };

  const selectDay = (value: string) => {
    setSelectedDay(value);
    setFrom(value);
    setTo(value);
    setPeriod('day');
  };

  const filtered = useMemo(
    () =>
      history.filter((row) => {
        const date = rowIso(row);

        return (!from || date >= from) && (!to || date <= to);
      }),
    [history, from, to]
  );

  return {
    period,
    from,
    to,
    selectedDay,
    dates,
    filtered,
    setFrom,
    setTo,
    choosePeriod,
    selectDay,
    earliestDate,
    latestDate,
  };
}

function Brand() {
  return (
    <Link
      href="/"
      className="brand"
      aria-label="ATMOS dashboard home"
      data-testid="link-atmos-home"
    >
      <span className="brand-mark">
        <Activity size={20} />
      </span>

      <span>
        <span className="brand-name">ATMOS</span>

        <span className="brand-sub" style={{ display: 'block' }}>
          Climate observatory
        </span>
      </span>
    </Link>
  );
}

function Header({
  theme,
  onTheme,
}: {
  theme: Theme;
  onTheme: () => void;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const items = [
    { href: '/', label: 'Dashboard' },
    { href: '/reports', label: 'Reports & analytics' },
    { href: '/about', label: 'Climate awareness' },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />

        <nav
          className={`nav-links ${open ? 'open' : ''}`}
          aria-label="Main navigation"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${
                location === item.href ? 'active' : ''
              }`}
              aria-current={
                location === item.href ? 'page' : undefined
              }
              onClick={() => setOpen(false)}
              data-testid={`link-nav-${item.label
                .toLowerCase()
                .replaceAll(' ', '-')}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="icon-btn"
            onClick={onTheme}
            aria-label={`Switch to ${
              theme === 'dark' ? 'light' : 'dark'
            } theme`}
            title="Toggle colour theme"
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            className="icon-btn mobile-menu"
            onClick={() => setOpen((value) => !value)}
            aria-label={
              open ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={open}
            data-testid="button-mobile-menu"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title display">{title}</h1>
        <p className="subhead">{subtitle}</p>
      </div>

      {actions}
    </div>
  );
}

function DemoNotice() {
  return (
    <div className="demo-banner" role="note">
      <Info size={18} aria-hidden="true" />

      <div>
        <strong>Firebase-connected environmental data</strong>

        ATMOS is reading environmental data from the Firebase Realtime
        Database. Historical records are loaded from Firebase history.
      </div>
    </div>
  );
}

function DateFilters({
  filter,
  setFilter,
  showDay = true,
}: {
  filter: ReturnType<typeof useHistoryFilter>;
  setFilter: ReturnType<typeof useHistoryFilter>['choosePeriod'];
  showDay?: boolean;
}) {
  const quicks: { id: Period; label: string }[] = [
    { id: 'today', label: 'Latest day' },
    { id: '3', label: 'Last 3 days' },
    { id: '7', label: 'Last 7 days' },
    { id: '20', label: 'Last 20 days' },
    { id: 'custom', label: 'Custom range' },
  ];

  const clear = () => setFilter('20');

  return (
    <section
      className="panel filter-panel"
      aria-label="Historical date filters"
    >
      {showDay && (
        <div className="filter-group">
          <label htmlFor="day-filter">Single day</label>

          <select
            id="day-filter"
            className="select-field"
            value={filter.selectedDay}
            onChange={(event) => filter.selectDay(event.target.value)}
            data-testid="select-day-filter"
          >
            {filter.dates.map((date) => (
              <option key={date} value={date}>
                {prettyDate(date)}
              </option>
            ))}
          </select>
        </div>
      )}

      {filter.period === 'custom' && (
        <>
          <div className="filter-group">
            <label htmlFor="from-date">From</label>

            <input
              id="from-date"
              type="date"
              className="field"
              value={filter.from}
              min={filter.earliestDate}
              max={filter.latestDate}
              onChange={(event) => filter.setFrom(event.target.value)}
              data-testid="input-filter-from"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="to-date">To</label>

            <input
              id="to-date"
              type="date"
              className="field"
              value={filter.to}
              min={filter.earliestDate}
              max={filter.latestDate}
              onChange={(event) => filter.setTo(event.target.value)}
              data-testid="input-filter-to"
            />
          </div>
        </>
      )}

      <div
        className="quick-filters"
        role="group"
        aria-label="Quick date ranges"
      >
        {quicks.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`chip ${
              filter.period === item.id ? 'selected' : ''
            }`}
            aria-pressed={filter.period === item.id}
            onClick={() => setFilter(item.id)}
            data-testid={`button-range-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="button small"
        onClick={clear}
        data-testid="button-clear-filters"
      >
        Clear
      </button>

      <div
        className="filter-count"
        aria-live="polite"
        data-testid="text-matching-record-count"
      >
        <strong>{filter.filtered.length}</strong>{' '}
        {filter.filtered.length === 1 ? 'reading' : 'readings'} ·{' '}
        {filter.from === filter.to
          ? prettyDate(filter.from)
          : `${prettyDate(filter.from)} – ${prettyDate(filter.to)}`}
      </div>
    </section>
  );
}

function currentStatus(reading: LiveReading) {
  const timestamp = new Date(reading.timestamp).getTime();

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'offline';
  }

  const age = Date.now() - timestamp;

  if (age < 60 * 1000) {
    return 'live';
  }

  if (age < 5 * 60 * 1000) {
    return 'delayed';
  }

  return 'offline';
}

function StatusPanel({ live }: { live: LiveReading }) {
  const [, refreshClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => refreshClock((value) => value + 1),
      30_000
    );

    return () => window.clearInterval(timer);
  }, []);

  const status = currentStatus(live);
  const timestamp = new Date(live.timestamp);

  const timestampValue = timestamp.getTime();

  const age =
    timestampValue > 0 && Number.isFinite(timestampValue)
      ? Math.max(0, Date.now() - timestampValue)
      : Infinity;

  const ageText =
    !Number.isFinite(age)
      ? 'No valid update timestamp'
      : age < 60_000
        ? `${Math.floor(age / 1000)} seconds ago`
        : `${Math.floor(age / 60_000)} minutes ago`;

  const statusTitle =
    status === 'live'
      ? 'LIVE SENSOR DATA'
      : status === 'delayed'
        ? 'DELAYED SENSOR DATA'
        : 'OFFLINE';

  const statusNote =
    status === 'live'
      ? `Updated ${ageText}`
      : status === 'delayed'
        ? `Last Firebase update ${ageText}`
        : 'No recent Firebase update is available.';

  return (
    <div
      className="panel status-panel"
      role="status"
      data-testid="status-demo-offline"
    >
      <div className="status-left">
        <span className="status-dot" />

        <div>
          <div className="status-title">{statusTitle}</div>

          <div className="status-note">{statusNote}</div>
        </div>
      </div>

      <div className="status-stamp">
        <div>Last Firebase update</div>

        <strong
          className="mono"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {timestampValue > 0
            ? `${timestamp.toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })} · ${ageText}`
            : 'No update available'}
        </strong>
      </div>
    </div>
  );
}

function ReadingCards({ live }: { live: LiveReading }) {
  const items = [
    {
      label: 'Temperature',
      value: fixed(live.temperature),
      unit: '°C',
      foot: 'Ambient temperature',
      icon: Thermometer,
      tone: '#c37a40',
      wash: 'hsl(31 70% 55% / .12)',
    },
    {
      label: 'Humidity',
      value: String(live.humidity),
      unit: '%',
      foot: 'Relative humidity',
      icon: Droplets,
      tone: '#448e9b',
      wash: 'hsl(188 45% 52% / .13)',
    },
    {
      label: 'Feels like',
      value: fixed(live.feelsLike),
      unit: '°C',
      foot: 'Calculated environmental value',
      icon: Sun,
      tone: '#be9234',
      wash: 'hsl(42 70% 55% / .15)',
    },
    {
      label: 'Air quality',
      value: live.airQuality,
      unit: '',
      foot: 'Current air-quality category',
      icon: Wind,
      tone: '#47866d',
      wash: 'hsl(146 37% 48% / .12)',
    },
    {
      label: 'Rain',
      value: live.rain ? 'Detected' : 'No rain',
      unit: '',
      foot: 'Current rain sensor state',
      icon: CloudRain,
      tone: '#687fa0',
      wash: 'hsl(216 37% 56% / .13)',
    },
  ];

  return (
    <div className="readings-grid">
      {items.map((item) => (
        <article
          className="panel reading-card"
          key={item.label}
          style={
            {
              '--tone': item.tone,
              '--wash': item.wash,
            } as CSSProperties
          }
          data-testid={`card-reading-${item.label
            .toLowerCase()
            .replaceAll(' ', '-')}`}
        >
          <div className="reading-top">
            <span>{item.label}</span>

            <span className="reading-icon">
              <item.icon size={17} />
            </span>
          </div>

          <div className="reading-value display">
            {item.value}{' '}
            <span className="reading-unit">{item.unit}</span>
          </div>

          <div className="reading-foot">{item.foot}</div>
        </article>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  kind,
  labels,
  datasets,
  heightClass = '',
}: {
  title: string;
  subtitle: string;
  kind: ChartKind;
  labels: string[];
  datasets: any[];
  heightClass?: string;
}) {
  const dark = document.documentElement.classList.contains('dark');

  const labelColor = dark ? '#9eb7b8' : '#6d8284';
  const gridColor = dark
    ? 'rgba(177,207,203,.11)'
    : 'rgba(39,76,77,.09)';

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: kind === 'doughnut' || datasets.length > 1,
        position: kind === 'doughnut' ? 'bottom' : 'top',
        align: 'start',
        labels: {
          color: labelColor,
          usePointStyle: true,
          boxWidth: 7,
          padding: 14,
          font: {
            family: 'DM Sans',
            size: 10,
          },
        },
      },

      tooltip: {
        backgroundColor: dark ? '#203c42' : '#163b40',
        titleFont: { family: 'DM Sans' },
        bodyFont: { family: 'IBM Plex Mono' },
        padding: 11,
        cornerRadius: 9,
      },
    },

    scales:
      kind === 'doughnut'
        ? {}
        : {
            x: {
              grid: { display: false },
              ticks: {
                color: labelColor,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 9,
                font: {
                  family: 'IBM Plex Mono',
                  size: 9,
                },
              },
              border: { display: false },
            },

            y: {
              beginAtZero: false,
              grid: { color: gridColor },
              ticks: {
                color: labelColor,
                font: {
                  family: 'IBM Plex Mono',
                  size: 9,
                },
              },
              border: { display: false },
            },

            ...(datasets.some((dataset) => dataset.yAxisID === 'y1')
              ? {
                  y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                      color: labelColor,
                      font: {
                        family: 'IBM Plex Mono',
                        size: 9,
                      },
                    },
                    border: { display: false },
                  },
                }
              : {}),
          },

    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const data = {
    labels,
    datasets,
  };

  return (
    <article className="panel chart-panel">
      <div className="chart-title">
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>

        <BarChart3
          size={16}
          color="hsl(var(--muted-foreground))"
          aria-hidden="true"
        />
      </div>

      <div
        className={`chart-wrap ${heightClass}`}
        aria-label={title}
        role="img"
      >
        {kind === 'line' ? (
          <Line data={data} options={options} />
        ) : kind === 'bar' ? (
          <Bar data={data} options={options} />
        ) : (
          <Doughnut data={data} options={options} />
        )}
      </div>
    </article>
  );
}

const lineStyle = (color: string, fill = false) => ({
  borderColor: color,
  backgroundColor: fill ? `${color}20` : color,
  borderWidth: 2,
  pointRadius: 2.2,
  pointHoverRadius: 5,
  tension: 0.34,
  fill,
  ...(fill ? { pointBackgroundColor: color } : {}),
});

const barStyle = (color: string) => ({
  backgroundColor: color,
  borderRadius: 5,
  borderSkipped: false as const,
  maxBarThickness: 34,
});

function buildChartData(rows: HistoryReading[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      rowIso(a).localeCompare(rowIso(b)) ||
      a.time.localeCompare(b.time)
  );

  const daily = Array.from(new Set(sorted.map(rowIso))).map((date) => {
    const items = sorted.filter((row) => rowIso(row) === date);

    return {
      date,
      temp: mean(items.map((row) => row.temp)),
      feel: mean(items.map((row) => row.feelsLike)),
      humidity: mean(items.map((row) => row.humidity)),
    };
  });

  const counts = ['Good', 'Moderate', 'Poor'].map(
    (label) =>
      sorted.filter((row) => row.airQuality === label).length
  );

  const rain = [
    sorted.filter((row) => row.rain === 0).length,
    sorted.filter((row) => row.rain === 1).length,
  ];

  return {
    sorted,
    daily,
    counts,
    rain,
  };
}

function Trends({
  rows,
  scope = 'full',
}: {
  rows: HistoryReading[];
  scope?: 'full' | 'dashboard';
}) {
  const charts = buildChartData(rows);

  if (!rows.length) {
    return (
      <div className="panel empty-state">
        <CalendarDays size={25} color="hsl(var(--primary))" />

        <h3>No readings in this range</h3>

        <p>
          There are no Firebase history records for these dates.
          Choose another period or clear the filters to return to
          the available data.
        </p>
      </div>
    );
  }

  const trendLabels = charts.sorted.map(
    (row) => `${row.date.slice(0, 5)} ${timeLabel(row.time)}`
  );

  return (
    <div className="chart-grid">
      <ChartCard
        title="Temperature trend"
        subtitle="Firebase history readings · °C"
        kind="line"
        labels={trendLabels}
        datasets={[
          {
            label: 'Temperature °C',
            data: charts.sorted.map((r) => r.temp),
            ...lineStyle(palette[0], true),
          },
        ]}
      />

      {scope === 'full' && (
        <ChartCard
          title="Humidity trend"
          subtitle="Relative humidity · %"
          kind="line"
          labels={trendLabels}
          datasets={[
            {
              label: 'Humidity %',
              data: charts.sorted.map((r) => r.humidity),
              ...lineStyle(palette[2], true),
            },
          ]}
        />
      )}

      {scope === 'full' && (
        <ChartCard
          title="Feels-like trend"
          subtitle="Environmental value · °C"
          kind="line"
          labels={trendLabels}
          datasets={[
            {
              label: 'Feels like °C',
              data: charts.sorted.map((r) => r.feelsLike),
              ...lineStyle(palette[1], true),
            },
          ]}
        />
      )}

      <ChartCard
        title="Daily temperature comparison"
        subtitle="Average by day · °C"
        kind="bar"
        labels={charts.daily.map((d) => shortIsoDate(d.date))}
        datasets={[
          {
            label: 'Daily mean °C',
            data: charts.daily.map((d) =>
              Number(d.temp.toFixed(1))
            ),
            ...barStyle(palette[0]),
          },
        ]}
      />

      {scope === 'full' && (
        <ChartCard
          title="Air-quality distribution"
          subtitle="Firebase history readings"
          kind="doughnut"
          labels={['Good', 'Moderate', 'Poor']}
          datasets={[
            {
              label: 'Readings',
              data: charts.counts,
              backgroundColor: [
                palette[3],
                palette[1],
                '#c66f54',
              ],
              borderWidth: 0,
              hoverOffset: 5,
            },
          ]}
        />
      )}

      {scope === 'full' && (
        <ChartCard
          title="Rain distribution"
          subtitle="Rain sensor state · readings"
          kind="doughnut"
          labels={['No rain', 'Rain detected']}
          datasets={[
            {
              label: 'Readings',
              data: charts.rain,
              backgroundColor: ['#9bbdb7', '#5486a4'],
              borderWidth: 0,
              hoverOffset: 5,
            },
          ]}
        />
      )}

      {scope === 'full' && (
        <ChartCard
          title="Daily environmental comparison"
          subtitle="Temperature / feels-like · °C · humidity on right axis"
          kind="line"
          labels={charts.daily.map((d) =>
            shortIsoDate(d.date)
          )}
          datasets={[
            {
              label: 'Temperature °C',
              data: charts.daily.map((d) =>
                Number(d.temp.toFixed(1))
              ),
              ...lineStyle(palette[0]),
              yAxisID: 'y',
            },
            {
              label: 'Feels-like °C',
              data: charts.daily.map((d) =>
                Number(d.feel.toFixed(1))
              ),
              ...lineStyle(palette[1]),
              yAxisID: 'y',
            },
            {
              label: 'Humidity %',
              data: charts.daily.map((d) =>
                Number(d.humidity.toFixed(0))
              ),
              ...lineStyle(palette[2]),
              yAxisID: 'y1',
            },
          ]}
        />
      )}
    </div>
  );
}

function RecentReadings({
  rows,
  limit = 7,
}: {
  rows: HistoryReading[];
  limit?: number;
}) {
  const recent = [...rows]
    .sort(
      (a, b) =>
        rowIso(b).localeCompare(rowIso(a)) ||
        b.time.localeCompare(a.time)
    )
    .slice(0, limit);

  if (!recent.length) return null;

  return (
    <div className="panel table-panel">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Temperature</th>
              <th>Feels like</th>
              <th>Humidity</th>
              <th>Air quality</th>
              <th>Rain</th>
            </tr>
          </thead>

          <tbody>
            {recent.map((row, index) => (
              <tr
                key={`${row.date}-${row.time}`}
                data-testid={`row-reading-${index}`}
              >
                <td>{prettyDate(rowIso(row))}</td>

                <td className="mono">
                  {timeLabel(row.time)}
                </td>

                <td className="mono">
                  {fixed(row.temp)} °C
                </td>

                <td className="mono">
                  {fixed(row.feelsLike)} °C
                </td>

                <td className="mono">
                  {row.humidity}%
                </td>

                <td>
                  <span
                    className={`quality-pill ${row.airQuality.toLowerCase()}`}
                  >
                    {row.airQuality}
                  </span>
                </td>

                <td>
                  {row.rain ? 'Detected' : 'No rain'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-readings">
        {recent.map((row, index) => (
          <article
            key={`${row.date}-${row.time}-mobile`}
            style={{
              padding: 15,
              borderTop: '1px solid hsl(var(--border))',
            }}
            data-testid={`card-reading-history-${index}`}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <strong>
                {prettyDate(rowIso(row))} ·{' '}
                {timeLabel(row.time)}
              </strong>

              <span
                className={`quality-pill ${row.airQuality.toLowerCase()}`}
              >
                {row.airQuality}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                color: 'hsl(var(--muted-foreground))',
                fontSize: 11,
              }}
            >
              <span>{fixed(row.temp)}°C temp</span>
              <span>{row.humidity}% humidity</span>
              <span>{row.rain ? 'Rain' : 'Dry'}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function calculateInsights(rows: HistoryReading[]) {
  if (!rows.length) return [];

  const afternoon = rows.filter((row) => {
    const hour = Number(row.time.slice(0, 2));
    return hour >= 12 && hour < 18;
  });

  const humidityAverage = mean(
    rows.map((row) => row.humidity)
  );

  const qualityCounts = ['Good', 'Moderate', 'Poor']
    .map((quality) => ({
      quality,
      n: rows.filter((row) => row.airQuality === quality).length,
    }))
    .sort((a, b) => b.n - a.n);

  const tempRange =
    Math.max(...rows.map((row) => row.temp)) -
    Math.min(...rows.map((row) => row.temp));

  const maxTemp = Math.max(...rows.map((row) => row.temp));

  const highTime = rows.find(
    (row) => row.temp === maxTemp
  );

  return [
    {
      title: 'Warmest time window',
      text:
        afternoon.length &&
        mean(afternoon.map((r) => r.temp)) >=
          mean(rows.map((r) => r.temp))
          ? `Afternoon readings averaged ${fixed(
              mean(afternoon.map((r) => r.temp))
            )}°C, above the selected-period mean of ${fixed(
              mean(rows.map((r) => r.temp))
            )}°C.`
          : `The highest individual reading was ${fixed(
              maxTemp
            )}°C at ${timeLabel(
              highTime?.time ?? ''
            )} on ${highTime?.date}.`,
    },

    {
      title: 'Humidity context',
      text: `Relative humidity averaged ${fixed(
        humidityAverage
      )}% across ${
        rows.length
      } selected Firebase history readings${
        humidityAverage >= 70
          ? ', with values generally on the higher side in this dataset.'
          : '.'
      }`,
    },

    {
      title: 'What stood out',
      text: `${
        qualityCounts[0].quality
      } was the most frequent air-quality category (${
        qualityCounts[0].n
      } readings). Temperature varied by ${fixed(
        tempRange
      )}°C and rain was marked in ${
        rows.filter((r) => r.rain).length
      } readings.`,
    },
  ];
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="panel metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value display">{value}</div>
      <div className="metric-foot">{detail}</div>
    </div>
  );
}

function Dashboard({
  rows,
  live,
  filter,
  setFilter,
  loading,
  failed,
  retry,
}: {
  rows: HistoryReading[];
  live: LiveReading;
  filter: ReturnType<typeof useHistoryFilter>;
  setFilter: ReturnType<
    typeof useHistoryFilter
  >['choosePeriod'];
  loading: boolean;
  failed: boolean;
  retry: () => void;
}) {
  const avgTemp = mean(rows.map((row) => row.temp));
  const avgHumidity = mean(rows.map((row) => row.humidity));
  const insights = calculateInsights(rows);

  const snapshotDate = new Date(live.timestamp);

  return (
    <main className="main">
      <PageHead
        eyebrow="Environmental monitoring · Live data"
        title="A clearer view of our atmosphere."
        subtitle="Local environmental conditions, connected through the ATMOS monitoring system."
      />

      <DemoNotice />

      <StatusPanel live={live} />

      <div className="section-heading">
        <div>
          <h2>Current readings</h2>

          <p>
            Last Firebase update ·{' '}
            {live.timestamp &&
            new Date(live.timestamp).getTime() > 0
              ? snapshotDate.toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'No update available'}
          </p>
        </div>

        <span className="quality-pill">FIREBASE DATA</span>
      </div>

      <ReadingCards live={live} />

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Historical explorer</h2>

            <p>
              Choose a date or period to update every chart and
              observation.
            </p>
          </div>
        </div>

        <DateFilters filter={filter} setFilter={setFilter} />
      </section>

      {loading ? (
        <div
          className="panel empty-state"
          aria-live="polite"
        >
          <Activity size={23} />

          <h3>Loading Firebase data</h3>

          <p>
            Loading the latest environmental records…
          </p>
        </div>
      ) : failed ? (
        <div className="panel empty-state">
          <h3>Firebase data could not be loaded</h3>

          <p>
            Check your Firebase configuration and Realtime
            Database connection, then try again.
          </p>

          <button
            className="button primary"
            onClick={retry}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Period at a glance</h2>

                <p>
                  Calculated from {rows.length} selected
                  Firebase history readings.
                </p>
              </div>
            </div>

            <div className="metric-row">
              <Metric
                label="Mean temperature"
                value={
                  rows.length
                    ? `${fixed(avgTemp)}°C`
                    : '—'
                }
                detail="Selected records"
              />

              <Metric
                label="Mean humidity"
                value={
                  rows.length
                    ? `${fixed(avgHumidity, 0)}%`
                    : '—'
                }
                detail="Relative humidity"
              />

              <Metric
                label="Rain detections"
                value={
                  rows.length
                    ? String(
                        rows.filter((r) => r.rain).length
                      )
                    : '—'
                }
                detail="Readings marked rain"
              />

              <Metric
                label="Selected readings"
                value={String(rows.length)}
                detail="Across chosen dates"
              />
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Environmental trends</h2>

                <p>
                  Temperature and daily comparison update
                  with your selected period.
                </p>
              </div>
            </div>

            <Trends
              rows={rows}
              scope={
                filter.period === 'day'
                  ? 'full'
                  : 'dashboard'
              }
            />
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Environmental insights</h2>

                <p>
                  Observations calculated directly from
                  the selected Firebase history records.
                </p>
              </div>

              <span className="eyebrow">
                Data-derived
              </span>
            </div>

            {rows.length ? (
              <div className="insight-grid">
                {insights.map((item, index) => (
                  <article
                    className="panel insight"
                    key={item.title}
                  >
                    <div className="insight-icon">
                      {index === 0 ? (
                        <Thermometer size={18} />
                      ) : index === 1 ? (
                        <Droplets size={18} />
                      ) : (
                        <Activity size={18} />
                      )}
                    </div>

                    <h3>{item.title}</h3>

                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel empty-state">
                <h3>No insights for an empty period</h3>

                <p>
                  Choose a date with available Firebase
                  history records to see calculated
                  observations.
                </p>
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Recent readings</h2>

                <p>
                  Showing the latest selected records first
                  · {rows.length} matched.
                </p>
              </div>

              <Link
                href="/reports"
                className="button small"
              >
                Open reports <ArrowRight size={14} />
              </Link>
            </div>

            {rows.length ? (
              <RecentReadings rows={rows} limit={7} />
            ) : (
              <div className="panel empty-state">
                <h3>
                  No environmental readings were found
                  for this date.
                </h3>

                <p>
                  Change the selected day or clear filters
                  to browse the available Firebase history.
                </p>

                <button
                  className="button primary"
                  onClick={() => setFilter('20')}
                >
                  Show available history
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <section className="section awareness-band">
        <div className="awareness-copy">
          <div className="eyebrow">Climate awareness</div>

          <h2>
            Local observations make a global subject
            tangible.
          </h2>

          <p>
            Climate change is a long-term shift in climate
            patterns. A local dashboard can help learners
            notice environmental conditions while keeping
            the difference between short-term measurements
            and long-term climate evidence clear.
          </p>

          <Link
            href="/about"
            className="button small"
            data-testid="link-explore-about"
            style={{
              marginTop: 7,
              background: '#eef6ed',
              color: '#14565b',
              border: 0,
            }}
          >
            Explore the project <ChevronRight size={14} />
          </Link>
        </div>

        <div className="awareness-stat">
          <div className="awareness-stat-item">
            <Leaf size={17} />

            <span>
              Understand what each environmental indicator
              can—and cannot—tell us.
            </span>
          </div>

          <div className="awareness-stat-item">
            <Radio size={17} />

            <span>
              ATMOS reads its current environmental data
              from Firebase Realtime Database.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function extremes(
  rows: HistoryReading[],
  field: 'temp' | 'humidity' | 'feelsLike'
) {
  if (!rows.length) {
    return {
      min: null as HistoryReading | null,
      max: null as HistoryReading | null,
    };
  }

  return {
    min: rows.reduce((a, b) =>
      a[field] <= b[field] ? a : b
    ),
    max: rows.reduce((a, b) =>
      a[field] >= b[field] ? a : b
    ),
  };
}

function Extremes({ rows }: { rows: HistoryReading[] }) {
  const definitions = [
    {
      field: 'temp' as const,
      label: 'Temperature',
      unit: '°C',
    },
    {
      field: 'humidity' as const,
      label: 'Humidity',
      unit: '%',
    },
    {
      field: 'feelsLike' as const,
      label: 'Feels like',
      unit: '°C',
    },
  ];

  return (
    <div className="chart-grid">
      {definitions.map((item) => {
        const values = extremes(rows, item.field);

        return (
          <article
            className="panel insight"
            key={item.field}
          >
            <div className="eyebrow">
              {item.label} · highs & lows
            </div>

            {values.max && values.min ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 15,
                }}
              >
                <div>
                  <div className="metric-label">
                    Highest
                  </div>

                  <div className="metric-value display">
                    {fixed(
                      values.max[item.field],
                      item.field === 'humidity'
                        ? 0
                        : 1
                    )}
                    {item.unit}
                  </div>

                  <div className="metric-foot">
                    {values.max.date} ·{' '}
                    {timeLabel(values.max.time)}
                  </div>
                </div>

                <div>
                  <div className="metric-label">
                    Lowest
                  </div>

                  <div className="metric-value display">
                    {fixed(
                      values.min[item.field],
                      item.field === 'humidity'
                        ? 0
                        : 1
                    )}
                    {item.unit}
                  </div>

                  <div className="metric-foot">
                    {values.min.date} ·{' '}
                    {timeLabel(values.min.time)}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 12 }}>
                No readings to compare in this period.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function exportCsv(rows: HistoryReading[]) {
  const header = [
    'airQuality',
    'date',
    'feelsLike',
    'humidity',
    'rain',
    'temp',
    'time',
  ];

  const lines = [
    header.map(csvEscape).join(','),
    ...rows.map((row) =>
      header
        .map((key) =>
          csvEscape(
            row[key as keyof HistoryReading]
          )
        )
        .join(',')
    ),
  ];

  const blob = new Blob(
    [`\uFEFF${lines.join('\r\n')}`],
    {
      type: 'text/csv;charset=utf-8',
    }
  );

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `atmos-firebase-${rows.length}-readings.csv`;

  anchor.click();

  URL.revokeObjectURL(url);
}

function Reports({
  rows,
  filter,
  setFilter,
}: {
  rows: HistoryReading[];
  filter: ReturnType<typeof useHistoryFilter>;
  setFilter: ReturnType<
    typeof useHistoryFilter
  >['choosePeriod'];
}) {
  const avgTemp = mean(rows.map((r) => r.temp));
  const avgHumidity = mean(
    rows.map((r) => r.humidity)
  );

  const maxTemp = rows.length
    ? Math.max(...rows.map((r) => r.temp))
    : 0;

  const minTemp = rows.length
    ? Math.min(...rows.map((r) => r.temp))
    : 0;

  const maxHumidity = rows.length
    ? Math.max(...rows.map((r) => r.humidity))
    : 0;

  const minHumidity = rows.length
    ? Math.min(...rows.map((r) => r.humidity))
    : 0;

  const commonQuality = [
    'Good',
    'Moderate',
    'Poor',
  ]
    .map(
      (q) =>
        [
          q,
          rows.filter((r) => r.airQuality === q)
            .length,
        ] as const
    )
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="main">
      <PageHead
        eyebrow="Historical data · Calculated analytics"
        title="Reports & analytics"
        subtitle="A closer look at the selected Firebase history period. Every summary and observation is calculated from the records shown."
        actions={
          <div className="report-actions">
            <button
              className="button small"
              onClick={() => exportCsv(rows)}
              disabled={!rows.length}
              data-testid="button-export-csv"
            >
              <Download size={15} />
              Export CSV
            </button>

            <button
              className="button primary small"
              onClick={() => window.print()}
              data-testid="button-print-report"
            >
              <BarChart3 size={15} />
              Print report
            </button>
          </div>
        }
      />

      <DemoNotice />

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Reporting period</h2>

            <p>
              Selected range:{' '}
              {filter.from === filter.to
                ? prettyDate(filter.from)
                : `${prettyDate(
                    filter.from
                  )} – ${prettyDate(filter.to)}`}
            </p>
          </div>
        </div>

        <DateFilters
          filter={filter}
          setFilter={setFilter}
        />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Summary</h2>

            <p>
              {rows.length} records · values computed
              from selected Firebase rows only.
            </p>
          </div>
        </div>

        <div className="metric-row">
          <Metric
            label="Average temperature"
            value={
              rows.length
                ? `${fixed(avgTemp)}°C`
                : '—'
            }
            detail="Selected period"
          />

          <Metric
            label="Maximum temperature"
            value={
              rows.length
                ? `${fixed(maxTemp)}°C`
                : '—'
            }
            detail="Selected period"
          />

          <Metric
            label="Minimum temperature"
            value={
              rows.length
                ? `${fixed(minTemp)}°C`
                : '—'
            }
            detail="Selected period"
          />

          <Metric
            label="Average humidity"
            value={
              rows.length
                ? `${fixed(avgHumidity, 0)}%`
                : '—'
            }
            detail="Relative humidity"
          />
        </div>

        <div
          className="metric-row"
          style={{ marginTop: 12 }}
        >
          <Metric
            label="Maximum humidity"
            value={
              rows.length
                ? `${maxHumidity}%`
                : '—'
            }
            detail="Selected period"
          />

          <Metric
            label="Minimum humidity"
            value={
              rows.length
                ? `${minHumidity}%`
                : '—'
            }
            detail="Selected period"
          />

          <Metric
            label="Rain occurrences"
            value={String(
              rows.filter((r) => r.rain).length
            )}
            detail="Rain-marked readings"
          />

          <Metric
            label="Most common air quality"
            value={
              rows.length
                ? commonQuality[0]
                : '—'
            }
            detail={
              rows.length
                ? `${commonQuality[1]} categorical records`
                : 'No selected records'
            }
          />
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Trends & distribution</h2>

            <p>
              Charts redraw when the selected period
              changes.
            </p>
          </div>
        </div>

        <Trends rows={rows} />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Highs and lows</h2>

            <p>
              Each value is paired with the date and time
              of its record.
            </p>
          </div>
        </div>

        <Extremes rows={rows} />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Calculated observations</h2>

            <p>
              Descriptive comparisons only—not a
              scientific forecast.
            </p>
          </div>
        </div>

        {rows.length ? (
          <div className="insight-grid">
            {calculateInsights(rows).map((item) => (
              <article
                className="panel insight"
                key={item.title}
              >
                <Activity
                  size={18}
                  className="insight-icon"
                />

                <h3>{item.title}</h3>

                <p>{item.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel empty-state">
            <h3>
              No data for this reporting period
            </h3>

            <p>
              Select a period with available Firebase
              history records.
            </p>

            <button
              className="button primary"
              onClick={() => setFilter('20')}
            >
              View available records
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Selected records</h2>

            <p>
              CSV export includes these rows and the
              exact history schema fields.
            </p>
          </div>
        </div>

        {rows.length ? (
          <RecentReadings
            rows={rows}
            limit={rows.length}
          />
        ) : (
          <div className="panel empty-state">
            <h3>No records to display</h3>

            <p>
              Choose a different date range.
            </p>
          </div>
        )}
      </section>

      <p className="notice section">
        Analytics describe the environmental records
        currently stored in Firebase. They should not be
        interpreted as long-term climate trends.
      </p>
    </main>
  );
}

function About() {
  const sensors = [
    {
      title: 'DHT11',
      icon: Thermometer,
      text: 'A low-cost digital sensor used in student projects to estimate air temperature and relative humidity. Its accuracy and operating range are limited compared with calibrated instruments.',
    },
    {
      title: 'MQ135',
      icon: Wind,
      text: 'A gas-sensitive sensor whose response can vary with several gases and environmental factors. Raw analog output is not calibrated CO₂ concentration and should not be reported as a precise gas measurement.',
    },
    {
      title: 'Rain sensor',
      icon: CloudRain,
      text: 'A conductive plate/module can provide a simple wet/dry or threshold-style indication. It does not measure rainfall depth or intensity without a suitable calibrated instrument.',
    },
    {
      title: 'ESP8266',
      icon: Cpu,
      text: 'A Wi-Fi capable microcontroller platform that can read sensor modules and transmit project data. Connectivity and the quality of a reading depend on the full system design.',
    },
  ];

  return (
    <main className="main">
      <section className="about-hero">
        <div
          className="eyebrow"
          style={{ color: '#bdd99b' }}
        >
          The project · Climate awareness
        </div>

        <h1>Measure carefully. Interpret honestly.</h1>

        <p>
          ATMOS is a student project exploring how
          environmental information can be presented in
          an interactive dashboard—and why the quality
          and provenance of that information matter.
        </p>
      </section>

      <section className="section about-grid">
        <article className="panel about-card">
          <Leaf
            size={21}
            color="hsl(var(--primary))"
          />

          <h2>What is climate change?</h2>

          <p>
            Climate change refers to long-term shifts in
            temperatures and weather patterns. Human
            activities—especially burning fossil
            fuels—are the principal driver of the warming
            observed since the industrial era. A few
            local readings cannot establish a climate
            trend: that requires long-term,
            quality-controlled observations across places
            and seasons.
          </p>
        </article>

        <article className="panel about-card">
          <Gauge
            size={21}
            color="hsl(var(--primary))"
          />

          <h2>Why monitor local conditions?</h2>

          <p>
            Temperature, humidity, air-quality indicators
            and rainfall can help people explore their
            immediate environment. Looking at dated
            readings over time supports questions and
            awareness, while careful labels prevent
            short-term weather or low-cost sensor signals
            from being mistaken for climate evidence.
          </p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>How the project fits together</h2>

            <p>
              The sensor-to-dashboard pipeline used by
              ATMOS.
            </p>
          </div>
        </div>

        <article className="panel about-card">
          <div
            className="arch"
            aria-label="Conceptual system architecture"
          >
            <span className="arch-step">
              Environmental sensors
            </span>

            <ArrowRight
              className="arch-arrow"
              size={15}
            />

            <span className="arch-step">
              ESP8266
            </span>

            <ArrowRight
              className="arch-arrow"
              size={15}
            />

            <span className="arch-step">
              Firebase RTDB
            </span>

            <ArrowRight
              className="arch-arrow"
              size={15}
            />

            <span className="arch-step">
              ATMOS dashboard
            </span>

            <ArrowRight
              className="arch-arrow"
              size={15}
            />

            <span className="arch-step">
              Visualization & analysis
            </span>
          </div>

          <p style={{ marginBottom: 0 }}>
            Current flow: environmental data stored in
            Firebase Realtime Database → ATMOS dashboard
            and reports. Historical records are loaded
            from Firebase history, while current
            environmental values are read from the live
            Firebase node.
          </p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Sensor notes</h2>

            <p>
              Typical student-project roles—with realistic
              limits.
            </p>
          </div>
        </div>

        <div className="sensor-grid">
          {sensors.map(
            ({ title, icon: Icon, text }) => (
              <article
                className="panel sensor-card"
                key={title}
              >
                <Icon
                  size={19}
                  color="hsl(var(--primary))"
                />

                <h3>{title}</h3>

                <p>{text}</p>
              </article>
            )
          )}
        </div>
      </section>

      <section className="section panel about-card">
        <div className="eyebrow">
          Data integrity
        </div>

        <h2>
          Firebase records are the source for ATMOS
          readings.
        </h2>

        <p>
          The dashboard reads its current values from the
          Firebase Realtime Database and its historical
          records from the Firebase history node. Sensor
          accuracy still depends on the physical
          hardware, calibration and data-collection setup.
        </p>
      </section>
    </main>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setVisible(window.scrollY > 500);

    window.addEventListener(
      'scroll',
      onScroll,
      { passive: true }
    );

    onScroll();

    return () =>
      window.removeEventListener(
        'scroll',
        onScroll
      );
  }, []);

  return visible ? (
    <button
      className="icon-btn back-top"
      aria-label="Back to top"
      title="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }
      data-testid="button-back-to-top"
    >
      <ArrowUp size={18} />
    </button>
  ) : null;
}

function Footer() {
  return (
    <footer className="footer">
      <span>
        <strong>ATMOS</strong> · Environmental monitoring
        & climate awareness
      </span>

      <span>
        Firebase-connected environmental data
      </span>
    </footer>
  );
}

function App() {
  const { theme, toggle } = useTheme();

  const data = useDataset();

  const filter = useHistoryFilter(data.history);

  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [location]);

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onTheme={toggle}
      />

      <Switch>
        <Route path="/">
          <Dashboard
            rows={filter.filtered}
            live={data.live}
            filter={filter}
            setFilter={filter.choosePeriod}
            loading={data.loading}
            failed={data.failed}
            retry={data.retry}
          />
        </Route>

        <Route path="/reports">
          <Reports
            rows={filter.filtered}
            filter={filter}
            setFilter={filter.choosePeriod}
          />
        </Route>

        <Route path="/about">
          <About />
        </Route>

        <Route>
          <main className="main">
            <div className="panel empty-state">
              <h1 className="display">
                Page not found
              </h1>

              <p>
                This ATMOS page does not exist.
              </p>

              <Link
                className="button primary"
                href="/"
              >
                Return to dashboard
              </Link>
            </div>
          </main>
        </Route>
      </Switch>

      <Footer />

      <BackToTop />
    </div>
  );
}

export default App;