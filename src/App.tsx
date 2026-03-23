import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

type Installation = {
  installation_id: string
  platform: string | null
  app_version: string | null
  created_at: string
  last_seen_at: string
}

type PaginatedRecordsResponse = {
  records: RecordSummary[]
  total_count: number
  skip: number
  limit: number
  has_more: boolean
}

type PaginatedInstallationsResponse = {
  installations: Installation[]
  total_count: number
  skip: number
  limit: number
  has_more: boolean
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

type FilterOption = 'all' | 'barcode' | 'photo'
type StatusFilter = 'all' | 'safe' | 'warning' | 'avoid' | 'unknown'
type TrainingFilter = 'all' | 'usable' | 'excluded'

type ChartDatum = {
  label: string
  value: number
  tone?: 'green' | 'amber' | 'red' | 'slate'
}

const API_BASE = 'https://label-wise-server.onrender.com/api'

function SkeletonCard() {
  return (
    <div style={styles.skeletonCard}>
      <div style={styles.skeletonLine} />
      <div style={styles.skeletonLine} />
      <div style={{ ...styles.skeletonLine, width: '60%' }} />
    </div>
  )
}

export function App() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [installationQuery, setInstallationQuery] = useState('')
  const [recordQuery, setRecordQuery] = useState('')
  const [routeFilter, setRouteFilter] = useState<FilterOption>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const INSTALLATIONS_PAGE_SIZE = 20
  const RECORDS_PAGE_SIZE = 25
  
  const [installationsPage, setInstallationsPage] = useState(1)
  const [recordsPage, setRecordsPage] = useState(1)
  const [totalInstallationsCount, setTotalInstallationsCount] = useState(0)
  const [totalRecordsCount, setTotalRecordsCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [installationsPage, recordsPage])

  async function loadDashboard() {
    const isInitialLoad = installationsPage === 1 && recordsPage === 1
    if (isInitialLoad) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const installationsSkip = (installationsPage - 1) * INSTALLATIONS_PAGE_SIZE
      const recordsSkip = (recordsPage - 1) * RECORDS_PAGE_SIZE

      const [installationsResponse, recordsResponse] = await Promise.all([
        fetch(`${API_BASE}/installations?skip=${installationsSkip}&limit=${INSTALLATIONS_PAGE_SIZE}`),
        fetch(`${API_BASE}/records?skip=${recordsSkip}&limit=${RECORDS_PAGE_SIZE}&include_payload=true`),
      ])

      if (!installationsResponse.ok || !recordsResponse.ok) {
        throw new Error('Failed to load dashboard data from backend')
      }

      const [installationsJson, recordsJson] = await Promise.all([
        installationsResponse.json() as Promise<PaginatedInstallationsResponse>,
        recordsResponse.json() as Promise<PaginatedRecordsResponse>,
      ])

      setInstallations((prev) => (installationsPage === 1 ? installationsJson.installations : [...prev, ...installationsJson.installations]))
      setRecords((prev) => (recordsPage === 1 ? recordsJson.records : [...prev, ...recordsJson.records]))
      setTotalInstallationsCount(installationsJson.total_count)
      setTotalRecordsCount(recordsJson.total_count)

      if (selectedRecordId != null && !recordsJson.records.some((record) => record.id === selectedRecordId)) {
        setSelectedRecordId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown dashboard error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const installationCounts = useMemo(() => {
    return records.reduce<Record<string, number>>((acc, record) => {
      acc[record.installation_id] = (acc[record.installation_id] ?? 0) + 1
      return acc
    }, {})
  }, [records])

  const platformOptions = useMemo(() => {
    return Array.from(
      new Set(records.map((record) => record.platform?.trim()).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b))
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
    const safe = records.filter((record) => normalizeStatus(record.overall_status) === 'safe').length
    const warning = records.filter((record) => normalizeStatus(record.overall_status) === 'warning').length
    const avoid = records.filter((record) => normalizeStatus(record.overall_status) === 'avoid').length
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentRecords = records.filter((record) => new Date(record.created_at).getTime() >= recentThreshold).length

    return {
      totalInstallations: totalInstallationsCount,
      totalRecords: totalRecordsCount,
      usableRecords: usable,
      excludedRecords: totalRecordsCount - usable,
      safeRecords: safe,
      warningRecords: warning,
      avoidRecords: avoid,
      latestPayloadAt: records.length > 0 ? records[0].created_at : null,
      recentRecords,
    }
  }, [totalInstallationsCount, totalRecordsCount, records])

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
      if (platformFilter !== 'all' && (record.platform ?? 'Unknown') !== platformFilter) return false
      if (categoryFilter !== 'all' && (record.payload?.input?.category_english ?? 'Unknown') !== categoryFilter) return false

      const normalizedStatus = normalizeStatus(record.overall_status)
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false

      if (trainingFilter === 'usable' && !record.usable_for_training) return false
      if (trainingFilter === 'excluded' && record.usable_for_training) return false

      if (!query) return true

      const productName = record.payload?.input?.product_name_original ?? ''
      const brand = record.payload?.input?.brand_original ?? ''
      const category = record.payload?.input?.category_english ?? ''

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
  }, [recordQuery, records, routeFilter, platformFilter, categoryFilter, statusFilter, trainingFilter])

  const paginatedInstallations = useMemo(() => {
    return filteredInstallations
  }, [filteredInstallations])

  const paginatedRecords = useMemo(() => {
    return filteredRecords
  }, [filteredRecords])

  useEffect(() => {
    setInstallationsPage(1)
  }, [installationQuery])

  useEffect(() => {
    setRecordsPage(1)
  }, [recordQuery, routeFilter, statusFilter, trainingFilter, platformFilter, categoryFilter])

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? filteredRecords[0] ?? null,
    [filteredRecords, records, selectedRecordId],
  )

  const chartData = useMemo(() => {
    const topCategories = Array.from(
      filteredRecords.reduce<Map<string, number>>((acc, record) => {
        const key = record.payload?.input?.category_english?.trim() || 'Unknown'
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, tone: 'slate' as const }))

    return {
      status: [
        { label: 'Safe', value: filteredRecords.filter((record) => normalizeStatus(record.overall_status) === 'safe').length, tone: 'green' as const },
        { label: 'Warning', value: filteredRecords.filter((record) => normalizeStatus(record.overall_status) === 'warning').length, tone: 'amber' as const },
        { label: 'Avoid', value: filteredRecords.filter((record) => normalizeStatus(record.overall_status) === 'avoid').length, tone: 'red' as const },
      ],
      route: [
        { label: 'Barcode', value: filteredRecords.filter((record) => record.route_type === 'barcode').length, tone: 'green' as const },
        { label: 'Photo', value: filteredRecords.filter((record) => record.route_type === 'photo').length, tone: 'slate' as const },
      ],
      training: [
        { label: 'Usable', value: filteredRecords.filter((record) => record.usable_for_training).length, tone: 'green' as const },
        { label: 'Excluded', value: filteredRecords.filter((record) => !record.usable_for_training).length, tone: 'red' as const },
      ],
      categories: topCategories,
    }
  }, [filteredRecords])

  const topPlatforms = useMemo(() => {
    return Array.from(
      filteredRecords.reduce<Map<string, number>>((acc, record) => {
        const key = record.platform?.trim() || 'Unknown'
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [filteredRecords])

  // Keyboard navigation support - press Shift+I to load more installations, Shift+R for records
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.shiftKey && event.key === 'I') {
        event.preventDefault()
        if (filteredInstallations.length > paginatedInstallations.length && !loadingMore) {
          setInstallationsPage((page) => page + 1)
        }
      }
      if (event.shiftKey && event.key === 'R') {
        event.preventDefault()
        if (filteredRecords.length > paginatedRecords.length && !loadingMore) {
          setRecordsPage((page) => page + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredInstallations, filteredRecords, paginatedInstallations, paginatedRecords, loadingMore])

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
          item.id === record.id ? applyTrainingFlag(item, !record.usable_for_training) : item,
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

      const filteredIds = new Set(filteredRecords.map((record) => record.id))
      setRecords((current) =>
        current.map((item) => (filteredIds.has(item.id) ? applyTrainingFlag(item, usableForTraining) : item)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update records')
    } finally {
      setBulkUpdating(false)
    }
  }

  const activeFilterCount = [routeFilter, statusFilter, trainingFilter, platformFilter, categoryFilter].filter(
    (value) => value !== 'all',
  ).length + (recordQuery.trim() ? 1 : 0)

  const installationsLoaded = installations.length
  const recordsLoaded = records.length
  const installationsHasMore = installationsLoaded < totalInstallationsCount
  const recordsHasMore = recordsLoaded < totalRecordsCount

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.kicker}>Label Wise Admin</p>
          <h1 style={styles.title}>Distillation Dashboard</h1>
          <p style={styles.subtitle}>
            Curate teacher-model payloads without fighting cramped tables. The workspace below is optimized for review,
            filtering, and training-readiness decisions.
          </p>
          <div style={styles.heroMetaRow}>
            <HeroBadge label="Last payload" value={overview.latestPayloadAt ? formatDateTime(overview.latestPayloadAt) : 'None yet'} />
            <HeroBadge label="Recent 7d" value={`${overview.recentRecords} records`} />
            <HeroBadge label="Filters" value={activeFilterCount === 0 ? 'None active' : `${activeFilterCount} active`} />
          </div>
        </div>
        <div style={styles.heroPanel}>
          <div style={styles.heroPanelTop}>
            <span style={styles.heroPanelLabel}>Training readiness</span>
            <strong style={styles.heroPanelValue}>
              {overview.totalRecords === 0 ? '0%' : `${Math.round((overview.usableRecords / overview.totalRecords) * 100)}%`}
            </strong>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: overview.totalRecords === 0 ? '0%' : `${(overview.usableRecords / overview.totalRecords) * 100}%`,
              }}
            />
          </div>
          <div style={styles.heroActions}>
            <button type="button" onClick={() => void loadDashboard()} style={styles.primaryButton}>
              Refresh data
            </button>
            <button
              type="button"
              onClick={() => void bulkUpdateTrainingEligibility(true)}
              style={styles.secondaryButton}
              disabled={bulkUpdating || filteredRecords.length === 0}
            >
              {bulkUpdating ? 'Saving...' : `Include visible (${filteredRecords.length})`}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div style={styles.loadingStateContainer}>
          <p style={styles.stateText}>📡 Loading dashboard data...</p>
          <div style={styles.skeletonsGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : null}
      {error ? (
        <div style={styles.errorStateContainer}>
          <p style={{ ...styles.stateText, color: '#9f2f2f', marginBottom: '12px' }}>⚠️ {error}</p>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => void loadDashboard()}
          >
            🔄 Retry
          </button>
        </div>
      ) : null}

      <section style={styles.summaryGrid}>
        <SummaryCard title="Installations" value={overview.totalInstallations.toString()} subtitle="Registered app instances" />
        <SummaryCard title="Payloads" value={overview.totalRecords.toString()} subtitle="Teacher records collected" />
        <SummaryCard title="Training Ready" value={overview.usableRecords.toString()} subtitle={`${overview.excludedRecords} excluded`} tone="green" />
        <SummaryCard title="Status Mix" value={`${overview.safeRecords}/${overview.warningRecords}/${overview.avoidRecords}`} subtitle="Safe / warning / avoid" />
      </section>

      <section style={styles.analyticsStrip}>
        <ChartCard title="Status Distribution" subtitle="Current filtered outcome mix">
          <HorizontalBarChart data={chartData.status} emptyLabel="No status data in current filter." />
        </ChartCard>
        <ChartCard title="Route Split" subtitle="Barcode versus photo ingestion">
          <HorizontalBarChart data={chartData.route} emptyLabel="No route data in current filter." />
        </ChartCard>
        <ChartCard title="Training State" subtitle="Visible records ready for export">
          <HorizontalBarChart data={chartData.training} emptyLabel="No training-state data in current filter." />
        </ChartCard>
        <ChartCard title="Top Categories" subtitle="Most common visible categories">
          <HorizontalBarChart data={chartData.categories} emptyLabel="No category data in current filter." />
        </ChartCard>
      </section>

      <section style={styles.workspaceGrid}>
        <article style={styles.sidebarCard}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Installations</h2>
              <p style={styles.cardSubtitle}>
                Reduced to quick operational context so the record review flow stays dominant.
              </p>
            </div>
            <span style={styles.badge}>{filteredInstallations.length}</span>
          </div>

          <input
            style={styles.input}
            placeholder="Search installation, platform, or app version"
            value={installationQuery}
            onChange={(event) => setInstallationQuery(event.target.value)}
          />

          <div style={styles.installationList}>
            {paginatedInstallations.map((item) => (
              <InstallationListItem
                key={item.installation_id}
                installation={item}
                recordCount={installationCounts[item.installation_id] ?? 0}
              />
            ))}
            {paginatedInstallations.length === 0 ? (
              <p style={styles.emptyPanelText}>No installations match the current search.</p>
            ) : null}
            {filteredInstallations.length > paginatedInstallations.length ? (
              <button
                type="button"
                style={{
                  ...styles.actionButton,
                  ...(loadingMore ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                onClick={() => setInstallationsPage((page) => page + 1)}
                disabled={loadingMore}
                title="Load more installations (or press Shift+I)"
              >
                {loadingMore ? '⟳ Loading...' : `⇓ Load more (${installationsLoaded} / ${totalInstallationsCount})`}
              </button>
            ) : null}
          </div>
        </article>

        <section style={styles.mainColumn}>
          <article style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Payload Curation</h2>
                <p style={styles.cardSubtitle}>
                  Search first, then narrow by route, status, platform, category, or training state. Records stay readable
                  while detail stays one click away.
                </p>
              </div>
              <span style={styles.badge}>{filteredRecords.length}</span>
            </div>

            <div style={styles.toolbarShell}>
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                placeholder="Search product, brand, category, route, or installation"
                value={recordQuery}
                onChange={(event) => setRecordQuery(event.target.value)}
              />
              <div style={styles.toolbarGrid}>
                <select style={styles.select} value={routeFilter} onChange={(event) => setRouteFilter(event.target.value as FilterOption)}>
                  <option value="all">All routes</option>
                  <option value="barcode">Barcode</option>
                  <option value="photo">Photo</option>
                </select>
                <select style={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="safe">Safe</option>
                  <option value="warning">Warning</option>
                  <option value="avoid">Avoid</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select style={styles.select} value={trainingFilter} onChange={(event) => setTrainingFilter(event.target.value as TrainingFilter)}>
                  <option value="all">All training states</option>
                  <option value="usable">Usable</option>
                  <option value="excluded">Excluded</option>
                </select>
                <select style={styles.select} value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
                  <option value="all">All platforms</option>
                  {platformOptions.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <select style={styles.select} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.bulkActionsRow}>
                <button
                  type="button"
                  style={styles.actionButtonPositive}
                  disabled={bulkUpdating || filteredRecords.length === 0}
                  onClick={() => void bulkUpdateTrainingEligibility(true)}
                >
                  {bulkUpdating ? 'Saving...' : `Mark visible as usable (${filteredRecords.length})`}
                </button>
                <button
                  type="button"
                  style={styles.actionButtonMuted}
                  disabled={bulkUpdating || filteredRecords.length === 0}
                  onClick={() => void bulkUpdateTrainingEligibility(false)}
                >
                  {bulkUpdating ? 'Saving...' : `Exclude visible (${filteredRecords.length})`}
                </button>
              </div>
            </div>

            <div style={styles.recordsPanel}>
              <div style={styles.recordList}>
                {paginatedRecords.map((item) => (
                  <RecordListCard
                    key={item.id}
                    record={item}
                    selected={selectedRecord?.id === item.id}
                    updating={updatingRecordId === item.id}
                    onSelect={() => setSelectedRecordId(item.id)}
                    onToggleTraining={() => void toggleTrainingEligibility(item)}
                  />
                ))}
                {paginatedRecords.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <h3 style={styles.emptyStateTitle}>No records match the current filters</h3>
                    <p style={styles.emptyPanelText}>Widen the search or reset one of the active filter controls.</p>
                  </div>
                ) : null}
                {filteredRecords.length > paginatedRecords.length ? (
                  <button
                    type="button"
                    style={{
                      ...styles.actionButton,
                      ...(loadingMore ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                    }}
                    onClick={() => setRecordsPage((page) => page + 1)}
                    disabled={loadingMore}
                    title="Load more records (or press Shift+R)"
                  >
                    {loadingMore ? '⟳ Loading...' : `⇓ Load more (${recordsLoaded} / ${totalRecordsCount})`}
                  </button>
                ) : null}
              </div>
            </div>

            <section style={styles.detailSectionShell}>
              <div style={styles.detailRailHeader}>
                <div>
                  <h3 style={styles.detailRailTitle}>Record Detail</h3>
                  <p style={styles.detailRailSubtitle}>
                    Expanded full-width review panel for the currently selected teacher payload.
                  </p>
                </div>
                {selectedRecord ? <span style={styles.badge}>#{selectedRecord.id}</span> : null}
              </div>

              {selectedRecord ? (
                <>
                  <div style={styles.detailSummaryStrip}>
                    <SummaryFact label="Status" value={displayStatus(selectedRecord.overall_status)} />
                    <SummaryFact label="Training" value={selectedRecord.usable_for_training ? 'Usable' : 'Excluded'} />
                    <SummaryFact label="Route" value={selectedRecord.route_type ?? 'Unknown'} />
                    <SummaryFact label="Platform" value={selectedRecord.platform ?? 'Unknown'} />
                    <SummaryFact label="Created" value={formatDateTime(selectedRecord.created_at)} />
                    <SummaryFact label="Installation" value={selectedRecord.installation_id} />
                  </div>

                  <div style={styles.detailGrid}>
                    <DetailSection title="Record Summary">
                      <DetailRow label="Record ID" value={`#${selectedRecord.id}`} />
                      <DetailRow label="Schema version" value={String(selectedRecord.schema_version ?? 'Unknown')} />
                      <DetailRow label="Top platforms" value={topPlatforms.map(([name, count]) => `${name} (${count})`).join(', ') || 'None'} multiline />
                    </DetailSection>

                    <DetailSection title="Platform Snapshot">
                      <DetailRow label="Platform" value={selectedRecord.platform ?? 'Unknown'} />
                      <DetailRow label="Route" value={selectedRecord.route_type ?? 'Unknown'} />
                      <DetailRow label="Installation" value={selectedRecord.installation_id} multiline />
                    </DetailSection>

                    <DetailSection title="Input Snapshot" fullWidth>
                      <DetailRow label="Product" value={selectedRecord.payload?.input?.product_name_original ?? 'Unknown'} />
                      <DetailRow label="Brand" value={selectedRecord.payload?.input?.brand_original ?? 'Unknown'} />
                      <DetailRow label="Category" value={selectedRecord.payload?.input?.category_english ?? 'Unknown'} />
                      <DetailRow label="Origin" value={selectedRecord.payload?.input?.origin_country_english ?? 'Unknown'} />
                      <DetailRow label="Barcode" value={selectedRecord.payload?.input?.barcode ?? 'Unavailable'} />
                      <DetailRow label="Ingredients" value={joinList(selectedRecord.payload?.input?.ingredients_english)} multiline />
                      <DetailRow label="Additives" value={joinList(selectedRecord.payload?.input?.additives_english)} multiline />
                      <DetailRow label="Allergens" value={joinList(selectedRecord.payload?.input?.allergens_english)} multiline />
                    </DetailSection>

                    <DetailSection title="Teacher Output" fullWidth>
                      <DetailRow label="Overall status" value={displayStatus(selectedRecord.payload?.teacher_result?.overall_status ?? 'Unknown')} />
                      <DetailRow label="Decision line" value={selectedRecord.payload?.teacher_result?.overall_line ?? 'Unavailable'} multiline />
                      <DetailRow label="Ran evaluations" value={joinList(selectedRecord.payload?.teacher_result?.ran_evaluations)} multiline />
                      <DetailRow label="Excluded domains" value={joinList(selectedRecord.payload?.metadata?.excluded_domains)} multiline />
                      <DetailRow label="Market country" value={selectedRecord.payload?.metadata?.market_country ?? 'Unavailable'} />
                    </DetailSection>

                    <DetailSection title="Raw Payload JSON" fullWidth>
                      <pre style={styles.jsonBlock}>{JSON.stringify(selectedRecord.payload, null, 2)}</pre>
                    </DetailSection>
                  </div>
                </>
              ) : (
                <div style={styles.emptyStateCard}>
                  <h3 style={styles.emptyStateTitle}>No record selected</h3>
                  <p style={styles.emptyPanelText}>Select a record to inspect its structured teacher payload.</p>
                </div>
              )}
            </section>
          </article>
        </section>
      </section>
    </main>
  )
}

function HeroBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.heroBadge}>
      <span style={styles.heroBadgeLabel}>{label}</span>
      <strong style={styles.heroBadgeValue}>{value}</strong>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone = 'default',
}: {
  title: string
  value: string
  subtitle: string
  tone?: 'default' | 'green'
}) {
  return (
    <article
      style={{
        ...styles.summaryCard,
        ...(tone === 'green' ? styles.summaryCardGreen : null),
      }}
    >
      <p style={styles.summaryTitle}>{title}</p>
      <h3 style={styles.summaryValue}>{value}</h3>
      <p style={styles.summarySubtitle}>{subtitle}</p>
    </article>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      <p style={styles.chartSubtitle}>{subtitle}</p>
      {children}
    </article>
  )
}

