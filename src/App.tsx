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

type DistillationBatch = {
  batch_id: string
  exported_count: number
  safe_count: number
  warning_count: number
  unsafe_count: number
  cannot_assess_count: number
  unknown_count: number
  exported_at: string | null
  last_used_in_training_at: string | null
  latest_record_at: string | null
  status: 'ready_for_training' | 'used_in_training'
  ready_for_training: boolean
}

type DistillationBatchListResponse = {
  batches: DistillationBatch[]
  total_count: number
  skip: number
  limit: number
  has_more: boolean
}

type DistillationJob = {
  id: number
  batch_id: string
  base_model: string
  task_type: string
  dataset_mode: string
  status: string
  progress_stage: string
  train_record_count: number | null
  validation_record_count: number | null
  metrics_json: Record<string, unknown> | null
  error_message: string | null
  progress_percent: number
  created_at: string
  started_at: string | null
  finished_at: string | null
}

type DistillationJobListResponse = {
  jobs: DistillationJob[]
  total_count: number
  skip: number
  limit: number
  has_more: boolean
}

type ModelVersion = {
  id: number
  job_id: number
  batch_id: string
  model_name: string
  base_model: string
  task_type: string
  status: string
  metrics_json: Record<string, unknown> | null
  artifact_uri: string | null
  created_at: string
  activated_at: string | null
  archived_at: string | null
}

type ModelVersionListResponse = {
  versions: ModelVersion[]
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
    distillation_status?: DistillationStatus
    distillation_batch_id?: string | null
    reviewed_at?: string | null
    exported_at?: string | null
    used_in_training_at?: string | null
    excluded_reason?: string | null
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
  distillation_status: DistillationStatus
  distillation_batch_id: string | null
  reviewed_at: string | null
  exported_at: string | null
  used_in_training_at: string | null
  excluded_reason: string | null
  created_at: string
  payload: RecordPayload | null
}

type DistillationStatus =
  | 'pending_review'
  | 'approved_for_distillation'
  | 'excluded'
  | 'exported'
  | 'used_in_training'
  | 'archived'

type FilterOption = 'all' | 'barcode' | 'photo'
type StatusFilter = 'all' | 'safe' | 'warning' | 'unsafe' | 'cannot_assess' | 'unknown'
type TrainingFilter = 'all' | 'usable' | 'excluded'
type DistillationFilter = 'all' | DistillationStatus

type ChartDatum = {
  label: string
  value: number
  tone?: 'green' | 'amber' | 'red' | 'slate'
}

