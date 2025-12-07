import { useEffect, useMemo, useState } from 'react'

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './lib/supabaseClient'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const MAX_POINTS = 60

const PALETTE = {
  amber: '#ffb703',
  gold: '#f4a259',
  orange: '#ef8354',
  teal: '#34c3b2',
  red: '#ff5f6d',
}

const SOUND_BANDS = [
  {
    id: 'low',
    label: 'Low Frequency Hum',
    range: [50, 200],
    tone: 'Dull humming indicates colony is calm and clustered. Normal baseline activity. Maintain proper ventilation and check hive entrance is clear.',
    instructions: 'No action needed. This is normal baseline activity. Monitor temperature and humidity levels.',
    accent: PALETTE.amber,
    alert: false,
  },
  {
    id: 'activity',
    label: 'Activity Buzz Band',
    range: [200, 300],
    tone: 'Stable hum with baseline spectrum. Rhythmical ventilation sounds indicate healthy worker activity. Lower frequency hum suggests normal foraging and brood care.',
    instructions: 'Colony is healthy and active. Ensure adequate food stores and check brood frames for proper development. Monitor for consistent patterns.',
    accent: PALETTE.gold,
    alert: false,
  },
  {
    id: 'queen',
    label: 'Queen Communication',
    range: [300, 500],
    tone: 'Higher amplitude with structured tonal signals. Strong broadband indicates distinct queen cues and piping. May signal queen presence or swarming preparation.',
    instructions: 'Monitor closely for swarming behavior. Inspect for queen cells and check queen health. Ensure adequate space in hive to prevent swarming.',
    accent: PALETTE.orange,
    alert: true,
  },
  {
    id: 'irregular',
    label: 'High Frequency Buzzing',
    range: [500, 700],
    tone: 'Irregular high frequency buzzing may indicate disturbance, robbing attempts, or colony stress. Monitor for patterns of agitation.',
    instructions: 'Investigate potential disturbances. Check for robbing activity, predators, or environmental stressors. Approach hive carefully and observe from distance first.',
    accent: PALETTE.orange,
    alert: true,
  },
  {
    id: 'defensive',
    label: 'Defensive Sounds',
    range: [700, Infinity],
    tone: 'Hissing and high frequency defensive sounds indicate colony is alarmed. Possible threats include predators, robbing, or severe environmental stress.',
    instructions: 'URGENT: Colony is in defensive mode. Do not approach immediately. Identify threat from safe distance. Check for robbing, predators, or extreme temperature. Wait for sounds to subside before inspection.',
    accent: PALETTE.red,
    alert: true,
  },
]

const SplashScreen = ({ status }) => (
  <motion.div
    className="splash"
    initial={{ opacity: 1 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.6 } }}
  >
    <div className="splash-content">
      <div className="hex-spinner">
        <span />
        <span />
        <span />
      </div>
      <p>{status}</p>
    </div>
  </motion.div>
)

const StatCard = ({ label, value, suffix, trend, icon }) => (
  <motion.div
    className="stat-card"
    whileHover={{ translateY: -4 }}
    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
  >
    <div className="stat-card__header">
      <span>{label}</span>
      <span className="stat-card__icon">{icon}</span>
    </div>
    <p className="stat-card__value">
      {value}
      <small>{suffix}</small>
    </p>
    <span className={`stat-card__trend ${trend >= 0 ? 'up' : 'down'}`}>
      {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
    </span>
  </motion.div>
)

const ChartPanel = ({ title, dataset, color, isMobile }) => {
  
  return (
    <div className="chart-panel">
      <div className="chart-panel__header">
        <h3>{title}</h3>
      </div>
      <div className="chart-wrapper">
        <Line
          options={{
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: isMobile ? 1.8 : 2.2,
            tension: 0.45,
            interaction: {
              intersect: false,
              mode: 'index',
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15,15,21,0.95)',
                padding: isMobile ? 8 : 12,
                titleFont: { 
                  family: 'system-ui, sans-serif',
                  size: isMobile ? 11 : 13,
                },
                bodyFont: { 
                  family: 'system-ui, sans-serif',
                  size: isMobile ? 11 : 12,
                },
                cornerRadius: 8,
                displayColors: false,
              },
            },
            scales: {
              y: {
                ticks: { 
                  color: 'var(--bee-text-muted)',
                  font: { size: isMobile ? 10 : 11 },
                  maxTicksLimit: isMobile ? 5 : 7,
                },
                grid: { color: 'rgba(255,255,255,0.06)' },
              },
              x: {
                ticks: { 
                  color: 'var(--bee-text-muted)',
                  font: { size: isMobile ? 9 : 10 },
                  maxTicksLimit: isMobile ? 6 : 10,
                },
                grid: { display: false },
              },
            },
          }}
          data={{
            labels: dataset.labels,
            datasets: [
              {
                data: dataset.values,
                borderColor: color,
                backgroundColor: context => {
                  const chart = context.chart
                  const { ctx, chartArea } = chart
                  if (!chartArea) return color + '33'
                  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
                  gradient.addColorStop(0, color + '55')
                  gradient.addColorStop(1, color + '00')
                  return gradient
                },
                borderWidth: isMobile ? 2 : 2.6,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: isMobile ? 3 : 4,
              },
            ],
          }}
        />
      </div>
    </div>
  )
}