function HorizontalBarChart({ data, emptyLabel }: { data: ChartDatum[]; emptyLabel: string }) {
  const max = Math.max(...data.map((item) => item.value), 0)

  if (data.length === 0 || max === 0) {
    return <p style={styles.emptyPanelText}>{emptyLabel}</p>
  }

  return (
    <div style={styles.chartBars}>
      {data.map((item) => {
        const width = max === 0 ? 0 : Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)
        return (
          <div key={item.label} style={styles.chartRow}>
            <div style={styles.chartRowTop}>
              <span style={styles.chartRowLabel}>{item.label}</span>
              <strong style={styles.chartRowValue}>{item.value}</strong>
            </div>
            <div style={styles.chartTrack}>
              <div style={{ ...styles.chartFill, width: `${width}%`, ...chartTone(item.tone) }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InstallationListItem({
  installation,
  recordCount,
}: {
  installation: Installation
  recordCount: number
}) {
  return (
    <div style={styles.installationCard}>
      <div style={styles.installationTop}>
        <span style={styles.installationPlatform}>{installation.platform ?? 'Unknown'}</span>
        <span style={styles.installationCount}>{recordCount} records</span>
      </div>
      <div style={styles.installationId}>{installation.installation_id}</div>
      <div style={styles.installationMeta}>
        <span>v{installation.app_version ?? 'Unknown'}</span>
        <span>Created {formatDate(installation.created_at)}</span>
      </div>
      <div style={styles.installationLastSeen}>Last seen {formatDateTime(installation.last_seen_at)}</div>
    </div>
  )
}

function RecordListCard({
  record,
  selected,
  updating,
  onSelect,
  onToggleTraining,
}: {
  record: RecordSummary
  selected: boolean
  updating: boolean
  onSelect: () => void
  onToggleTraining: () => void
}) {
  return (
    <article
      style={{
        ...styles.recordCard,
        ...(selected ? styles.recordCardSelected : null),
      }}
      onClick={onSelect}
    >
      <div style={styles.recordCardHeader}>
        <div style={styles.recordTitleBlock}>
          <div style={styles.recordIdRow}>
            <span style={styles.inlineMetaLabel}>#{record.id}</span>
            <span style={statusPillStyle(record.overall_status)}>{displayStatus(record.overall_status)}</span>
            <span style={trainingStateStyle(record.usable_for_training)}>
              {record.usable_for_training ? 'Usable' : 'Excluded'}
            </span>
          </div>
          <h3 style={styles.recordTitle}>{record.payload?.input?.product_name_original ?? 'Unknown product'}</h3>
          <p style={styles.recordSubtitle}>{record.payload?.input?.brand_original ?? 'Unknown brand'}</p>
        </div>
        <div style={styles.recordDateBlock}>
          <strong style={styles.inlineMetaStrong}>{formatDate(record.created_at)}</strong>
          <span style={styles.inlineMetaMuted}>{formatTime(record.created_at)}</span>
        </div>
      </div>

      <div style={styles.recordFactsGrid}>
        <FactItem label="Category" value={record.payload?.input?.category_english ?? 'Unknown'} />
        <FactItem label="Origin" value={record.payload?.input?.origin_country_english ?? 'Unknown'} />
        <FactItem label="Platform" value={record.platform ?? 'Unknown'} />
        <FactItem label="Route" value={record.route_type ?? 'Unknown'} />
        <FactItem label="Installation" value={truncateMiddle(record.installation_id, 18)} />
        <FactItem label="Barcode" value={record.payload?.input?.barcode ?? 'Unavailable'} />
      </div>

      <div style={styles.recordCardFooter}>
        <div style={styles.recordDecisionLine}>
          {record.payload?.teacher_result?.overall_line ?? 'No teacher decision line available.'}
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.actionButton} onClick={onSelect}>
            Inspect
          </button>
          <button
            type="button"
            style={record.usable_for_training ? styles.actionButtonMuted : styles.actionButtonPositive}
            onClick={(event) => {
              event.stopPropagation()
              onToggleTraining()
            }}
            disabled={updating}
          >
            {updating ? 'Saving...' : record.usable_for_training ? 'Exclude' : 'Include'}
          </button>
        </div>
      </div>
    </article>
  )
}

function FactItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.factCard}>
      <span style={styles.factLabel}>{label}</span>
      <strong style={styles.factValue}>{value}</strong>
    </div>
  )
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryFactCard}>
      <span style={styles.summaryFactLabel}>{label}</span>
      <strong style={styles.summaryFactValue}>{value}</strong>
    </div>
  )
}

