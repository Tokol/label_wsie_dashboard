import { useEffect, useState, type CSSProperties } from 'react'

type Installation = {
  installation_id: string
  platform: string | null
  app_version: string | null
  created_at: string
  last_seen_at: string
}

type RecordSummary = {
  id: number
  installation_id: string
  schema_version: number | null
  route_type: string | null
  platform: string | null
  overall_status: string | null
  usable_for_training: boolean
  created_at: string
}

const API_BASE = 'https://label-wise-server.onrender.com/api'

export function App() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [installationsResponse, recordsResponse] = await Promise.all([
          fetch(`${API_BASE}/installations`),
          fetch(`${API_BASE}/records`),
        ])

        if (!installationsResponse.ok || !recordsResponse.ok) {
          throw new Error('Failed to load dashboard data from backend')
        }

        const [installationsJson, recordsJson] = await Promise.all([
          installationsResponse.json() as Promise<Installation[]>,
          recordsResponse.json() as Promise<RecordSummary[]>,
        ])

        if (!ignore) {
          setInstallations(installationsJson)
          setRecords(recordsJson)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Unknown dashboard error')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.kicker}>Label Wise Admin</p>
          <h1 style={styles.title}>Server Dashboard</h1>
          <p style={styles.subtitle}>
            Inspect installation registrations and incoming distillation payload records.
          </p>
        </div>
        <a href="https://label-wise-server.onrender.com/health" target="_blank" rel="noreferrer" style={styles.healthLink}>
          Open API health
        </a>
      </section>

      {loading ? <p style={styles.stateText}>Loading backend data…</p> : null}
      {error ? <p style={{ ...styles.stateText, color: '#9f2f2f' }}>{error}</p> : null}

      <section style={styles.grid}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Installations</h2>
            <span style={styles.badge}>{installations.length}</span>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Installation ID</th>
                  <th style={styles.th}>Platform</th>
                  <th style={styles.th}>App Version</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {installations.map((item) => (
                  <tr key={item.installation_id}>
                    <td style={styles.td}>{item.installation_id}</td>
                    <td style={styles.td}>{item.platform ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.app_version ?? 'Unknown'}</td>
                    <td style={styles.td}>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {installations.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>No installations registered yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Payload Records</h2>
            <span style={styles.badge}>{records.length}</span>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Installation</th>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Platform</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Training</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.id}</td>
                    <td style={styles.td}>{item.installation_id}</td>
                    <td style={styles.td}>{item.route_type ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.platform ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.overall_status ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.usable_for_training ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                {records.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>No payloads ingested yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    margin: 0,
    padding: '32px',
    fontFamily: 'system-ui, sans-serif',
    background: 'linear-gradient(180deg, #f6fbf7 0%, #edf5ee 100%)',
    color: '#1f3528',
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
    marginBottom: '24px',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#4b7c5b',
  },
  title: {
    margin: '8px 0 10px',
    fontSize: '40px',
    lineHeight: 1.05,
  },
  subtitle: {
    margin: 0,
    maxWidth: '720px',
    color: '#617466',
    fontSize: '16px',
  },
  healthLink: {
    alignSelf: 'center',
    textDecoration: 'none',
    background: '#2f7a4b',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '999px',
    fontWeight: 700,
  },
  stateText: {
    marginTop: 0,
    marginBottom: '16px',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.88)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '22px',
  },
  badge: {
    minWidth: '36px',
    height: '36px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ebf6ef',
    color: '#2f7a4b',
    fontWeight: 800,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#758879',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5ece6',
  },
  td: {
    padding: '12px 0',
    borderBottom: '1px solid #eef3ef',
    fontSize: '14px',
    color: '#30463a',
    verticalAlign: 'top',
  },
  emptyCell: {
    padding: '16px 0',
    color: '#738778',
    fontStyle: 'italic',
  },
}