const formatLabel = (reading, index) => {
  if (reading?.created_at) {
    return new Date(reading.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return `#${index + 1}`
}

const calculateTrend = values => {
  if (!values || values.length < 2) return 0
  const slice = values.slice(-6)
  const first = slice[0]
  const last = slice.at(-1)
  if (!first || !last) return 0
  if (first === 0) return (last - first) * 100
  return ((last - first) / first) * 100
}

function App() {
  const [readings, setReadings] = useState([])
  const [status, setStatus] = useState('Warming hive monitors…')
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const { width } = useWindowSize()
  const isMobile = width < 640

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 1400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadInitial = async () => {
      setStatus('Syncing last 60 readings…')
      const { data, error: fetchError } = await supabase
        .from('readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_POINTS)

      if (!isMounted) return

      if (fetchError) {
        setError('Unable to load hive data. Check Supabase connection.')
        setStatus('Connection lost')
      } else {
        setReadings((data ?? []).reverse())
        setStatus('Live telemetry streaming')
      }
    }

    loadInitial()

    const channel = supabase
      .channel('readings-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        payload => {
          setReadings(prev => {
            const queue = [...prev, payload.new]
            if (queue.length > MAX_POINTS) queue.shift()
            return queue
          })
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('Live telemetry streaming')
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const latest = readings.at(-1)

  const soundBand = useMemo(() => {
    if (!latest?.sound_value) return null
    const value = latest.sound_value
    // Handle the last band which has Infinity as upper bound
    return SOUND_BANDS.find(
      band => {
        if (band.range[1] === Infinity) {
          return value >= band.range[0]
        }
        return value >= band.range[0] && value < band.range[1]
      }
    )
  }, [latest])

  const tempChart = useMemo(
    () => ({
      labels: readings.map((reading, index) => formatLabel(reading, index)),
      values: readings.map(r => r.temperature ?? 0),
    }),
    [readings],
  )

  const humidityChart = useMemo(
    () => ({
      labels: readings.map((reading, index) => formatLabel(reading, index)),
      values: readings.map(r => r.humidity ?? 0),
    }),
    [readings],
  )

  const soundWave = useMemo(
    () => ({
      labels: readings.map((reading, index) => formatLabel(reading, index)),
      values: readings.map(r => r.sound_value ?? 0),
    }),
    [readings],
  )

  const showSplash = !isReady || (!latest && !error)

  const alertBand =
    soundBand && soundBand.alert
      ? soundBand
      : null

  return (
    <div className="hive-app">
      <AnimatePresence>{showSplash && <SplashScreen status={status} />}</AnimatePresence>

      <header className="hive-hero">
        <div>
          <p className="hero-label">Aurora Apiary</p>
          <h1>Beehive Vital Signs</h1>
          <p className="hero-meta">{status}</p>
        </div>
        {latest && (
          <motion.div
            className="hero-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span>Last update</span>
            <strong>
              {latest.created_at
                ? new Date(latest.created_at).toLocaleTimeString()
                : 'just now'}
            </strong>
          </motion.div>
        )}
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          label="Temperature"
          value={latest?.temperature ?? '—'}
          suffix="°C"
          trend={calculateTrend(readings.map(r => r.temperature))}
          icon="🌡️"
        />
        <StatCard
          label="Humidity" 
          value={latest?.humidity ?? '—'}
          suffix="%"
          trend={calculateTrend(readings.map(r => r.humidity))}
          icon="💧"
        />
        <StatCard
          label="Sound Frequency"
          value={latest?.sound_value ?? '—'}
          suffix="Hz"
          trend={calculateTrend(readings.map(r => r.sound_value))}
          icon="🎧"
        />
        <StatCard
          label="Band"
          value={soundBand?.label ?? 'No signal'}
          suffix=""
          trend={0}
          icon="🐝"
        />
      </section>

      <section className="charts">
        <ChartPanel title="Temperature °C" dataset={tempChart} color={PALETTE.amber} isMobile={isMobile} />
        <ChartPanel title="Humidity %" dataset={humidityChart} color={PALETTE.teal} isMobile={isMobile} />
        <div className="chart-panel waveform">
          <div className="chart-panel__header">
            <h3>Sound Waveform Hz</h3>
            {soundBand && <span style={{ color: soundBand.accent }}>{soundBand.label}</span>}
          </div>
          <div className="chart-wrapper">
            <Line
              options={{
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: isMobile ? 1.8 : 2.2,
                tension: 0.35,
                interaction: {
                  intersect: false,
                  mode: 'index',
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(15,15,21,0.95)',
                    padding: isMobile ? 8 : 12,
                    titleFont: { 
                      family: 'system-ui, sans-serif',
                      size: isMobile ? 11 : 13,
                    },
                    bodyFont: { 
                      family: 'system-ui, sans-serif',
                      size: isMobile ? 11 : 12,
                    },
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      label: (context) => {
                        return `Frequency: ${context.parsed.y.toFixed(0)} Hz`
                      }
                    }
                  },
                },
                scales: {
                  y: {
                    ticks: { 
                      color: 'var(--bee-text-muted)',
                      font: { size: isMobile ? 10 : 11 },
                      maxTicksLimit: isMobile ? 5 : 7,
                      callback: function(value) {
                        return value.toFixed(0) + ' Hz'
                      }
                    },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                  },
                  x: {
                    ticks: { 
                      color: 'var(--bee-text-muted)',
                      font: { size: isMobile ? 9 : 10 },
                      maxTicksLimit: isMobile ? 6 : 10,
                    },
                    grid: { display: false },
                  },
                },
              }}
              data={{
                labels: soundWave.labels,
                datasets: [
                  {
                    data: soundWave.values,
                    borderColor: soundBand?.accent ?? PALETTE.gold,
                    borderWidth: isMobile ? 1.5 : 2,
                    fill: {
                      target: 'origin',
                      above: 'rgba(255,191,0,0.25)',
                      below: 'rgba(255,191,0,0.25)',
                    },
                    pointRadius: 0,
                    pointHoverRadius: isMobile ? 3 : 4,
                  },
                ],
              }}
            />
          </div>
        </div>
      </section>

      <section className="band-grid">
        {SOUND_BANDS.map(band => {
          const active = band.id === soundBand?.id
          return (
            <motion.article
              key={band.id}
              className={`band-card ${active ? 'active' : ''}`}
              style={{ borderColor: active ? band.accent : 'transparent' }}
              initial={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
            >
              <header>
                <h4>{band.label}</h4>
                <span>
                  {band.range[0]} - {band.range[1] === Infinity ? '700+' : band.range[1]} Hz
                </span>
              </header>
              <p>{band.tone}</p>
              {active && <em>Currently detected</em>}
            </motion.article>
          )
        })}
      </section>

      <AnimatePresence>
        {alertBand && (
          <motion.div
            className="alert-pop"
            initial={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 30 }}
          >
            <div className="alert-pop__header">
              <strong>{alertBand.label} Alert</strong>
              <span className="alert-pop__value">
                {latest?.sound_value?.toFixed(0) ?? '—'} Hz
              </span>
            </div>
            <p className="alert-pop__description">{alertBand.tone}</p>
            <div className="alert-pop__instructions">
              <strong>Recommended Action:</strong>
              <p>{alertBand.instructions}</p>
            </div>
            <button
              type="button"
              className="alert-pop__button"
              onClick={() => window.open('https://bee-health.com/management', '_blank')}
            >
              View Detailed Response Guide
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