function DetailSection({
  title,
  children,
  fullWidth = false,
}: {
  title: string
  children: ReactNode
  fullWidth?: boolean
}) {
  return (
    <section style={{ ...styles.detailSection, ...(fullWidth ? styles.detailSectionFull : null) }}>
      <h3 style={styles.detailTitle}>{title}</h3>
      <div style={styles.detailRows}>{children}</div>
    </section>
  )
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{ ...styles.detailValue, ...(multiline ? styles.detailValueMultiline : null) }}>{value}</span>
    </div>
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

function normalizeStatus(status: string | null): 'safe' | 'warning' | 'avoid' | 'unknown' {
  const normalized = (status ?? 'unknown').toLowerCase()
  if (normalized === 'safe' || normalized === 'warning' || normalized === 'avoid') {
    return normalized
  }
  return 'unknown'
}

function displayStatus(status: string | null): string {
  const normalized = normalizeStatus(status)
  if (normalized === 'unknown') return 'Unknown'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function joinList(items?: string[] | null) {
  if (!items || items.length === 0) {
    return 'None'
  }
  return items.join(', ')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${lookup('day')} ${lookup('month')} ${lookup('year')}, ${lookup('hour')}:${lookup('minute')}:${lookup('second')}`
}

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  const slice = Math.max(4, Math.floor((maxLength - 3) / 2))
  return `${value.slice(0, slice)}...${value.slice(-slice)}`
}

function chartTone(tone: ChartDatum['tone']): CSSProperties {
  if (tone === 'green') return { background: 'linear-gradient(90deg, #146c43 0%, #35b67a 100%)' }
  if (tone === 'amber') return { background: 'linear-gradient(90deg, #9a5f0e 0%, #e0b04f 100%)' }
  if (tone === 'red') return { background: 'linear-gradient(90deg, #8d2d2b 0%, #dc6a62 100%)' }
  return { background: 'linear-gradient(90deg, #274a5d 0%, #6c9ab1 100%)' }
}

function statusPillStyle(status: string | null): CSSProperties {
  const normalized = normalizeStatus(status)
  if (normalized === 'safe') {
    return { ...styles.statusPill, background: '#e3f6ea', color: '#17633d' }
  }
  if (normalized === 'warning') {
    return { ...styles.statusPill, background: '#fff2db', color: '#8b5609' }
  }
  if (normalized === 'avoid') {
    return { ...styles.statusPill, background: '#ffe3e0', color: '#9c2f2e' }
  }
  return { ...styles.statusPill, background: '#edf1ef', color: '#5a6d62' }
}

function trainingStateStyle(usableForTraining: boolean): CSSProperties {
  return usableForTraining
    ? { ...styles.trainingStatePill, background: '#edf8f0', color: '#24673e' }
    : { ...styles.trainingStatePill, background: '#fff1ef', color: '#963b34' }
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    margin: 0,
    padding: '32px',
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    background:
      'radial-gradient(circle at top left, rgba(38, 135, 96, 0.16), transparent 32%), linear-gradient(180deg, #f7fbf8 0%, #edf4ef 100%)',
    color: '#163225',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.9fr)',
    gap: '20px',
    marginBottom: '24px',
  },
  heroCopy: {
    padding: '28px',
    borderRadius: '28px',
    background: 'linear-gradient(135deg, #123b2b 0%, #1e6448 54%, #347e76 100%)',
    color: '#f8fffb',
    boxShadow: '0 22px 44px rgba(18, 58, 43, 0.22)',
  },
  heroPanel: {
    padding: '24px',
    borderRadius: '28px',
    background: 'rgba(255,255,255,0.84)',
    border: '1px solid rgba(209, 226, 214, 0.9)',
    boxShadow: '0 18px 36px rgba(23, 54, 40, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '18px',
  },
  heroPanelTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '16px',
  },
  heroPanelLabel: {
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#5e7468',
    fontWeight: 800,
  },
  heroPanelValue: {
    fontSize: '42px',
    lineHeight: 1,
    color: '#173c2d',
  },
  progressTrack: {
    height: '14px',
    borderRadius: '999px',
    background: '#e3ece6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #166441 0%, #4bc48f 100%)',
  },
  heroActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(235, 255, 243, 0.76)',
  },
  title: {
    margin: '10px 0 12px',
    fontSize: '48px',
    lineHeight: 0.98,
  },
  subtitle: {
    margin: 0,
    maxWidth: '760px',
    color: 'rgba(240, 251, 245, 0.88)',
    fontSize: '16px',
    lineHeight: 1.6,
  },
  heroMetaRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '22px',
  },
  heroBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 14px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    minWidth: '170px',
  },
  heroBadgeLabel: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(225, 244, 233, 0.72)',
    fontWeight: 800,
  },
  heroBadgeValue: {
    fontSize: '14px',
    lineHeight: 1.4,
  },
  primaryButton: {
    border: 'none',
    background: '#173f2d',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '999px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #d3e3d7',
    background: '#ffffff',
    color: '#2f523d',
    padding: '12px 16px',
    borderRadius: '999px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  stateText: {
    marginTop: 0,
    marginBottom: '16px',
    fontWeight: 600,
  },
  loadingStateContainer: {
    marginBottom: '24px',
  },
  errorStateContainer: {
    marginBottom: '24px',
    padding: '16px',
    borderRadius: '16px',
    background: '#ffe3e0',
    border: '1px solid #f0d4d0',
  },
  skeletonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '12px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '18px',
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.84)',
    borderRadius: '22px',
    border: '1px solid #dce7dd',
    padding: '18px 20px',
    boxShadow: '0 12px 24px rgba(32, 68, 43, 0.06)',
  },
  summaryCardGreen: {
    background: 'linear-gradient(180deg, #eff8f1 0%, #e3f3e8 100%)',
  },
  summaryTitle: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6e8474',
    fontWeight: 800,
  },
  summaryValue: {
    margin: '10px 0 8px',
    fontSize: '32px',
    lineHeight: 1.05,
  },
  summarySubtitle: {
    margin: 0,
    color: '#617466',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  analyticsStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  chartCard: {
    background: 'rgba(255,255,255,0.84)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
  },
  chartTitle: {
    margin: '0 0 6px',
    fontSize: '18px',
  },
  chartSubtitle: {
    margin: '0 0 16px',
    color: '#65786a',
    fontSize: '14px',
    lineHeight: 1.45,
  },
  chartBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  chartRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  chartRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '14px',
  },
  chartRowLabel: {
    color: '#30463a',
    fontWeight: 700,
  },
  chartRowValue: {
    color: '#243b2f',
  },
  chartTrack: {
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    background: '#e7efe8',
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    borderRadius: '999px',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
    gap: '20px',
    alignItems: 'start',
  },
  sidebarCard: {
    background: 'rgba(255,255,255,0.84)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
    position: 'sticky',
    top: '24px',
  },
  mainColumn: {
    minWidth: 0,
  },
  card: {
    background: 'rgba(255,255,255,0.84)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '24px',
  },
  cardSubtitle: {
    margin: '6px 0 0',
    color: '#65786a',
    fontSize: '14px',
    lineHeight: 1.5,
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
    flexShrink: 0,
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
  toolbarShell: {
    borderRadius: '20px',
    border: '1px solid #e1ebe4',
    background: '#f9fcfa',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '18px',
  },
  toolbarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px',
  },
  bulkActionsRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  installationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  installationCard: {
    padding: '16px',
    borderRadius: '18px',
    border: '1px solid #e0ebe3',
    background: '#f9fcfa',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  installationTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
  },
  installationPlatform: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 800,
    color: '#527263',
  },
  installationCount: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#1e5b3d',
    background: '#e8f4ed',
    borderRadius: '999px',
    padding: '6px 10px',
  },
  installationId: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#20392d',
    overflowWrap: 'anywhere',
  },
  installationMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    color: '#617466',
    fontSize: '13px',
  },
  installationLastSeen: {
    color: '#6b8071',
    fontSize: '12px',
  },
  recordsPanel: {
    display: 'block',
  },
  recordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minWidth: 0,
  },
  recordCard: {
    padding: '18px',
    borderRadius: '22px',
    border: '1px solid #dde8df',
    background: '#fcfefd',
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(32, 68, 43, 0.05)',
  },
  recordCardSelected: {
    border: '1px solid #9ed1b0',
    boxShadow: '0 16px 32px rgba(39, 110, 75, 0.12)',
    background: 'linear-gradient(180deg, #fcfffd 0%, #f3faf5 100%)',
  },
  recordCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  recordTitleBlock: {
    minWidth: 0,
  },
  recordIdRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: '10px',
  },
  recordTitle: {
    margin: '0 0 4px',
    fontSize: '20px',
    lineHeight: 1.15,
    color: '#193326',
  },
  recordSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#668071',
  },
  recordDateBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'right',
    flexShrink: 0,
  },
  recordFactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
    gap: '10px',
    marginBottom: '14px',
  },
  factCard: {
    borderRadius: '14px',
    background: '#f3f8f4',
    border: '1px solid #e1ebe4',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  factLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#71867a',
    fontWeight: 800,
  },
  factValue: {
    fontSize: '13px',
    color: '#264233',
    overflowWrap: 'anywhere',
  },
  recordCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  recordDecisionLine: {
    flex: 1,
    minWidth: '240px',
    color: '#4f675b',
    lineHeight: 1.5,
    fontSize: '14px',
  },
  inlineMetaLabel: {
    color: '#6d8072',
    fontSize: '12px',
    fontWeight: 800,
  },
  inlineMetaStrong: {
    color: '#21382c',
    fontSize: '13px',
    fontWeight: 800,
  },
  inlineMetaMuted: {
    color: '#6f8274',
    fontSize: '12px',
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
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionButtonMuted: {
    border: '1px solid #f0d4d0',
    background: '#fff5f3',
    color: '#8d3a33',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  actionButtonPositive: {
    border: '1px solid #cfe5d4',
    background: '#edf8f0',
    color: '#24673e',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  trainingStatePill: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: '999px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: 800,
  },
  detailSectionShell: {
    marginTop: '18px',
    borderRadius: '22px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '18px',
  },
  detailSummaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  summaryFactCard: {
    borderRadius: '16px',
    background: '#ffffff',
    border: '1px solid #e2ebe4',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  summaryFactLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#71867a',
    fontWeight: 800,
  },
  summaryFactValue: {
    fontSize: '14px',
    color: '#1f382c',
    overflowWrap: 'anywhere',
  },
  detailRailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  detailRailTitle: {
    margin: '0 0 4px',
    fontSize: '20px',
  },
  detailRailSubtitle: {
    margin: 0,
    color: '#687d6f',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px',
  },
  detailSection: {
    borderRadius: '18px',
    border: '1px solid #e3ebe5',
    background: '#ffffff',
    padding: '16px',
  },
  detailSectionFull: {
    gridColumn: '1 / -1',
  },
  detailTitle: {
    margin: '0 0 14px',
    fontSize: '16px',
  },
  detailRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start',
  },
  detailLabel: {
    color: '#6b7d70',
    fontWeight: 800,
    fontSize: '13px',
  },
  detailValue: {
    color: '#243b2f',
    textAlign: 'left',
    flex: 1,
    fontSize: '13px',
    width: '100%',
    overflowWrap: 'anywhere',
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
  emptyStateCard: {
    borderRadius: '20px',
    border: '1px dashed #d8e5db',
    background: '#fbfdfb',
    padding: '24px',
  },
  emptyStateTitle: {
    margin: '0 0 8px',
    fontSize: '18px',
  },
  jsonBlock: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: '#102019',
    color: '#d9efde',
    borderRadius: '16px',
    padding: '16px',
    fontSize: '12px',
    lineHeight: 1.6,
    overflowX: 'auto',
  },
  skeletonCard: {
    padding: '18px',
    borderRadius: '22px',
    border: '1px solid #dde8df',
    background: '#f5f7f6',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  skeletonLine: {
    height: '14px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #e0e8e4 0%, #eef4f0 50%, #e0e8e4 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
}