type DistillationExportResponse = {
  batch_id: string
  exported_count: number
  records: Array<{
    id: number
    distillation_batch_id: string
  }>
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
  const [exportBatches, setExportBatches] = useState<DistillationBatch[]>([])
  const [distillationJobs, setDistillationJobs] = useState<DistillationJob[]>([])
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [installationQuery, setInstallationQuery] = useState('')
  const [recordQuery, setRecordQuery] = useState('')
  const [routeFilter, setRouteFilter] = useState<FilterOption>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('all')
  const [distillationFilter, setDistillationFilter] = useState<DistillationFilter>('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastExportBatchId, setLastExportBatchId] = useState<string | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'teacher' | 'input' | 'distillation' | 'developer'>('overview')
  const [batchQuery, setBatchQuery] = useState('')
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'ready_for_training' | 'used_in_training'>('all')
  const [creatingJobBatchId, setCreatingJobBatchId] = useState<string | null>(null)
  const [updatingModelVersionId, setUpdatingModelVersionId] = useState<number | null>(null)

  const INSTALLATIONS_PAGE_SIZE = 20
  const RECORDS_PAGE_SIZE = 25
  const BATCHES_PAGE_SIZE = 12
  const JOBS_PAGE_SIZE = 8
  const MODEL_VERSIONS_PAGE_SIZE = 8
  
  const [installationsPage, setInstallationsPage] = useState(1)
  const [recordsPage, setRecordsPage] = useState(1)
  const [batchesPage, setBatchesPage] = useState(1)
  const [jobsPage, setJobsPage] = useState(1)
  const [modelVersionsPage, setModelVersionsPage] = useState(1)
  const [totalInstallationsCount, setTotalInstallationsCount] = useState(0)
  const [totalRecordsCount, setTotalRecordsCount] = useState(0)
  const [totalBatchCount, setTotalBatchCount] = useState(0)
  const [totalJobCount, setTotalJobCount] = useState(0)
  const [totalModelVersionCount, setTotalModelVersionCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [
    installationsPage,
    recordsPage,
    installationQuery,
    recordQuery,
    routeFilter,
    statusFilter,
    trainingFilter,
    distillationFilter,
    platformFilter,
    categoryFilter,
    batchesPage,
    batchQuery,
    batchStatusFilter,
    jobsPage,
    modelVersionsPage,
  ])

  useEffect(() => {
    if (selectedRecordId != null) return
    const hasActiveJobs = distillationJobs.some((job) => ['queued', 'preparing_dataset', 'training', 'evaluating'].includes(job.status))
    if (!hasActiveJobs) return

    const interval = window.setInterval(() => {
      void loadDashboard()
    }, 4000)

    return () => window.clearInterval(interval)
  }, [distillationJobs, selectedRecordId])

  async function loadDashboard() {
    const isInitialLoad = installationsPage === 1 && recordsPage === 1
    if (isInitialLoad) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const installationsSkip = (installationsPage - 1) * INSTALLATIONS_PAGE_SIZE
      const recordsSkip = (recordsPage - 1) * RECORDS_PAGE_SIZE
      const batchesSkip = (batchesPage - 1) * BATCHES_PAGE_SIZE
      const jobsSkip = (jobsPage - 1) * JOBS_PAGE_SIZE
      const modelVersionsSkip = (modelVersionsPage - 1) * MODEL_VERSIONS_PAGE_SIZE
      const installationsParams = new URLSearchParams({
        skip: String(installationsSkip),
        limit: String(INSTALLATIONS_PAGE_SIZE),
      })
      if (installationQuery.trim()) {
        installationsParams.set('query', installationQuery.trim())
      }

      const recordsParams = new URLSearchParams({
        skip: String(recordsSkip),
        limit: String(RECORDS_PAGE_SIZE),
        include_payload: 'true',
      })
      if (recordQuery.trim()) recordsParams.set('query', recordQuery.trim())
      if (routeFilter !== 'all') recordsParams.set('route_type', routeFilter)
      if (statusFilter !== 'all') recordsParams.set('overall_status', statusFilter)
      if (trainingFilter === 'usable') recordsParams.set('usable_for_training', 'true')
      if (trainingFilter === 'excluded') recordsParams.set('usable_for_training', 'false')
      if (distillationFilter !== 'all') recordsParams.set('distillation_status', distillationFilter)
      if (platformFilter !== 'all') recordsParams.set('platform', platformFilter)
      if (categoryFilter !== 'all') recordsParams.set('category', categoryFilter)

      const batchesParams = new URLSearchParams({
        skip: String(batchesSkip),
        limit: String(BATCHES_PAGE_SIZE),
      })
      if (batchQuery.trim()) batchesParams.set('query', batchQuery.trim())
      if (batchStatusFilter !== 'all') batchesParams.set('status', batchStatusFilter)

      const jobsParams = new URLSearchParams({
        skip: String(jobsSkip),
        limit: String(JOBS_PAGE_SIZE),
      })
      const modelVersionsParams = new URLSearchParams({
        skip: String(modelVersionsSkip),
        limit: String(MODEL_VERSIONS_PAGE_SIZE),
      })

      const [installationsResponse, recordsResponse, exportBatchesResponse, distillationJobsResponse, modelVersionsResponse] = await Promise.all([
        fetch(`${API_BASE}/installations?${installationsParams.toString()}`),
        fetch(`${API_BASE}/records?${recordsParams.toString()}`),
        fetch(`${API_BASE}/records/export-batches?${batchesParams.toString()}`),
        fetch(`${API_BASE}/distillation-jobs?${jobsParams.toString()}`),
        fetch(`${API_BASE}/model-versions?${modelVersionsParams.toString()}`),
      ])

      if (!installationsResponse.ok || !recordsResponse.ok || !exportBatchesResponse.ok || !distillationJobsResponse.ok || !modelVersionsResponse.ok) {
        throw new Error('Failed to load dashboard data from backend')
      }

      const [installationsJson, recordsJson, exportBatchesJson, distillationJobsJson, modelVersionsJson] = await Promise.all([
        installationsResponse.json() as Promise<PaginatedInstallationsResponse>,
        recordsResponse.json() as Promise<PaginatedRecordsResponse>,
        exportBatchesResponse.json() as Promise<DistillationBatchListResponse>,
        distillationJobsResponse.json() as Promise<DistillationJobListResponse>,
        modelVersionsResponse.json() as Promise<ModelVersionListResponse>,
      ])

      setInstallations(installationsJson.installations)
      setRecords(recordsJson.records)
      setExportBatches(exportBatchesJson.batches)
      setDistillationJobs(distillationJobsJson.jobs)
      setModelVersions(modelVersionsJson.versions)
      setTotalInstallationsCount(installationsJson.total_count)
      setTotalRecordsCount(recordsJson.total_count)
      setTotalBatchCount(exportBatchesJson.total_count)
      setTotalJobCount(distillationJobsJson.total_count)
      setTotalModelVersionCount(modelVersionsJson.total_count)

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
    const unsafe = records.filter((record) => normalizeStatus(record.overall_status) === 'unsafe').length
    const cannotAssess = records.filter((record) => normalizeStatus(record.overall_status) === 'cannot_assess').length
    const pendingReview = records.filter((record) => record.distillation_status === 'pending_review').length
    const approvedForDistillation = records.filter((record) => record.distillation_status === 'approved_for_distillation').length
    const excludedForDistillation = records.filter((record) => record.distillation_status === 'excluded').length
    const exported = records.filter((record) => record.distillation_status === 'exported').length
    const usedInTraining = records.filter((record) => record.distillation_status === 'used_in_training').length
    const archived = records.filter((record) => record.distillation_status === 'archived').length
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentRecords = records.filter((record) => new Date(record.created_at).getTime() >= recentThreshold).length

    return {
      totalInstallations: totalInstallationsCount,
      totalRecords: totalRecordsCount,
      usableRecords: usable,
      excludedRecords: totalRecordsCount - usable,
      safeRecords: safe,
      warningRecords: warning,
      unsafeRecords: unsafe,
      cannotAssessRecords: cannotAssess,
      pendingReviewRecords: pendingReview,
      approvedForDistillationRecords: approvedForDistillation,
      excludedForDistillationRecords: excludedForDistillation,
      exportedRecords: exported,
      usedInTrainingRecords: usedInTraining,
      archivedRecords: archived,
      latestPayloadAt: records.length > 0 ? records[0].created_at : null,
      recentRecords,
    }
  }, [totalInstallationsCount, totalRecordsCount, records])

  const filteredInstallations = installations
  const filteredRecords = records

  useEffect(() => {
    setInstallationsPage(1)
  }, [installationQuery])

  useEffect(() => {
    setRecordsPage(1)
  }, [recordQuery, routeFilter, statusFilter, trainingFilter, distillationFilter, platformFilter, categoryFilter])

  useEffect(() => {
    setBatchesPage(1)
  }, [batchQuery, batchStatusFilter])

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
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
        { label: 'Unsafe', value: filteredRecords.filter((record) => normalizeStatus(record.overall_status) === 'unsafe').length, tone: 'red' as const },
        { label: 'Cannot Assess', value: filteredRecords.filter((record) => normalizeStatus(record.overall_status) === 'cannot_assess').length, tone: 'slate' as const },
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

  const pipelineStages = useMemo(
    () => [
      { key: 'pending_review' as const, label: 'Needs review', count: overview.pendingReviewRecords },
      { key: 'approved_for_distillation' as const, label: 'Ready to export', count: overview.approvedForDistillationRecords },
      { key: 'excluded' as const, label: 'Excluded', count: overview.excludedForDistillationRecords },
      { key: 'exported' as const, label: 'Exported', count: overview.exportedRecords },
      { key: 'used_in_training' as const, label: 'Used in training', count: overview.usedInTrainingRecords },
      { key: 'archived' as const, label: 'Archived', count: overview.archivedRecords },
    ],
    [overview],
  )

  const installationTotalPages = Math.max(1, Math.ceil(totalInstallationsCount / INSTALLATIONS_PAGE_SIZE))
  const recordTotalPages = Math.max(1, Math.ceil(totalRecordsCount / RECORDS_PAGE_SIZE))
  const batchTotalPages = Math.max(1, Math.ceil(totalBatchCount / BATCHES_PAGE_SIZE))
  const jobTotalPages = Math.max(1, Math.ceil(totalJobCount / JOBS_PAGE_SIZE))
  const modelVersionTotalPages = Math.max(1, Math.ceil(totalModelVersionCount / MODEL_VERSIONS_PAGE_SIZE))
  const currentInstallationStart = totalInstallationsCount === 0 ? 0 : (installationsPage - 1) * INSTALLATIONS_PAGE_SIZE + 1
  const currentInstallationEnd = totalInstallationsCount === 0 ? 0 : currentInstallationStart + installations.length - 1
  const currentRecordStart = totalRecordsCount === 0 ? 0 : (recordsPage - 1) * RECORDS_PAGE_SIZE + 1
  const currentRecordEnd = totalRecordsCount === 0 ? 0 : currentRecordStart + records.length - 1
  const currentBatchStart = totalBatchCount === 0 ? 0 : (batchesPage - 1) * BATCHES_PAGE_SIZE + 1
  const currentBatchEnd = totalBatchCount === 0 ? 0 : currentBatchStart + exportBatches.length - 1
  const currentJobStart = totalJobCount === 0 ? 0 : (jobsPage - 1) * JOBS_PAGE_SIZE + 1
  const currentJobEnd = totalJobCount === 0 ? 0 : currentJobStart + distillationJobs.length - 1
  const currentModelVersionStart = totalModelVersionCount === 0 ? 0 : (modelVersionsPage - 1) * MODEL_VERSIONS_PAGE_SIZE + 1
  const currentModelVersionEnd = totalModelVersionCount === 0 ? 0 : currentModelVersionStart + modelVersions.length - 1

  // Keyboard navigation support - press Shift+I for previous/next installations page, Shift+R for previous/next records page
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.shiftKey && event.key === 'I') {
        event.preventDefault()
        setInstallationsPage((page) => Math.min(installationTotalPages, page + 1))
      }
      if (event.shiftKey && event.key === 'R') {
        event.preventDefault()
        setRecordsPage((page) => Math.min(recordTotalPages, page + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [installationTotalPages, recordTotalPages])

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

  async function updateDistillationStatus(
    recordIds: number[],
    distillationStatus: DistillationStatus,
    options?: { excludedReason?: string; distillationBatchId?: string },
  ) {
    if (recordIds.length === 0) return

    setBulkUpdating(true)
    setError(null)
    try {
      const endpoint =
        recordIds.length === 1
          ? `${API_BASE}/records/${recordIds[0]}/distillation-status`
          : `${API_BASE}/records/distillation-status/bulk`
      const payload =
        recordIds.length === 1
          ? {
              distillation_status: distillationStatus,
              excluded_reason: options?.excludedReason ?? null,
              distillation_batch_id: options?.distillationBatchId ?? null,
            }
          : {
              record_ids: recordIds,
              distillation_status: distillationStatus,
              excluded_reason: options?.excludedReason ?? null,
              distillation_batch_id: options?.distillationBatchId ?? null,
            }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to update distillation status')
      }

      const ids = new Set(recordIds)
      setRecords((current) =>
        current.map((item) =>
          ids.has(item.id)
            ? applyDistillationState(item, distillationStatus, {
                excludedReason: options?.excludedReason,
                distillationBatchId: options?.distillationBatchId,
              })
            : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update distillation status')
    } finally {
      setBulkUpdating(false)
    }
  }

  async function exportApprovedRecords() {
    const approvedIds = filteredRecords
      .filter((record) => record.distillation_status === 'approved_for_distillation')
      .map((record) => record.id)
    if (approvedIds.length === 0) return

    setExporting(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/records/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_ids: approvedIds,
          include_payload: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export approved records')
      }

      const data = (await response.json()) as DistillationExportResponse
      setLastExportBatchId(data.batch_id)
      const exportedIds = new Set(data.records.map((item) => item.id))
      setRecords((current) =>
        current.map((item) =>
          exportedIds.has(item.id)
            ? applyDistillationState(item, 'exported', {
                distillationBatchId: data.batch_id,
              })
            : item,
        ),
      )
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export records')
    } finally {
      setExporting(false)
    }
  }

  async function deleteRecord(recordId: number) {
    if (!window.confirm(`Delete record #${recordId}? This cannot be undone.`)) return

    setDeletingRecordId(recordId)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/records/${recordId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete record')
      }

      setRecords((current) => current.filter((item) => item.id !== recordId))
      if (selectedRecordId === recordId) {
        setSelectedRecordId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record')
    } finally {
      setDeletingRecordId(null)
    }
  }

  async function createDistillationJob(batchId: string) {
    setCreatingJobBatchId(batchId)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/distillation-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId,
          base_model: '3B hosted SLM',
          task_type: 'overall_status_classification',
          dataset_mode: 'single_batch',
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail ?? 'Failed to create distillation job')
      }

      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create distillation job')
    } finally {
      setCreatingJobBatchId(null)
    }
  }

  async function updateModelVersionStatus(versionId: number, nextStatus: 'active_test' | 'ready_for_test' | 'archived') {
    setUpdatingModelVersionId(versionId)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/model-versions/${versionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail ?? 'Failed to update model version status')
      }

      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model version status')
    } finally {
      setUpdatingModelVersionId(null)
    }
  }

  const activeFilterCount = [routeFilter, statusFilter, trainingFilter, platformFilter, categoryFilter].filter(
    (value) => value !== 'all',
  ).length + (distillationFilter !== 'all' ? 1 : 0) + (recordQuery.trim() ? 1 : 0)
  const distillationPreview = selectedRecord ? buildDistillationExportPreview(selectedRecord) : null
  const activeModelVersion = modelVersions.find((version) => version.status === 'active_test') ?? null

  if (selectedRecord) {
    return (
      <main style={styles.page}>
        <section style={styles.detailPageShell} aria-label={`Record details for record ${selectedRecord.id}`}>
          <div style={styles.detailPageTopBar}>
            <button type="button" style={styles.drawerCloseButton} onClick={() => setSelectedRecordId(null)}>
              Back to dashboard
            </button>
            <div style={styles.detailScreenHeaderActions}>
              <button
                type="button"
                style={styles.actionButtonPositive}
                onClick={() => void updateDistillationStatus([selectedRecord.id], 'approved_for_distillation')}
                disabled={bulkUpdating}
              >
                Approve
              </button>
              <button
                type="button"
                style={styles.actionButtonMuted}
                onClick={() => void updateDistillationStatus([selectedRecord.id], 'excluded', { excludedReason: 'Excluded from detail page action' })}
                disabled={bulkUpdating}
              >
                Exclude
              </button>
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => void updateDistillationStatus([selectedRecord.id], 'used_in_training', { distillationBatchId: selectedRecord.distillation_batch_id ?? lastExportBatchId ?? undefined })}
                disabled={bulkUpdating}
              >
                Mark used in training
              </button>
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => void updateDistillationStatus([selectedRecord.id], 'archived', { distillationBatchId: selectedRecord.distillation_batch_id ?? undefined })}
                disabled={bulkUpdating}
              >
                Archive
              </button>
              <button
                type="button"
                style={styles.actionButtonDanger}
                onClick={() => void deleteRecord(selectedRecord.id)}
                disabled={deletingRecordId === selectedRecord.id}
              >
                {deletingRecordId === selectedRecord.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          <section style={styles.detailPageHero}>
            <div style={styles.recordIdRow}>
              <span style={styles.inlineMetaLabel}>#{selectedRecord.id}</span>
              <span style={statusPillStyle(selectedRecord.overall_status)}>{displayStatus(selectedRecord.overall_status)}</span>
              <span style={distillationStatusStyle(selectedRecord.distillation_status)}>
                {displayDistillationStatus(selectedRecord.distillation_status)}
              </span>
            </div>
            <h1 style={styles.detailPageTitle}>{selectedRecord.payload?.input?.product_name_original ?? 'Unnamed product'}</h1>
            <p style={styles.detailPageSubtitle}>
              {selectedRecord.payload?.input?.brand_original ?? 'Brand not provided'} · {formatDateTime(selectedRecord.created_at)}
            </p>
            <div style={styles.detailSummaryStrip}>
              <SummaryFact label="Lifecycle stage" value={displayDistillationStatus(selectedRecord.distillation_status)} />
              <SummaryFact label="Training flag" value={selectedRecord.usable_for_training ? 'Eligible' : 'Excluded'} />
              <SummaryFact label="Route" value={selectedRecord.route_type ?? 'Unspecified'} />
              <SummaryFact label="Platform" value={selectedRecord.platform ?? 'Unspecified'} />
              <SummaryFact label="Installation" value={selectedRecord.installation_id} />
              <SummaryFact label="Distillation batch" value={selectedRecord.distillation_batch_id ?? 'Not exported yet'} />
            </div>
          </section>

          <div style={styles.detailTabRow}>
            <DetailTabButton label="Overview" active={activeDetailTab === 'overview'} onClick={() => setActiveDetailTab('overview')} />
            <DetailTabButton label="Teacher Output" active={activeDetailTab === 'teacher'} onClick={() => setActiveDetailTab('teacher')} />
            <DetailTabButton label="Input Data" active={activeDetailTab === 'input'} onClick={() => setActiveDetailTab('input')} />
            <DetailTabButton label="Distillation" active={activeDetailTab === 'distillation'} onClick={() => setActiveDetailTab('distillation')} />
            <DetailTabButton label="Developer" active={activeDetailTab === 'developer'} onClick={() => setActiveDetailTab('developer')} />
          </div>

          {activeDetailTab === 'overview' ? (
            <section style={styles.detailPageGrid}>
              <div style={styles.detailMainColumn}>
                <DetailSection title="Overview" fullWidth>
                  <DetailRow label="Record ID" value={`#${selectedRecord.id}`} />
                  <DetailRow label="Schema version" value={selectedRecord.schema_version == null ? 'Not available' : String(selectedRecord.schema_version)} />
                  <DetailRow label="Reviewed at" value={selectedRecord.reviewed_at ? formatDateTime(selectedRecord.reviewed_at) : 'Not reviewed yet'} />
                  <DetailRow label="Exported at" value={selectedRecord.exported_at ? formatDateTime(selectedRecord.exported_at) : 'Not exported yet'} />
                  <DetailRow label="Most common platforms" value={topPlatforms.map(([name, count]) => `${name} (${count})`).join(', ') || 'No platform data yet'} multiline />
                </DetailSection>
              </div>
              <div style={styles.detailSideColumn}>
                <DetailSection title="Distillation Summary" fullWidth>
                  <DetailRow label="Ready for export" value={selectedRecord.distillation_status === 'approved_for_distillation' ? 'Yes' : 'No'} />
                  <DetailRow label="Distillation batch" value={selectedRecord.distillation_batch_id ?? 'Not assigned yet'} />
                  <DetailRow label="Used in training at" value={selectedRecord.used_in_training_at ? formatDateTime(selectedRecord.used_in_training_at) : 'Not used yet'} />
                  <DetailRow label="Excluded reason" value={selectedRecord.excluded_reason ?? 'No exclusion reason recorded'} multiline />
                </DetailSection>
              </div>
            </section>
          ) : null}

          {activeDetailTab === 'teacher' ? (
            <section style={styles.detailTabContent}>
              <DetailSection title="Teacher Output" fullWidth>
                <DetailRow label="Overall status" value={displayStatus(selectedRecord.payload?.teacher_result?.overall_status ?? 'unknown')} />
                <DetailRow label="Decision line" value={selectedRecord.payload?.teacher_result?.overall_line ?? 'No decision summary provided'} multiline />
                <DetailRow label="Ran evaluations" value={joinList(selectedRecord.payload?.teacher_result?.ran_evaluations)} multiline />
                <DetailRow label="Excluded domains" value={joinList(selectedRecord.payload?.metadata?.excluded_domains)} multiline />
                <DetailRow label="Market country" value={selectedRecord.payload?.metadata?.market_country ?? 'Not available'} />
              </DetailSection>
            </section>
          ) : null}

          {activeDetailTab === 'input' ? (
            <section style={styles.detailTabContent}>
              <DetailSection title="Input Data" fullWidth>
                <DetailRow label="Product" value={selectedRecord.payload?.input?.product_name_original ?? 'Not provided'} />
                <DetailRow label="Brand" value={selectedRecord.payload?.input?.brand_original ?? 'Not provided'} />
                <DetailRow label="Category" value={selectedRecord.payload?.input?.category_english ?? 'Not provided'} />
                <DetailRow label="Origin" value={selectedRecord.payload?.input?.origin_country_english ?? 'Not provided'} />
                <DetailRow label="Barcode" value={selectedRecord.payload?.input?.barcode ?? 'Not available'} />
                <DetailRow label="Ingredients" value={joinList(selectedRecord.payload?.input?.ingredients_english)} multiline />
                <DetailRow label="Additives" value={joinList(selectedRecord.payload?.input?.additives_english)} multiline />
                <DetailRow label="Allergens" value={joinList(selectedRecord.payload?.input?.allergens_english)} multiline />
              </DetailSection>
            </section>
          ) : null}

          {activeDetailTab === 'distillation' ? (
            <section style={styles.detailTabContent}>
              <DetailSection title="Distillation" fullWidth>
                <DetailRow label="Record ID" value={`#${selectedRecord.id}`} />
                <DetailRow label="Reviewed at" value={selectedRecord.reviewed_at ? formatDateTime(selectedRecord.reviewed_at) : 'Not reviewed yet'} />
                <DetailRow label="Exported at" value={selectedRecord.exported_at ? formatDateTime(selectedRecord.exported_at) : 'Not exported yet'} />
                <DetailRow label="Ready for export" value={selectedRecord.distillation_status === 'approved_for_distillation' ? 'Yes' : 'No'} />
                <DetailRow label="Distillation batch" value={selectedRecord.distillation_batch_id ?? 'Not assigned yet'} />
                <DetailRow label="Used in training at" value={selectedRecord.used_in_training_at ? formatDateTime(selectedRecord.used_in_training_at) : 'Not used yet'} />
                <DetailRow label="Excluded reason" value={selectedRecord.excluded_reason ?? 'No exclusion reason recorded'} multiline />
              </DetailSection>
            </section>
          ) : null}

          {activeDetailTab === 'developer' ? (
            <section style={styles.detailPageGrid}>
              <div style={styles.detailMainColumn}>
                <DetailSection title="Distillation Export Preview" fullWidth>
                  <p style={styles.previewSectionNote}>
                    Only the fields intended for SLM distillation are included here. Full payload metadata and transport details are excluded.
                  </p>
                  <pre style={styles.previewJsonBlock}>{JSON.stringify(distillationPreview, null, 2)}</pre>
                </DetailSection>

                <DetailSection title="Raw JSON" fullWidth>
                  <div style={styles.rawJsonHeader}>
                    <p style={styles.bulkActionsSubtitle}>Keep this collapsed for normal review. Open it only for debugging or schema inspection.</p>
                    <button type="button" style={styles.actionButton} onClick={() => setShowRawJson((current) => !current)}>
                      {showRawJson ? 'Hide raw JSON' : 'Show raw JSON'}
                    </button>
                  </div>
                  {showRawJson ? <pre style={styles.jsonBlock}>{JSON.stringify(selectedRecord.payload, null, 2)}</pre> : null}
                </DetailSection>
              </div>
              <div style={styles.detailSideColumn}>
                <DetailSection title="Developer" fullWidth>
                  <DetailRow label="Payload schema version" value={selectedRecord.payload?.schema_version == null ? 'Not available' : String(selectedRecord.payload.schema_version)} />
                  <DetailRow label="Recorded at epoch ms" value={selectedRecord.payload?.created_at_epoch_ms == null ? 'Not available' : String(selectedRecord.payload.created_at_epoch_ms)} />
                  <DetailRow label="Preference keys" value={Object.keys(selectedRecord.payload?.preferences ?? {}).join(', ') || 'No preference payload recorded'} multiline />
                  <DetailRow label="Metadata fields" value={Object.keys(selectedRecord.payload?.metadata ?? {}).join(', ') || 'No metadata fields recorded'} multiline />
                </DetailSection>

                <DetailSection title="Payload Preview" fullWidth>
                  <div style={styles.payloadPreviewGrid}>
                    <PayloadPreviewCard title="Input block" value={`${Object.keys(selectedRecord.payload?.input ?? {}).length} fields`} subtitle="Product, brand, category, ingredients, origin, barcode." />
                    <PayloadPreviewCard title="Teacher block" value={`${Object.keys(selectedRecord.payload?.teacher_result ?? {}).length} fields`} subtitle="Status, decision line, and executed evaluations." />
                    <PayloadPreviewCard title="Metadata block" value={`${Object.keys(selectedRecord.payload?.metadata ?? {}).length} fields`} subtitle="Training eligibility, excluded domains, market, and distillation fields." />
                    <PayloadPreviewCard title="Preferences block" value={`${Object.keys(selectedRecord.payload?.preferences ?? {}).length} keys`} subtitle="Preference payload passed from the app when available." />
                  </div>
                </DetailSection>
              </div>
            </section>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.kicker}>Label Wise Admin</p>
          <h1 style={styles.title}>Distillation Dashboard</h1>
          <p style={styles.subtitle}>
            View incoming teacher payloads in a clean dashboard that supports fast filtering and bulk training decisions.
          </p>
          <div style={styles.heroMetaRow}>
            <HeroBadge label="Latest record" value={overview.latestPayloadAt ? formatDateTime(overview.latestPayloadAt) : 'No records yet'} />
            <HeroBadge label="Last 7 days" value={`${overview.recentRecords} records`} />
            <HeroBadge label="Active filters" value={activeFilterCount === 0 ? 'None' : `${activeFilterCount} active`} />
          </div>
        </div>
        <div style={styles.heroPanel}>
          <div style={styles.heroPanelTop}>
            <span style={styles.heroPanelLabel}>Export readiness</span>
            <strong style={styles.heroPanelValue}>
              {overview.totalRecords === 0 ? '0%' : `${Math.round((overview.approvedForDistillationRecords / overview.totalRecords) * 100)}%`}
            </strong>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: overview.totalRecords === 0 ? '0%' : `${(overview.approvedForDistillationRecords / overview.totalRecords) * 100}%`,
              }}
            />
          </div>
          <div style={styles.heroActions}>
            <button type="button" onClick={() => void loadDashboard()} style={styles.primaryButton}>
              Refresh data
            </button>
            <button
              type="button"
              onClick={() => void exportApprovedRecords()}
              style={styles.secondaryButton}
              disabled={exporting || filteredRecords.every((record) => record.distillation_status !== 'approved_for_distillation')}
            >
              {exporting ? 'Exporting...' : 'Export approved records'}
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
        <SummaryCard title="Records collected" value={overview.totalRecords.toString()} subtitle="Teacher records received" />
        <SummaryCard title="Ready to export" value={overview.approvedForDistillationRecords.toString()} subtitle={`${overview.excludedForDistillationRecords} excluded`} tone="green" />
        <SummaryCard
          title="Status breakdown"
          value={`${overview.safeRecords}/${overview.warningRecords}/${overview.unsafeRecords}`}
          subtitle={`Safe / warning / unsafe${overview.cannotAssessRecords > 0 ? ` (+${overview.cannotAssessRecords} cannot assess)` : ''}`}
        />
      </section>

      <section style={styles.pipelinePanel}>
        <div style={styles.pipelinePanelHeader}>
          <div>
            <h2 style={styles.cardTitle}>Active Test Model</h2>
            <p style={styles.cardSubtitle}>
              This marks the current test target for the future hosted SLM endpoint. Only one version can be active for testing at a time.
            </p>
          </div>
          <span style={styles.batchBadge}>{activeModelVersion ? 'Configured' : 'Not set'}</span>
        </div>
        {activeModelVersion ? (
          <article style={styles.batchCard}>
            <div style={styles.batchCardTop}>
              <div>
                <p style={styles.factLabel}>Active version</p>
                <h3 style={styles.batchCardTitle}>{activeModelVersion.model_name}</h3>
              </div>
              <span style={styles.batchUsedPill}>active_test</span>
            </div>
            <div style={styles.batchMetaList}>
              <span>Version #{activeModelVersion.id}</span>
              <span>Batch {activeModelVersion.batch_id}</span>
              <span>Base model {activeModelVersion.base_model}</span>
              <span>{activeModelVersion.activated_at ? `Activated ${formatDateTime(activeModelVersion.activated_at)}` : 'Activation time not available'}</span>
            </div>
          </article>
        ) : (
          <div style={styles.emptyStateCard}>
            <h3 style={styles.emptyStateTitle}>No active test model selected</h3>
            <p style={styles.emptyPanelText}>Activate one ready version below to make the current testing target explicit.</p>
          </div>
        )}
      </section>

      <section style={styles.pipelinePanel}>
        <div style={styles.pipelinePanelHeader}>
          <div>
            <h2 style={styles.cardTitle}>Distillation lifecycle</h2>
            <p style={styles.cardSubtitle}>
              Track what has been reviewed, approved, exported, used in training, or archived. Click a stage to filter the record list.
            </p>
          </div>
          {lastExportBatchId ? <span style={styles.batchBadge}>Latest batch: {lastExportBatchId}</span> : null}
        </div>
        <div style={styles.pipelineStageGrid}>
          {pipelineStages.map((stage) => (
            <button
              key={stage.key}
              type="button"
              style={{
                ...styles.pipelineStageCard,
                ...(distillationFilter === stage.key ? styles.pipelineStageCardActive : null),
              }}
              onClick={() => setDistillationFilter(distillationFilter === stage.key ? 'all' : stage.key)}
            >
              <span style={styles.pipelineStageLabel}>{stage.label}</span>
              <strong style={styles.pipelineStageValue}>{stage.count}</strong>
            </button>
          ))}
        </div>
      </section>

      <section style={styles.pipelinePanel}>
        <div style={styles.pipelinePanelHeader}>
          <div>
            <h2 style={styles.cardTitle}>Model Versions</h2>
            <p style={styles.cardSubtitle}>
              Completed jobs produce model-version artifacts. These versions are the future handoff point for hosted SLM testing and activation.
            </p>
          </div>
          <span style={styles.batchBadge}>{totalModelVersionCount} versions</span>
        </div>
        {modelVersions.length > 0 ? (
          <>
            <div style={styles.batchGrid}>
              {modelVersions.map((version) => (
                <article key={version.id} style={styles.batchCard}>
                  <div style={styles.batchCardTop}>
                    <div>
                      <p style={styles.factLabel}>Version #{version.id}</p>
                      <h3 style={styles.batchCardTitle}>{version.model_name}</h3>
                    </div>
                    <span style={version.status === 'ready_for_test' ? styles.batchReadyPill : styles.batchUsedPill}>
                      {version.status}
                    </span>
                  </div>
                  <div style={styles.batchMetaList}>
                    <span>Job {version.job_id}</span>
                    <span>Batch {version.batch_id}</span>
                    <span>Base model {version.base_model}</span>
                    <span>Created {formatDateTime(version.created_at)}</span>
                  </div>
                  <div style={styles.batchFooter}>
                    <span style={styles.batchFooterText}>
                      {version.artifact_uri ?? 'No artifact URI yet'}
                    </span>
                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        style={styles.actionButtonPositive}
                        disabled={updatingModelVersionId === version.id || version.status === 'active_test'}
                        onClick={() => void updateModelVersionStatus(version.id, 'active_test')}
                      >
                        {updatingModelVersionId === version.id ? 'Saving...' : 'Activate for testing'}
                      </button>
                      <button
                        type="button"
                        style={styles.actionButton}
                        disabled={updatingModelVersionId === version.id || version.status === 'ready_for_test'}
                        onClick={() => void updateModelVersionStatus(version.id, 'ready_for_test')}
                      >
                        Set ready
                      </button>
                      <button
                        type="button"
                        style={styles.actionButtonMuted}
                        disabled={updatingModelVersionId === version.id || version.status === 'archived'}
                        onClick={() => void updateModelVersionStatus(version.id, 'archived')}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                  {version.metrics_json ? (
                    <div style={styles.jobMetricsBox}>
                      <span style={styles.jobMetricsTitle}>Evaluation snapshot</span>
                      <span style={styles.jobMetricsText}>{JSON.stringify(version.metrics_json)}</span>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div style={styles.paginationBar}>
              <span style={styles.paginationMeta}>
                Page {modelVersionsPage} of {modelVersionTotalPages} · Showing {currentModelVersionStart}-{currentModelVersionEnd} of {totalModelVersionCount}
              </span>
              <div style={styles.paginationControls}>
                <button type="button" style={styles.actionButton} onClick={() => setModelVersionsPage((page) => Math.max(1, page - 1))} disabled={modelVersionsPage === 1 || loadingMore}>
                  Previous
                </button>
                <button type="button" style={styles.actionButton} onClick={() => setModelVersionsPage((page) => Math.min(modelVersionTotalPages, page + 1))} disabled={modelVersionsPage >= modelVersionTotalPages || loadingMore}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyStateCard}>
            <h3 style={styles.emptyStateTitle}>No model versions yet</h3>
            <p style={styles.emptyPanelText}>When a distillation job completes, the server will register a model version here.</p>
          </div>
        )}
      </section>

      <section style={styles.pipelinePanel}>
        <div style={styles.pipelinePanelHeader}>
          <div>
            <h2 style={styles.cardTitle}>Distillation Jobs</h2>
            <p style={styles.cardSubtitle}>
              Jobs represent SLM training attempts created from exported batches. This is the execution layer between export and future model versions.
            </p>
          </div>
          <span style={styles.batchBadge}>{totalJobCount} jobs</span>
        </div>
        {distillationJobs.length > 0 ? (
          <>
            <div style={styles.batchGrid}>
              {distillationJobs.map((job) => (
                <article key={job.id} style={styles.batchCard}>
                  <div style={styles.batchCardTop}>
                    <div>
                      <p style={styles.factLabel}>Job #{job.id}</p>
                      <h3 style={styles.batchCardTitle}>{job.base_model}</h3>
                    </div>
                    <span style={job.status === 'queued' ? styles.batchReadyPill : styles.batchUsedPill}>
                      {job.status}
                    </span>
                  </div>
                  <div style={styles.batchMetaList}>
                    <span>Batch {job.batch_id}</span>
                    <span>Task {job.task_type}</span>
                    <span>Mode {job.dataset_mode}</span>
                    <span>Created {formatDateTime(job.created_at)}</span>
                  </div>
                  <div style={styles.jobProgressShell}>
                    <div style={styles.jobProgressTop}>
                      <span style={styles.factLabel}>Pipeline progress</span>
                      <strong style={styles.inlineMetaStrong}>{job.progress_percent}%</strong>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${job.progress_percent}%` }} />
                    </div>
                  </div>
                  <div style={styles.batchStatusRow}>
                    <span style={styles.miniStatusMuted}>Train {job.train_record_count ?? 0}</span>
                    <span style={styles.miniStatusMuted}>Validation {job.validation_record_count ?? 0}</span>
                  </div>
                  <div style={styles.batchFooter}>
                    <span style={styles.batchFooterText}>
                      {job.progress_stage}
                      {job.error_message ? ` · ${job.error_message}` : ''}
                    </span>
                  </div>
                  {job.metrics_json && job.status === 'completed' ? (
                    <div style={styles.jobMetricsBox}>
                      <span style={styles.jobMetricsTitle}>Simulated evaluation</span>
                      <span style={styles.jobMetricsText}>{JSON.stringify(job.metrics_json)}</span>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div style={styles.paginationBar}>
              <span style={styles.paginationMeta}>
                Page {jobsPage} of {jobTotalPages} · Showing {currentJobStart}-{currentJobEnd} of {totalJobCount}
              </span>
              <div style={styles.paginationControls}>
                <button type="button" style={styles.actionButton} onClick={() => setJobsPage((page) => Math.max(1, page - 1))} disabled={jobsPage === 1 || loadingMore}>
                  Previous
                </button>
                <button type="button" style={styles.actionButton} onClick={() => setJobsPage((page) => Math.min(jobTotalPages, page + 1))} disabled={jobsPage >= jobTotalPages || loadingMore}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyStateCard}>
            <h3 style={styles.emptyStateTitle}>No distillation jobs yet</h3>
            <p style={styles.emptyPanelText}>Create a job from a ready export batch to start the SLM pipeline.</p>
          </div>
        )}
      </section>

      <section style={styles.pipelinePanel}>
        <div style={styles.pipelinePanelHeader}>
          <div>
            <h2 style={styles.cardTitle}>Export Batches</h2>
            <p style={styles.cardSubtitle}>
              Exported record groups become the handoff point into SLM distillation. Batches marked ready can be used by the future training worker.
            </p>
          </div>
          <span style={styles.batchBadge}>{totalBatchCount} batches</span>
        </div>
        <div style={styles.batchToolbar}>
          <input
            style={styles.input}
            placeholder="Search batch id"
            value={batchQuery}
            onChange={(event) => setBatchQuery(event.target.value)}
          />
          <select style={styles.select} value={batchStatusFilter} onChange={(event) => setBatchStatusFilter(event.target.value as 'all' | 'ready_for_training' | 'used_in_training')}>
            <option value="all">All batch states</option>
            <option value="ready_for_training">Ready for training</option>
            <option value="used_in_training">Used in training</option>
          </select>
        </div>
        {exportBatches.length > 0 ? (
          <>
            <div style={styles.batchGrid}>
              {exportBatches.map((batch) => (
                <article key={batch.batch_id} style={styles.batchCard}>
                  <div style={styles.batchCardTop}>
                    <div>
                      <p style={styles.factLabel}>Batch ID</p>
                      <h3 style={styles.batchCardTitle}>{batch.batch_id}</h3>
                    </div>
                    <span style={batch.ready_for_training ? styles.batchReadyPill : styles.batchUsedPill}>
                      {batch.ready_for_training ? 'Ready for SLM training' : 'Used in training'}
                    </span>
                  </div>
                  <div style={styles.batchMetaList}>
                    <span>{batch.exported_count} records</span>
                    <span>{batch.exported_at ? `Exported ${formatDateTime(batch.exported_at)}` : 'Export time not available'}</span>
                    <span>{batch.last_used_in_training_at ? `Last trained ${formatDateTime(batch.last_used_in_training_at)}` : 'Not yet trained'}</span>
                  </div>
                  <div style={styles.batchStatusRow}>
                    <span style={styles.miniStatusSafe}>Safe {batch.safe_count}</span>
                    <span style={styles.miniStatusWarning}>Warning {batch.warning_count}</span>
                    <span style={styles.miniStatusUnsafe}>Unsafe {batch.unsafe_count}</span>
                    <span style={styles.miniStatusMuted}>Cannot assess {batch.cannot_assess_count}</span>
                  </div>
                  <div style={styles.batchFooter}>
                    <span style={styles.batchFooterText}>
                      {batch.ready_for_training
                        ? 'This batch is exported and ready for the upcoming distillation job flow.'
                        : 'This batch has already been used in a training workflow and remains stored for traceability.'}
                    </span>
                    <button
                      type="button"
                      style={styles.actionButton}
                      disabled={!batch.ready_for_training || creatingJobBatchId === batch.batch_id}
                      onClick={() => void createDistillationJob(batch.batch_id)}
                    >
                      {creatingJobBatchId === batch.batch_id ? 'Creating job...' : 'Start distillation'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div style={styles.paginationBar}>
              <span style={styles.paginationMeta}>
                Page {batchesPage} of {batchTotalPages} · Showing {currentBatchStart}-{currentBatchEnd} of {totalBatchCount}
              </span>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setBatchesPage((page) => Math.max(1, page - 1))}
                  disabled={batchesPage === 1 || loadingMore}
                >
                  Previous
                </button>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setBatchesPage((page) => Math.min(batchTotalPages, page + 1))}
                  disabled={batchesPage >= batchTotalPages || loadingMore}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyStateCard}>
            <h3 style={styles.emptyStateTitle}>No export batches yet</h3>
            <p style={styles.emptyPanelText}>Export approved records first. Each export will appear here as a training-ready batch.</p>
          </div>
        )}
      </section>

      <section style={styles.analyticsStrip}>
        <ChartCard title="Status Distribution" subtitle="Current filtered outcome mix">
          <HorizontalBarChart data={chartData.status} emptyLabel="No status data in current filter." />
        </ChartCard>
        <ChartCard title="Record source" subtitle="Barcode versus photo ingestion">
          <HorizontalBarChart data={chartData.route} emptyLabel="No route data in current filter." />
        </ChartCard>
        <ChartCard title="Lifecycle overview" subtitle="Where the visible records sit in the distillation workflow">
          <HorizontalBarChart
            data={[
              { label: 'Needs review', value: filteredRecords.filter((record) => record.distillation_status === 'pending_review').length, tone: 'slate' as const },
              { label: 'Ready to export', value: filteredRecords.filter((record) => record.distillation_status === 'approved_for_distillation').length, tone: 'green' as const },
              { label: 'Exported', value: filteredRecords.filter((record) => record.distillation_status === 'exported').length, tone: 'amber' as const },
              { label: 'Used in training', value: filteredRecords.filter((record) => record.distillation_status === 'used_in_training').length, tone: 'green' as const },
              { label: 'Excluded', value: filteredRecords.filter((record) => record.distillation_status === 'excluded').length, tone: 'red' as const },
            ]}
            emptyLabel="No lifecycle data in current filter."
          />
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
                Installed app instances in scope for current record audit and quality workflows.
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
            {filteredInstallations.map((item) => (
              <InstallationListItem
                key={item.installation_id}
                installation={item}
                recordCount={installationCounts[item.installation_id] ?? 0}
              />
            ))}
            {filteredInstallations.length === 0 ? (
              <p style={styles.emptyPanelText}>No installations match the current search.</p>
            ) : null}
          </div>
          <div style={styles.paginationBar}>
            <span style={styles.paginationMeta}>
              Page {installationsPage} of {installationTotalPages} · Showing {currentInstallationStart}-{currentInstallationEnd} of {totalInstallationsCount}
            </span>
            <div style={styles.paginationControls}>
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => setInstallationsPage((page) => Math.max(1, page - 1))}
                disabled={installationsPage === 1 || loadingMore}
              >
                Previous
              </button>
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => setInstallationsPage((page) => Math.min(installationTotalPages, page + 1))}
                disabled={installationsPage >= installationTotalPages || loadingMore}
              >
                Next
              </button>
            </div>
          </div>
        </article>

        <section style={styles.mainColumn}>
          <article style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Record curation</h2>
                <p style={styles.cardSubtitle}>
                  Search first, then narrow by route, status, lifecycle stage, platform, category, or training state. Records stay readable
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
                  <option value="unsafe">Unsafe</option>
                  <option value="cannot_assess">Cannot assess</option>
                  <option value="unknown">Unspecified</option>
                </select>
                <select style={styles.select} value={trainingFilter} onChange={(event) => setTrainingFilter(event.target.value as TrainingFilter)}>
                  <option value="all">All training states</option>
                  <option value="usable">Usable</option>
                  <option value="excluded">Excluded</option>
                </select>
                <select style={styles.select} value={distillationFilter} onChange={(event) => setDistillationFilter(event.target.value as DistillationFilter)}>
                  <option value="all">All lifecycle stages</option>
                  <option value="pending_review">Needs review</option>
                  <option value="approved_for_distillation">Ready to export</option>
                  <option value="excluded">Excluded</option>
                  <option value="exported">Exported</option>
                  <option value="used_in_training">Used in training</option>
                  <option value="archived">Archived</option>
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
              <div style={styles.bulkActionsHeader}>
                <div>
                  <h3 style={styles.bulkActionsTitle}>Bulk actions</h3>
                  <p style={styles.bulkActionsSubtitle}>These actions apply to the records visible in the current list.</p>
                </div>
              </div>
              <div style={styles.bulkActionsRow}>
                <button
                  type="button"
                  style={styles.actionButtonPositive}
                  disabled={bulkUpdating || filteredRecords.length === 0}
                  onClick={() => void updateDistillationStatus(filteredRecords.map((record) => record.id), 'approved_for_distillation')}
                >
                  {bulkUpdating ? 'Saving...' : `Approve visible (${filteredRecords.length})`}
                </button>
                <button
                  type="button"
                  style={styles.actionButtonMuted}
                  disabled={bulkUpdating || filteredRecords.length === 0}
                  onClick={() => void updateDistillationStatus(filteredRecords.map((record) => record.id), 'excluded', { excludedReason: 'Excluded from dashboard bulk action' })}
                >
                  {bulkUpdating ? 'Saving...' : `Exclude visible (${filteredRecords.length})`}
                </button>
                <button
                  type="button"
                  style={styles.actionButton}
                  disabled={exporting || filteredRecords.every((record) => record.distillation_status !== 'approved_for_distillation')}
                  onClick={() => void exportApprovedRecords()}
                >
                  {exporting ? 'Exporting...' : 'Export approved visible'}
                </button>
              </div>
            </div>

            <div style={styles.recordsPanel}>
              <div style={styles.recordList}>
                {filteredRecords.map((item) => (
                  <RecordListCard
                    key={item.id}
                    record={item}
                    selected={selectedRecordId === item.id}
                    updating={updatingRecordId === item.id}
                    deleting={deletingRecordId === item.id}
                    onSelect={() => {
                      setSelectedRecordId(item.id)
                      setShowRawJson(false)
                      setActiveDetailTab('overview')
                    }}
                    onApprove={() => void updateDistillationStatus([item.id], 'approved_for_distillation')}
                    onExclude={() => void updateDistillationStatus([item.id], 'excluded', { excludedReason: 'Excluded from record card action' })}
                    onDelete={() => void deleteRecord(item.id)}
                  />
                ))}
                {filteredRecords.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <h3 style={styles.emptyStateTitle}>No records match the current filters</h3>
                    <p style={styles.emptyPanelText}>Widen the search or reset one of the active filter controls.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div style={styles.paginationBar}>
              <span style={styles.paginationMeta}>
                Page {recordsPage} of {recordTotalPages} · Showing {currentRecordStart}-{currentRecordEnd} of {totalRecordsCount}
              </span>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setRecordsPage((page) => Math.max(1, page - 1))}
                  disabled={recordsPage === 1 || loadingMore}
                >
                  Previous
                </button>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setRecordsPage((page) => Math.min(recordTotalPages, page + 1))}
                  disabled={recordsPage >= recordTotalPages || loadingMore}
                >
                  Next
                </button>
              </div>
            </div>
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

function DetailTabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.detailTabButton,
        ...(active ? styles.detailTabButtonActive : null),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function PayloadPreviewCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div style={styles.payloadPreviewCard}>
      <span style={styles.factLabel}>{title}</span>
      <strong style={styles.payloadPreviewValue}>{value}</strong>
      <span style={styles.payloadPreviewSubtitle}>{subtitle}</span>
    </div>
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
        <span style={styles.installationPlatform}>{installation.platform ?? 'Unspecified'}</span>
        <span style={styles.installationCount}>{recordCount} records</span>
      </div>
      <div style={styles.installationId}>{installation.installation_id}</div>
      <div style={styles.installationMeta}>
        <span>{installation.app_version ? `v${installation.app_version}` : 'Version not reported'}</span>
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
  deleting,
  onSelect,
  onApprove,
  onExclude,
  onDelete,
}: {
  record: RecordSummary
  selected: boolean
  updating: boolean
  deleting: boolean
  onSelect: () => void
  onApprove: () => void
  onExclude: () => void
  onDelete: () => void
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
            <span style={distillationStatusStyle(record.distillation_status)}>
              {displayDistillationStatus(record.distillation_status)}
            </span>
          </div>
          <h3 style={styles.recordTitle}>{record.payload?.input?.product_name_original ?? 'Unnamed product'}</h3>
          <p style={styles.recordSubtitle}>{record.payload?.input?.brand_original ?? 'Brand not provided'}</p>
        </div>
        <div style={styles.recordDateBlock}>
          <strong style={styles.inlineMetaStrong}>{formatDate(record.created_at)}</strong>
          <span style={styles.inlineMetaMuted}>{formatTime(record.created_at)}</span>
        </div>
      </div>

      <div style={styles.recordFactsGrid}>
        <FactItem label="Category" value={record.payload?.input?.category_english ?? 'Not provided'} />
        <FactItem label="Origin" value={record.payload?.input?.origin_country_english ?? 'Not provided'} />
        <FactItem label="Platform" value={record.platform ?? 'Unspecified'} />
        <FactItem label="Route" value={record.route_type ?? 'Unspecified'} />
        <FactItem label="Installation" value={truncateMiddle(record.installation_id, 18)} />
        <FactItem label="Barcode" value={record.payload?.input?.barcode ?? 'Not available'} />
      </div>

      <div style={styles.recordCardFooter}>
        <div style={styles.recordDecisionLine}>
          {record.payload?.teacher_result?.overall_line ?? 'No decision summary provided.'}
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.actionButton} onClick={onSelect}>
            Open details
          </button>
          <button
            type="button"
            style={styles.actionButtonPositive}
            onClick={(event) => {
              event.stopPropagation()
              onApprove()
            }}
            disabled={updating || deleting}
          >
            Approve
          </button>
          <button type="button" style={styles.inlineGhostButton} onClick={(event) => {
            event.stopPropagation()
            onExclude()
          }} disabled={updating || deleting}>
            Exclude
          </button>
          <button type="button" style={styles.inlineGhostButton} onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
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
    distillation_status: usableForTraining ? 'approved_for_distillation' : 'excluded',
    excluded_reason: usableForTraining ? null : record.excluded_reason ?? 'Excluded from dashboard curation',
    payload: record.payload
      ? {
          ...record.payload,
          metadata: {
            ...(record.payload.metadata ?? {}),
            usable_for_training: usableForTraining,
            distillation_status: usableForTraining ? 'approved_for_distillation' : 'excluded',
          },
        }
      : record.payload,
  }
}

function applyDistillationState(
  record: RecordSummary,
  distillationStatus: DistillationStatus,
  options?: { excludedReason?: string; distillationBatchId?: string },
): RecordSummary {
  const nowIso = new Date().toISOString()
  const usableForTraining = distillationStatus === 'excluded' ? false : true
  const nextBatchId =
    options?.distillationBatchId ??
    (distillationStatus === 'exported' || distillationStatus === 'used_in_training' || distillationStatus === 'archived'
      ? record.distillation_batch_id
      : record.distillation_batch_id)
  return {
    ...record,
    usable_for_training: usableForTraining,
    distillation_status: distillationStatus,
    distillation_batch_id: nextBatchId,
    reviewed_at: distillationStatus === 'approved_for_distillation' || distillationStatus === 'excluded' ? nowIso : record.reviewed_at,
    exported_at: distillationStatus === 'exported' ? nowIso : record.exported_at,
    used_in_training_at: distillationStatus === 'used_in_training' ? nowIso : record.used_in_training_at,
    excluded_reason: distillationStatus === 'excluded' ? options?.excludedReason ?? record.excluded_reason : null,
    payload: record.payload
      ? {
          ...record.payload,
          metadata: {
            ...(record.payload.metadata ?? {}),
            usable_for_training: usableForTraining,
            distillation_status: distillationStatus,
            distillation_batch_id: nextBatchId,
            excluded_reason: distillationStatus === 'excluded' ? options?.excludedReason ?? record.excluded_reason : undefined,
          },
        }
      : record.payload,
  }
}

function buildDistillationExportPreview(record: RecordSummary) {
  return {
    record_id: record.id,
    batch_id: record.distillation_batch_id,
    schema_version: record.schema_version ?? record.payload?.schema_version ?? null,
    created_at: record.created_at,
    input: {
      product_name: record.payload?.input?.product_name_original ?? null,
      brand: record.payload?.input?.brand_original ?? null,
      category: record.payload?.input?.category_english ?? null,
      origin_country: record.payload?.input?.origin_country_english ?? null,
      barcode: record.payload?.input?.barcode ?? null,
      ingredients: record.payload?.input?.ingredients_english ?? [],
      additives: record.payload?.input?.additives_english ?? [],
      allergens: record.payload?.input?.allergens_english ?? [],
    },
    preferences: record.payload?.preferences ?? {},
    label: {
      overall_status: normalizeStatus(record.payload?.teacher_result?.overall_status ?? record.overall_status),
    },
  }
}

function normalizeStatus(status: string | null): 'safe' | 'warning' | 'unsafe' | 'cannot_assess' | 'unknown' {
  const normalized = (status ?? 'unknown').toLowerCase()
  if (normalized === 'safe' || normalized === 'warning') {
    return normalized
  }
  if (normalized === 'unsafe' || normalized === 'violation') {
    return 'unsafe'
  }
  if (normalized === 'cannot_assess' || normalized === 'cannot assess') {
    return 'cannot_assess'
  }
  return 'unknown'
}

function displayStatus(status: string | null): string {
  const normalized = normalizeStatus(status)
  if (normalized === 'unknown') return 'Unknown'
  if (normalized === 'cannot_assess') return 'Cannot Assess'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function displayDistillationStatus(status: DistillationStatus): string {
  switch (status) {
    case 'pending_review':
      return 'Needs review'
    case 'approved_for_distillation':
      return 'Ready to export'
    case 'excluded':
      return 'Excluded'
    case 'exported':
      return 'Exported'
    case 'used_in_training':
      return 'Used in training'
    case 'archived':
      return 'Archived'
  }
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
  if (normalized === 'unsafe') {
    return { ...styles.statusPill, background: '#ffe3e0', color: '#9c2f2e' }
  }
  if (normalized === 'cannot_assess') {
    return { ...styles.statusPill, background: '#edf1ef', color: '#56695e' }
  }
  return { ...styles.statusPill, background: '#edf1ef', color: '#5a6d62' }
}

function trainingStateStyle(usableForTraining: boolean): CSSProperties {
  return usableForTraining
    ? { ...styles.trainingStatePill, background: '#edf8f0', color: '#24673e' }
    : { ...styles.trainingStatePill, background: '#fff1ef', color: '#963b34' }
}

function distillationStatusStyle(status: DistillationStatus): CSSProperties {
  if (status === 'approved_for_distillation') {
    return { ...styles.distillationPill, background: '#e8f4ff', color: '#1d5e87' }
  }
  if (status === 'excluded') {
    return { ...styles.distillationPill, background: '#fff1ef', color: '#963b34' }
  }
  if (status === 'exported') {
    return { ...styles.distillationPill, background: '#f3ecff', color: '#6a42a8' }
  }
  if (status === 'used_in_training') {
    return { ...styles.distillationPill, background: '#edf8f0', color: '#24673e' }
  }
  if (status === 'archived') {
    return { ...styles.distillationPill, background: '#f2f4f3', color: '#5f7166' }
  }
  return { ...styles.distillationPill, background: '#eef2f0', color: '#5d6f65' }
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
  pipelinePanel: {
    background: 'rgba(255,255,255,0.84)',
    borderRadius: '24px',
    border: '1px solid #dce7dd',
    boxShadow: '0 14px 30px rgba(32, 68, 43, 0.08)',
    padding: '20px',
    marginBottom: '20px',
  },
  pipelinePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  batchBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#eef3ff',
    color: '#37539a',
    fontWeight: 700,
    fontSize: '12px',
  },
  pipelineStageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },
  pipelineStageCard: {
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    borderRadius: '18px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  pipelineStageCardActive: {
    border: '1px solid #9ecab0',
    background: '#eef8f1',
  },
  pipelineStageLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#6c8072',
    fontWeight: 800,
  },
  pipelineStageValue: {
    fontSize: '28px',
    color: '#1f3a2d',
  },
  batchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '14px',
  },
  batchToolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1fr) minmax(220px, 280px)',
    gap: '12px',
    marginBottom: '16px',
  },
  batchCard: {
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  batchCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
  },
  batchCardTitle: {
    margin: '6px 0 0',
    fontSize: '18px',
    lineHeight: 1.25,
    overflowWrap: 'anywhere',
  },
  batchMetaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#5f7366',
    fontSize: '13px',
  },
  batchStatusRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  jobProgressShell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jobProgressTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
  },
  batchReadyPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#edf8f0',
    color: '#24673e',
    fontWeight: 800,
    fontSize: '12px',
  },
  batchUsedPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#eef3ff',
    color: '#37539a',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStatusSafe: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#e3f6ea',
    color: '#17633d',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStatusWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#fff2db',
    color: '#8b5609',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStatusUnsafe: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#ffe3e0',
    color: '#9c2f2e',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStatusMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#edf1ef',
    color: '#56695e',
    fontWeight: 800,
    fontSize: '12px',
  },
  batchFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  batchFooterText: {
    color: '#617466',
    fontSize: '13px',
    lineHeight: 1.5,
    flex: 1,
  },
  jobMetricsBox: {
    borderRadius: '14px',
    border: '1px solid #e1ebe4',
    background: '#f6faf7',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  jobMetricsTitle: {
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#71867a',
    fontWeight: 800,
  },
  jobMetricsText: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#244032',
    wordBreak: 'break-word',
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
  bulkActionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  bulkActionsTitle: {
    margin: 0,
    fontSize: '16px',
  },
  bulkActionsSubtitle: {
    margin: '4px 0 0',
    color: '#6d8174',
    fontSize: '13px',
    lineHeight: 1.4,
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
  actionButtonDanger: {
    border: '1px solid #f0d4d0',
    background: '#ffe6e3',
    color: '#8c2f30',
    borderRadius: '999px',
    padding: '8px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  inlineGhostButton: {
    border: 'none',
    background: 'transparent',
    color: '#62786a',
    padding: '8px 4px',
    fontWeight: 700,
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
  distillationPill: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: '999px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: 800,
  },
  detailPageShell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  detailPageTopBar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '16px 18px',
    borderRadius: '22px',
    border: '1px solid #dce7dd',
    background: 'rgba(252, 255, 253, 0.94)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 12px 28px rgba(32, 68, 43, 0.08)',
  },
  detailPageHero: {
    borderRadius: '28px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fcfffd 0%, #f5faf6 100%)',
    boxShadow: '0 18px 36px rgba(32, 68, 43, 0.08)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  detailPageTitle: {
    margin: 0,
    fontSize: '44px',
    lineHeight: 1.02,
    color: '#173425',
  },
  detailPageSubtitle: {
    margin: 0,
    color: '#62786b',
    fontSize: '16px',
    lineHeight: 1.5,
  },
  detailPageGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.95fr)',
    gap: '18px',
    alignItems: 'start',
  },
  detailMainColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
  },
  detailSideColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
    position: 'sticky',
    top: '92px',
  },
  detailScreenBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(245, 250, 246, 0.96)',
    zIndex: 80,
    overflowY: 'auto',
    padding: '24px',
    boxSizing: 'border-box',
  },
  detailScreen: {
    width: 'min(1380px, 100%)',
    minHeight: 'calc(100vh - 48px)',
    margin: '0 auto',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, #fcfffd 0%, #f5faf6 100%)',
    border: '1px solid #dce7dd',
    boxShadow: '0 28px 64px rgba(15, 34, 25, 0.24)',
    display: 'flex',
    flexDirection: 'column',
  },
  detailScreenHeader: {
    padding: '24px 24px 18px',
    borderBottom: '1px solid #e1ebe4',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
  },
  detailScreenTitleBlock: {
    minWidth: 0,
  },
  detailScreenTitle: {
    margin: 0,
    fontSize: '42px',
    lineHeight: 1.05,
    color: '#173425',
  },
  detailScreenSubtitle: {
    margin: '8px 0 0',
    color: '#62786b',
    fontSize: '16px',
    lineHeight: 1.5,
  },
  detailScreenHeaderActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  drawerCloseButton: {
    border: '1px solid #d6e2d8',
    background: '#fff',
    color: '#274634',
    borderRadius: '999px',
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
  detailActionsPanel: {
    padding: '0 24px 18px',
    borderBottom: '1px solid #e1ebe4',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailTabRow: {
    padding: '16px 24px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    borderBottom: '1px solid #e1ebe4',
    background: 'rgba(250, 253, 251, 0.9)',
  },
  detailTabButton: {
    border: '1px solid #d6e2d8',
    background: '#fff',
    color: '#476355',
    borderRadius: '999px',
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  detailTabButtonActive: {
    border: '1px solid #24553e',
    background: '#173f2d',
    color: '#ffffff',
  },
  detailTabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailScreenBody: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  payloadPreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  payloadPreviewCard: {
    borderRadius: '16px',
    background: '#f6faf7',
    border: '1px solid #e1ebe4',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  payloadPreviewValue: {
    fontSize: '20px',
    color: '#193326',
  },
  payloadPreviewSubtitle: {
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#687c70',
  },
  rawJsonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
  },
  previewSectionNote: {
    margin: 0,
    color: '#667a6d',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  previewJsonBlock: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: '#f6faf7',
    color: '#193326',
    borderRadius: '16px',
    border: '1px solid #e1ebe4',
    padding: '16px',
    fontSize: '12px',
    lineHeight: 1.6,
    overflowX: 'auto',
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
  detailActionRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  paginationBar: {
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    borderTop: '1px solid #e1ebe4',
    paddingTop: '14px',
  },
  paginationMeta: {
    color: '#667a6d',
    fontSize: '13px',
    fontWeight: 600,
  },
  paginationControls: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
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
