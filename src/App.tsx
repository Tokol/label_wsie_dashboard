import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

type Installation = {
  installation_id: string
  platform: string | null
  app_version: string | null
  created_at: string
  last_seen_at: string
}

type RecordPayload = {
  schema_version?: number
  created_at_epoch_ms?: number
  input?: {
    barcode?: string | null
    product_name_original?: string | null
    brand_original?: string | null
    category_english?: string | null
    origin_country_english?: string | null
    ingredients_english?: string[]
    additives_english?: string[]
    allergens_english?: string[]
    nutri_score?: string | null
    nova_group?: number | null
  }
  teacher_result?: {
    overall_status?: string | null
    overall_line?: string | null
    ran_evaluations?: string[]
  }
  metadata?: {
    usable_for_training?: boolean
    market_country?: string | null
    excluded_domains?: string[]
  }
  preferences?: Record<string, unknown>
  [key: string]: unknown
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
  payload: RecordPayload | null
}

const API_BASE = 'https://label-wise-server.onrender.com/api'

export function App() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [installationQuery, setInstallationQuery] = useState('')
  const [recordQuery, setRecordQuery] = useState('')
  const [routeFilter, setRouteFilter] = useState<'all' | 'barcode' | 'photo'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'warning' | 'avoid' | 'unknown'>('all')
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'usable' | 'excluded'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      const [installationsResponse, recordsResponse] = await Promise.all([
        fetch(`${API_BASE}/installations`),
        fetch(`${API_BASE}/records?include_payload=true`),
      ])

      if (!installationsResponse.ok || !recordsResponse.ok) {
        throw new Error('Failed to load dashboard data from backend')
      }

      const [installationsJson, recordsJson] = await Promise.all([
        installationsResponse.json() as Promise<Installation[]>,
        recordsResponse.json() as Promise<RecordSummary[]>,
      ])

      setInstallations(installationsJson)
      setRecords(recordsJson)

      if (selectedRecordId != null && !recordsJson.some((record) => record.id === selectedRecordId)) {
        setSelectedRecordId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown dashboard error')
    } finally {
      setLoading(false)
    }
  }

  const installationCounts = useMemo(() => {
    return records.reduce<Record<string, number>>((acc, record) => {
      acc[record.installation_id] = (acc[record.installation_id] ?? 0) + 1
      return acc
    }, {})
  }, [records])

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        records
          .map((record) => record.payload?.input?.category_english?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [records])

  const overview = useMemo(() => {
    const usable = records.filter((record) => record.usable_for_training).length
    const barcode = records.filter((record) => record.route_type === 'barcode').length
    const photo = records.filter((record) => record.route_type === 'photo').length
    const statusCounts = records.reduce<Record<string, number>>((acc, record) => {
      const key = (record.overall_status ?? 'Unknown').toLowerCase()
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return {
      totalInstallations: installations.length,
      totalRecords: records.length,
      usableRecords: usable,
      excludedRecords: records.length - usable,
      barcodeRecords: barcode,
      photoRecords: photo,
      latestPayloadAt: records.length > 0 ? records[0].created_at : null,
      safeCount: statusCounts.safe ?? 0,
      warningCount: statusCounts.warning ?? 0,
      avoidCount: statusCounts.avoid ?? 0,
    }
  }, [installations.length, records])

  const filteredInstallations = useMemo(() => {
    const query = installationQuery.trim().toLowerCase()
    return installations.filter((installation) => {
      if (!query) return true
      return (
        installation.installation_id.toLowerCase().includes(query) ||
        (installation.platform ?? '').toLowerCase().includes(query) ||
        (installation.app_version ?? '').toLowerCase().includes(query)
      )
    })
  }, [installationQuery, installations])

  const filteredRecords = useMemo(() => {
    const query = recordQuery.trim().toLowerCase()
    return records.filter((record) => {
      if (routeFilter !== 'all' && record.route_type !== routeFilter) return false

      const normalizedStatus = (record.overall_status ?? 'unknown').toLowerCase()
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false

      if (trainingFilter === 'usable' && !record.usable_for_training) return false
      if (trainingFilter === 'excluded' && record.usable_for_training) return false

      const category = record.payload?.input?.category_english ?? ''
      if (categoryFilter !== 'all' && category !== categoryFilter) return false

      if (!query) return true

      const productName = record.payload?.input?.product_name_original ?? ''
      const brand = record.payload?.input?.brand_original ?? ''

      return [
        record.id.toString(),
        record.installation_id,
        record.route_type ?? '',
        record.platform ?? '',
        record.overall_status ?? '',
        productName,
        brand,
        category,
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [recordQuery, records, routeFilter, statusFilter, trainingFilter, categoryFilter])

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  )

  async function toggleTrainingEligibility(record: RecordSummary) {
    setUpdatingRecordId(record.id)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/records/${record.id}/training-eligibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usable_for_training: !record.usable_for_training,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update training eligibility')
      }

      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? applyTrainingFlag(item, !record.usable_for_training)
            : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record')
    } finally {
      setUpdatingRecordId(null)
    }
  }

  async function bulkUpdateTrainingEligibility(usableForTraining: boolean) {
    if (filteredRecords.length === 0) return

    setBulkUpdating(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/records/training-eligibility/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_ids: filteredRecords.map((record) => record.id),
          usable_for_training: usableForTraining,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update filtered records')
      }

      setRecords((current) =>
        current.map((item) =>
          filteredRecords.some((record) => record.id === item.id)
            ? applyTrainingFlag(item, usableForTraining)
            : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update records')
    } finally {
      setBulkUpdating(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.kicker}>Label Wise Admin</p>
          <h1 style={styles.title}>Distillation Dashboard</h1>
          <p style={styles.subtitle}>
            Track installation activity, inspect structured teacher payloads, filter dataset quality, and prepare a trustworthy student-model training set.
          </p>
        </div>
        <button type="button" onClick={() => void loadDashboard()} style={styles.secondaryButton}>
          Refresh Data
        </button>
      </section>

      {loading ? <p style={styles.stateText}>Loading backend data…</p> : null}
      {error ? <p style={{ ...styles.stateText, color: '#9f2f2f' }}>{error}</p> : null}

      <section style={styles.summaryGrid}>
        <SummaryCard title="Installations" value={overview.totalInstallations.toString()} subtitle="Registered app instances" />
        <SummaryCard title="Payloads" value={overview.totalRecords.toString()} subtitle="Teacher records collected" />
        <SummaryCard title="Training-Eligible" value={overview.usableRecords.toString()} subtitle={`${overview.excludedRecords} currently excluded`} tone="green" />
        <SummaryCard title="Latest Payload" value={overview.latestPayloadAt ? formatDateTime(overview.latestPayloadAt) : 'None yet'} subtitle="Most recent ingested record" wide />
      </section>

      <section style={styles.visualGrid}>
        <article style={styles.card}>
          <div style={styles.cardHeaderCompact}>
            <div>
              <h2 style={styles.cardTitle}>Distillation Pipeline</h2>
              <p style={styles.cardSubtitle}>A truthful workflow view of where the dataset currently stands.</p>
            </div>
          </div>
          <div style={styles.pipelineRow}>
            <PipelineStep label="Collected" value={overview.totalRecords} active />
            <PipelineStep label="Filtered" value={overview.usableRecords} />
            <PipelineStep label="Prepared" value={0} />
            <PipelineStep label="Training" value={0} />
            <PipelineStep label="Evaluated" value={0} />
            <PipelineStep label="Deployed" value={0} />
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeaderCompact}>
            <div>
              <h2 style={styles.cardTitle}>Visual Summary</h2>
              <p style={styles.cardSubtitle}>Quick status and route-level distribution of current payload records.</p>
            </div>
          </div>
          <div style={styles.metricsGrid}>
            <MetricBar title="Status Mix" items={[
              { label: 'Safe', value: overview.safeCount, color: '#2f7a4b' },
              { label: 'Warning', value: overview.warningCount, color: '#c98b1c' },
              { label: 'Avoid', value: overview.avoidCount, color: '#c44737' },
            ]} />
            <MetricBar title="Route Split" items={[
              { label: 'Barcode', value: overview.barcodeRecords, color: '#2f7a4b' },
              { label: 'Photo', value: overview.photoRecords, color: '#5a8aa5' },
            ]} />
            <MetricBar title="Training State" items={[
              { label: 'Usable', value: overview.usableRecords, color: '#2f7a4b' },
              { label: 'Excluded', value: overview.excludedRecords, color: '#a1443b' },
            ]} />
          </div>
        </article>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <div style={styles.cardHeaderCompact}>
            <div>
              <h2 style={styles.cardTitle}>Installations</h2>
              <p style={styles.cardSubtitle}>Observe app registrations and recent installation activity.</p>
            </div>
            <span style={styles.badge}>{filteredInstallations.length}</span>
          </div>

          <input
            style={styles.input}
            placeholder="Search installation, platform, or app version"
            value={installationQuery}
            onChange={(event) => setInstallationQuery(event.target.value)}
          />

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Installation ID</th>
                  <th style={styles.th}>Platform</th>
                  <th style={styles.th}>App Version</th>
                  <th style={styles.th}>Records</th>
                  <th style={styles.th}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstallations.map((item) => (
                  <tr key={item.installation_id}>
                    <td style={styles.tdStrong}>{item.installation_id}</td>
                    <td style={styles.td}>{item.platform ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.app_version ?? 'Unknown'}</td>
                    <td style={styles.td}>{installationCounts[item.installation_id] ?? 0}</td>
                    <td style={styles.td}>{formatDateTime(item.last_seen_at)}</td>
                  </tr>
                ))}
                {filteredInstallations.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>No installations match the current filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeaderCompact}>
            <div>
              <h2 style={styles.cardTitle}>Payload Records</h2>
              <p style={styles.cardSubtitle}>Inspect records, filter by category/status/product, and curate training inclusion at record or filtered-set level.</p>
            </div>
            <span style={styles.badge}>{filteredRecords.length}</span>
          </div>

          <div style={styles.filtersRow}>
            <input
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
              placeholder="Search record, product, brand, route, or installation"
              value={recordQuery}
              onChange={(event) => setRecordQuery(event.target.value)}
            />
            <select style={styles.select} value={routeFilter} onChange={(event) => setRouteFilter(event.target.value as typeof routeFilter)}>
              <option value="all">All routes</option>
              <option value="barcode">Barcode</option>
              <option value="photo">Photo</option>
            </select>
            <select style={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="safe">Safe</option>
              <option value="warning">Warning</option>
              <option value="avoid">Avoid</option>
              <option value="unknown">Unknown</option>
            </select>
            <select style={styles.select} value={trainingFilter} onChange={(event) => setTrainingFilter(event.target.value as typeof trainingFilter)}>
              <option value="all">All training states</option>
              <option value="usable">Usable</option>
              <option value="excluded">Excluded</option>
            </select>
            <select style={styles.select} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div style={styles.bulkActionRow}>
            <span style={styles.bulkActionLabel}>{filteredRecords.length} filtered records</span>
            <button
              type="button"
              style={styles.actionButtonPositive}
              onClick={() => void bulkUpdateTrainingEligibility(true)}
              disabled={bulkUpdating || filteredRecords.length === 0}
            >
              {bulkUpdating ? 'Saving…' : 'Include filtered'}
            </button>
            <button
              type="button"
              style={styles.actionButtonMuted}
              onClick={() => void bulkUpdateTrainingEligibility(false)}
              disabled={bulkUpdating || filteredRecords.length === 0}
            >
              {bulkUpdating ? 'Saving…' : 'Exclude filtered'}
            </button>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Installation</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Training</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.tdStrong}>#{item.id}</td>
                    <td style={styles.td}>
                      <div style={styles.productCellTitle}>{item.payload?.input?.product_name_original ?? 'Unknown product'}</div>
                      <div style={styles.productCellMeta}>{item.payload?.input?.brand_original ?? 'Unknown brand'}</div>
                      <div style={styles.productCellMeta}>{formatDateTime(item.created_at)}</div>
                    </td>
                    <td style={styles.td}>{item.payload?.input?.category_english ?? 'Unknown'}</td>
                    <td style={styles.td}>{item.installation_id}</td>
                    <td style={styles.td}>
                      <span style={statusPillStyle(item.overall_status)}>{item.overall_status ?? 'Unknown'}</span>
                    </td>
                    <td style={styles.td}>{item.usable_for_training ? 'Usable' : 'Excluded'}</td>
                    <td style={styles.td}>
                      <div style={styles.actionRow}>
                        <button type="button" style={styles.actionButton} onClick={() => setSelectedRecordId(item.id)}>
                          Inspect
                        </button>
                        <button
                          type="button"
                          style={item.usable_for_training ? styles.actionButtonMuted : styles.actionButtonPositive}
                          onClick={() => void toggleTrainingEligibility(item)}
                          disabled={updatingRecordId === item.id}
                        >
                          {updatingRecordId === item.id
                            ? 'Saving…'
                            : item.usable_for_training
                              ? 'Exclude'
                              : 'Re-include'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>No payload records match the current filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section style={styles.detailCard}>
        <div style={styles.cardHeaderCompact}>
          <div>
            <h2 style={styles.cardTitle}>Payload Detail</h2>
            <p style={styles.cardSubtitle}>Inspect the exact teacher payload before export or student-model fine-tuning.</p>
          </div>
        </div>
        {selectedRecord ? (
          <div style={styles.detailGrid}>
            <DetailSection title="Record Summary">
              <DetailRow label="Record ID" value={`#${selectedRecord.id}`} />
              <DetailRow label="Created" value={formatDateTime(selectedRecord.created_at)} />
              <DetailRow label="Installation" value={selectedRecord.installation_id} />
              <DetailRow label="Route" value={selectedRecord.route_type ?? 'Unknown'} />
              <DetailRow label="Status" value={selectedRecord.overall_status ?? 'Unknown'} />
              <DetailRow label="Training" value={selectedRecord.usable_for_training ? 'Usable' : 'Excluded'} />
            </DetailSection>
            <DetailSection title="Input Snapshot">
              <DetailRow label="Product" value={selectedRecord.payload?.input?.product_name_original ?? 'Unknown'} />
              <DetailRow label="Brand" value={selectedRecord.payload?.input?.brand_original ?? 'Unknown'} />
              <DetailRow label="Category" value={selectedRecord.payload?.input?.category_english ?? 'Unknown'} />
              <DetailRow label="Origin" value={selectedRecord.payload?.input?.origin_country_english ?? 'Unknown'} />
              <DetailRow label="Barcode" value={selectedRecord.payload?.input?.barcode ?? 'Unavailable'} />
              <DetailRow label="Ingredients" value={joinList(selectedRecord.payload?.input?.ingredients_english)} multiline />
              <DetailRow label="Additives" value={joinList(selectedRecord.payload?.input?.additives_english)} multiline />
              <DetailRow label="Allergens" value={joinList(selectedRecord.payload?.input?.allergens_english)} multiline />
            </DetailSection>
            <DetailSection title="Teacher Output">
              <DetailRow label="Overall status" value={selectedRecord.payload?.teacher_result?.overall_status ?? 'Unknown'} />
              <DetailRow label="Decision line" value={selectedRecord.payload?.teacher_result?.overall_line ?? 'Unavailable'} multiline />
              <DetailRow label="Ran evaluations" value={joinList(selectedRecord.payload?.teacher_result?.ran_evaluations)} multiline />
              <DetailRow label="Excluded domains" value={joinList(selectedRecord.payload?.metadata?.excluded_domains)} multiline />
              <DetailRow label="Market country" value={selectedRecord.payload?.metadata?.market_country ?? 'Unavailable'} />
            </DetailSection>
            <DetailSection title="Raw Payload JSON" fullWidth>
              <pre style={styles.jsonBlock}>{JSON.stringify(selectedRecord.payload, null, 2)}</pre>
            </DetailSection>
          </div>
        ) : (
          <p style={styles.emptyPanelText}>Select a payload record to inspect its structured teacher payload.</p>
        )}
      </section>
    </main>
  )
}

function applyTrainingFlag(record: RecordSummary, usableForTraining: boolean): RecordSummary {
  return {
    ...record,
    usable_for_training: usableForTraining,
    payload: record.payload
      ? {
          ...record.payload,
          metadata: {
            ...(record.payload.metadata ?? {}),
            usable_for_training: usableForTraining,
          },
        }
      : record.payload,
  }
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone = 'default',
  wide = false,
}: {
  title: string
  value: string
  subtitle: string
  tone?: 'default' | 'green'
  wide?: boolean
}) {
  return (
    <article
      style={{
        ...styles.summaryCard,
        ...(wide ? styles.summaryCardWide : null),
        ...(tone === 'green' ? styles.summaryCardGreen : null),
      }}
    >
      <p style={styles.summaryTitle}>{title}</p>
      <h3 style={styles.summaryValue}>{value}</h3>
      <p style={styles.summarySubtitle}>{subtitle}</p>
    </article>
  )
}

function PipelineStep({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <div style={{ ...styles.pipelineStep, ...(active ? styles.pipelineStepActive : null) }}>
      <span style={styles.pipelineLabel}>{label}</span>
      <strong style={styles.pipelineValue}>{value}</strong>
    </div>
  )
}

function MetricBar({ title, items }: { title: string; items: Array<{ label: string; value: number; color: string }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return (
    <section style={styles.metricCard}>
      <h3 style={styles.metricTitle}>{title}</h3>
      <div style={styles.metricStack}>
        {items.map((item) => {
          const width = total > 0 ? `${(item.value / total) * 100}%` : '0%'
          return <span key={item.label} style={{ ...styles.metricSegment, width, background: item.color }} />
        })}
      </div>
      <div style={styles.metricLegend}>
        {items.map((item) => (
          <div key={item.label} style={styles.metricLegendItem}>
            <span style={{ ...styles.metricDot, background: item.color }} />
            <span style={styles.metricLegendText}>{item.label}</span>
            <strong style={styles.metricLegendValue}>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function DetailSection({ title, children, fullWidth = false }: { title: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <section style={{ ...styles.detailSection, ...(fullWidth ? styles.detailSectionFull : null) }}>
      <h3 style={styles.detailTitle}>{title}</h3>
      <div style={styles.detailRows}>{children}</div>
    </section>
  )
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{ ...styles.detailValue, ...(multiline ? styles.detailValueMultiline : null) }}>{value}</span>
    </div>
  )
}

function joinList(items?: string[] | null) {
  if (!items || items.length === 0) return 'None'
  return items.join(', ')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function statusPillStyle(status: string | null): CSSProperties {
  const normalized = (status ?? 'Unknown').toLowerCase()
  if (normalized === 'safe') return { ...styles.statusPill, background: '#e7f6ec', color: '#256b3f' }
  if (normalized === 'warning') return { ...styles.statusPill, background: '#fff3df', color: '#8a5b12' }
  if (normalized === 'avoid') return { ...styles.statusPill, background: '#ffe6e3', color: '#a1362f' }
  return { ...styles.statusPill, background: '#eef2ef', color: '#617466' }
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
    fontSize: '44px',
    lineHeight: 1.02,
  },
  subtitle: {
    margin: 0,
    maxWidth: '860px',
    color: '#617466',
    fontSize: '16px',
    lineHeight: 1.5,
  },
  secondaryButton: {
    border: '1px solid #d3e3d7',
    background: '#ffffff',
    color: '#2f523d',
    padding: '12px 16px',
    borderRadius: '999px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  stateText: {
    marginTop: 0,
    marginBottom: '16px',
    fontWeight: 600,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.86)',
    borderRadius: '22px',
    border: '1px solid #dce7dd',
    padding: '18px 20px',
    boxShadow: '0 12px 24px rgba(32, 68, 43, 0.06)',
  },
  summaryCardWide: {
    gridColumn: 'span 2',
  },
  summaryCardGreen: {
    background: 'linear-gradient(180deg, #eff8f1 0%, #e6f4ea 100%)',
  },
  summaryTitle: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6e8474',
    fontWeight: 700,
  },
  summaryValue: {
    margin: '10px 0 8px',
    fontSize: '26px',
    lineHeight: 1.15,
  },
  summarySubtitle: {
    margin: 0,
    color: '#617466',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  visualGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.88)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
  },
  detailCard: {
    background: 'rgba(255,255,255,0.88)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
  },
  cardHeaderCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '26px',
  },
  cardSubtitle: {
    margin: '6px 0 0',
    color: '#65786a',
    fontSize: '14px',
    lineHeight: 1.45,
    maxWidth: '780px',
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
  pipelineRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  pipelineStep: {
    borderRadius: '18px',
    border: '1px solid #e1ebe3',
    background: '#f8fbf8',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pipelineStepActive: {
    border: '1px solid #b7dbbf',
    background: '#edf8f0',
  },
  pipelineLabel: {
    fontSize: '12px',
    color: '#6a7e70',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  pipelineValue: {
    fontSize: '28px',
    color: '#234d34',
  },
  metricsGrid: {
    display: 'grid',
    gap: '14px',
  },
  metricCard: {
    borderRadius: '18px',
    border: '1px solid #e3ebe5',
    background: '#fbfdfb',
    padding: '14px 16px',
  },
  metricTitle: {
    margin: '0 0 10px',
    fontSize: '16px',
  },
  metricStack: {
    display: 'flex',
    width: '100%',
    height: '12px',
    overflow: 'hidden',
    borderRadius: '999px',
    background: '#edf2ed',
    marginBottom: '12px',
  },
  metricSegment: {
    height: '100%',
  },
  metricLegend: {
    display: 'grid',
    gap: '8px',
  },
  metricLegendItem: {
    display: 'grid',
    gridTemplateColumns: '12px 1fr auto',
    gap: '8px',
    alignItems: 'center',
  },
  metricDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  metricLegendText: {
    color: '#5f7365',
    fontSize: '13px',
  },
  metricLegendValue: {
    color: '#264433',
    fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr',
    gap: '20px',
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d3e2d5',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '14px',
    background: '#fff',
  },
  select: {
    border: '1px solid #d3e2d5',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '14px',
    background: '#fff',
    color: '#274634',
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  bulkActionRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  bulkActionLabel: {
    color: '#617466',
    fontWeight: 700,
    marginRight: '6px',
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
  tdStrong: {
    padding: '12px 0',
    borderBottom: '1px solid #eef3ef',
    fontSize: '14px',
    color: '#243b2f',
    verticalAlign: 'top',
    fontWeight: 700,
  },
  productCellTitle: {
    fontWeight: 700,
    color: '#21382c',
    marginBottom: '4px',
  },
  productCellMeta: {
    color: '#6f8274',
    fontSize: '13px',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    border: '1px solid #d6e2d8',
    background: '#fff',
    color: '#274634',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionButtonMuted: {
    border: '1px solid #f0d4d0',
    background: '#fff5f3',
    color: '#8d3a33',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionButtonPositive: {
    border: '1px solid #cfe5d4',
    background: '#edf8f0',
    color: '#24673e',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  emptyCell: {
    padding: '16px 0',
    color: '#738778',
    fontStyle: 'italic',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },
  detailSection: {
    borderRadius: '18px',
    border: '1px solid #e3ebe5',
    background: '#fbfdfb',
    padding: '16px',
  },
  detailSectionFull: {
    gridColumn: '1 / -1',
  },
  detailTitle: {
    margin: '0 0 14px',
    fontSize: '18px',
  },
  detailRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    color: '#6b7d70',
    fontWeight: 700,
    minWidth: '132px',
  },
  detailValue: {
    color: '#243b2f',
    textAlign: 'right',
    flex: 1,
  },
  detailValueMultiline: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  emptyPanelText: {
    margin: 0,
    color: '#6f8274',
    fontStyle: 'italic',
  },
  jsonBlock: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: '#0f1b13',
    color: '#d9efde',
    borderRadius: '16px',
    padding: '16px',
    fontSize: '12px',
    lineHeight: 1.6,
    overflowX: 'auto',
  },
}
