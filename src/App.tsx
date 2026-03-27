import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

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
  logs_json: Array<{ timestamp: string; message: string }> | null
  artifact_uri: string | null
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

const teacherNodes = [
  { x: 70, y: 175, r: 18, fill: '#e34b44' },
  { x: 70, y: 245, r: 18, fill: '#e34b44' },
  { x: 150, y: 105, r: 19, fill: '#e34b44' },
  { x: 150, y: 175, r: 19, fill: '#e34b44' },
  { x: 150, y: 245, r: 19, fill: '#e34b44' },
  { x: 150, y: 315, r: 19, fill: '#e34b44' },
  { x: 240, y: 125, r: 18, fill: '#6f82d9' },
  { x: 240, y: 185, r: 18, fill: '#6f82d9' },
  { x: 240, y: 245, r: 18, fill: '#6f82d9' },
  { x: 240, y: 305, r: 18, fill: '#6f82d9' },
  { x: 330, y: 155, r: 18, fill: '#e7b164' },
  { x: 330, y: 225, r: 18, fill: '#e7b164' },
  { x: 330, y: 295, r: 18, fill: '#e7b164' },
  { x: 390, y: 190, r: 17, fill: '#9a86cc' },
  { x: 390, y: 260, r: 17, fill: '#9a86cc' },
]

const teacherConnections = [
  { x1: 70, y1: 175, x2: 150, y2: 105 },
  { x1: 70, y1: 175, x2: 150, y2: 175 },
  { x1: 70, y1: 245, x2: 150, y2: 175 },
  { x1: 70, y1: 245, x2: 150, y2: 245 },
  { x1: 150, y1: 105, x2: 240, y2: 125 },
  { x1: 150, y1: 105, x2: 240, y2: 185 },
  { x1: 150, y1: 175, x2: 240, y2: 125 },
  { x1: 150, y1: 175, x2: 240, y2: 185 },
  { x1: 150, y1: 175, x2: 240, y2: 245 },
  { x1: 150, y1: 245, x2: 240, y2: 185 },
  { x1: 150, y1: 245, x2: 240, y2: 245 },
  { x1: 150, y1: 245, x2: 240, y2: 305 },
  { x1: 150, y1: 315, x2: 240, y2: 245 },
  { x1: 150, y1: 315, x2: 240, y2: 305 },
  { x1: 240, y1: 125, x2: 330, y2: 155 },
  { x1: 240, y1: 125, x2: 330, y2: 225 },
  { x1: 240, y1: 185, x2: 330, y2: 155 },
  { x1: 240, y1: 185, x2: 330, y2: 225 },
  { x1: 240, y1: 185, x2: 330, y2: 295 },
  { x1: 240, y1: 245, x2: 330, y2: 155 },
  { x1: 240, y1: 245, x2: 330, y2: 225 },
  { x1: 240, y1: 245, x2: 330, y2: 295 },
  { x1: 240, y1: 305, x2: 330, y2: 225 },
  { x1: 240, y1: 305, x2: 330, y2: 295 },
  { x1: 330, y1: 155, x2: 390, y2: 190 },
  { x1: 330, y1: 225, x2: 390, y2: 190 },
  { x1: 330, y1: 225, x2: 390, y2: 260 },
  { x1: 330, y1: 295, x2: 390, y2: 190 },
  { x1: 330, y1: 295, x2: 390, y2: 260 },
]

const studentNodes = [
  { x: 735, y: 178, r: 17, fill: '#e34b44' },
  { x: 735, y: 242, r: 17, fill: '#e34b44' },
  { x: 795, y: 145, r: 17, fill: '#e7b164' },
  { x: 795, y: 210, r: 17, fill: '#e7b164' },
  { x: 795, y: 275, r: 17, fill: '#e7b164' },
  { x: 875, y: 178, r: 17, fill: '#9a86cc' },
  { x: 875, y: 242, r: 17, fill: '#9a86cc' },
]

const studentConnections = [
  { x1: 735, y1: 178, x2: 795, y2: 145 },
  { x1: 735, y1: 178, x2: 795, y2: 210 },
  { x1: 735, y1: 242, x2: 795, y2: 210 },
  { x1: 735, y1: 242, x2: 795, y2: 275 },
  { x1: 795, y1: 145, x2: 875, y2: 178 },
  { x1: 795, y1: 145, x2: 875, y2: 242 },
  { x1: 795, y1: 210, x2: 875, y2: 178 },
  { x1: 795, y1: 210, x2: 875, y2: 242 },
  { x1: 795, y1: 275, x2: 875, y2: 178 },
  { x1: 795, y1: 275, x2: 875, y2: 242 },
]

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
  const [activeWorkspace, setActiveWorkspace] = useState<'overview' | 'curation' | 'training'>('overview')
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
  const [selectedColabJobId, setSelectedColabJobId] = useState<number | null>(null)
  const [copyingColabCommand, setCopyingColabCommand] = useState(false)
  const [colabCommandCopied, setColabCommandCopied] = useState(false)
  const [copiedColabStep, setCopiedColabStep] = useState<string | null>(null)
  const [creatingJobBatchId, setCreatingJobBatchId] = useState<string | null>(null)
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null)
  const [updatingModelVersionId, setUpdatingModelVersionId] = useState<number | null>(null)
  const [selectedEducationStage, setSelectedEducationStage] = useState<'teacher' | 'curation' | 'training' | 'artifact' | 'activation'>('teacher')
  const [comparisonLeftVersionId, setComparisonLeftVersionId] = useState<number | null>(null)
  const [comparisonRightVersionId, setComparisonRightVersionId] = useState<number | null>(null)
  const [trainingDemoMode, setTrainingDemoMode] = useState(true)
  const trustSectionRef = useRef<HTMLElement | null>(null)
  const activeModelSectionRef = useRef<HTMLElement | null>(null)
  const lineageSectionRef = useRef<HTMLElement | null>(null)
  const modelVersionsSectionRef = useRef<HTMLElement | null>(null)
  const jobsSectionRef = useRef<HTMLElement | null>(null)
  const batchesSectionRef = useRef<HTMLElement | null>(null)

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
  const readyBatchCount = exportBatches.filter((batch) => batch.ready_for_training).length
  const activeJobCount = distillationJobs.filter((job) => ['queued', 'preparing_dataset', 'training', 'evaluating'].includes(job.status)).length
  const readyModelCount = modelVersions.filter((version) => version.status === 'ready_for_test').length
  const colabJob = useMemo(
    () => distillationJobs.find((job) => job.id === selectedColabJobId) ?? distillationJobs.find((job) => job.status === 'queued') ?? distillationJobs[0] ?? null,
    [distillationJobs, selectedColabJobId],
  )
  const colabCommand = useMemo(() => {
    if (!colabJob) return ''
    return `python scripts/colab_train_batch.py \\
  --server-url ${API_BASE.replace(/\/api$/, '')} \\
  --job-id ${colabJob.id} \\
  --batch-id ${colabJob.batch_id} \\
  --output-dir /content/label_wise_artifacts/${colabJob.batch_id} \\
  --base-model Qwen/Qwen2.5-3B-Instruct \\
  --hf-repo-id IndraDThor/label-wise-qwen25-3b-lora \\
  --backend hf_peft_seqcls`
  }, [colabJob])
  const colabCloneCommand = `!git clone https://github.com/Tokol/label_wise_server.git
%cd label_wise_server`
  const colabInstallCommand = `!pip install -r requirements.txt
!pip install torch transformers peft numpy accelerate datasets sentencepiece
!pip install huggingface_hub`
  const colabHfLoginCommand = `from huggingface_hub import notebook_login
notebook_login()`
  const artifactDownloadCommand = useMemo(() => {
    if (!colabJob) return ''
    return `!cd /content/label_wise_artifacts/${colabJob.batch_id} && zip -r model_artifact.zip model_artifact

from google.colab import files
files.download('/content/label_wise_artifacts/${colabJob.batch_id}/model_artifact.zip')`
  }, [colabJob])
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
          base_model: 'Qwen/Qwen2.5-3B-Instruct',
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

  async function downloadTrainingExport(batchId: string) {
    setDownloadingBatchId(batchId)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/records/export-batches/${encodeURIComponent(batchId)}/training-export`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail ?? 'Failed to download training export')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const filenameMatch = disposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] ?? `${batchId}.jsonl`
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download training export')
    } finally {
      setDownloadingBatchId(null)
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

  async function copyColabCommand() {
    if (!colabCommand) return
    setCopyingColabCommand(true)
    setColabCommandCopied(false)
    try {
      await navigator.clipboard.writeText(colabCommand)
      setColabCommandCopied(true)
      window.setTimeout(() => setColabCommandCopied(false), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy Colab command')
    } finally {
      setCopyingColabCommand(false)
    }
  }

  async function copyColabStep(stepKey: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedColabStep(stepKey)
      window.setTimeout(() => setCopiedColabStep((current) => (current === stepKey ? null : current)), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy Colab step')
    }
  }

  async function openInColab(jobId: number) {
    const job = distillationJobs.find((item) => item.id === jobId)
    if (!job || job.status !== 'queued') return
    setSelectedColabJobId(jobId)

    const nextCommand = `python scripts/colab_train_batch.py \\
  --server-url ${API_BASE.replace(/\/api$/, '')} \\
  --job-id ${job.id} \\
  --batch-id ${job.batch_id} \\
  --output-dir /content/label_wise_artifacts/${job.batch_id} \\
  --base-model Qwen/Qwen2.5-3B-Instruct \\
  --backend hf_peft_seqcls`

    try {
      await navigator.clipboard.writeText(nextCommand)
      setColabCommandCopied(true)
      window.setTimeout(() => setColabCommandCopied(false), 1800)
    } catch {
      // Ignore clipboard failure here; the command stays visible in the helper panel.
    }

    window.open('https://colab.new/', '_blank', 'noopener,noreferrer')
  }

  const activeFilterCount = [routeFilter, statusFilter, trainingFilter, platformFilter, categoryFilter].filter(
    (value) => value !== 'all',
  ).length + (distillationFilter !== 'all' ? 1 : 0) + (recordQuery.trim() ? 1 : 0)
  const distillationPreview = selectedRecord ? buildDistillationExportPreview(selectedRecord) : null
  const activeModelVersion = modelVersions.find((version) => version.status === 'active_test') ?? null
  const latestCompletedJob = distillationJobs.find((job) => job.status === 'completed') ?? null
  const latestCompletedVersion = modelVersions.find((version) => version.status !== 'archived') ?? modelVersions[0] ?? null
  const comparisonLeftVersion =
    modelVersions.find((version) => version.id === comparisonLeftVersionId) ??
    modelVersions.find((version) => version.status === 'active_test') ??
    modelVersions[0] ??
    null
  const comparisonRightVersion =
    modelVersions.find((version) => version.id === comparisonRightVersionId) ??
    modelVersions.find((version) => version.id !== comparisonLeftVersion?.id) ??
    modelVersions[1] ??
    null
  const latestTrainingMetrics = latestCompletedVersion?.metrics_json ?? latestCompletedJob?.metrics_json ?? null
  const latestDatasetSummary =
    latestTrainingMetrics && typeof latestTrainingMetrics.dataset_summary === 'object' && latestTrainingMetrics.dataset_summary !== null
      ? (latestTrainingMetrics.dataset_summary as Record<string, unknown>)
      : null
  const latestLabelDistribution =
    latestDatasetSummary && typeof latestDatasetSummary.label_distribution === 'object' && latestDatasetSummary.label_distribution !== null
      ? (latestDatasetSummary.label_distribution as Record<string, unknown>)
      : null
  const latestRecordCount = extractDatasetMetric(latestTrainingMetrics, 'record_count') ?? 0
  const latestTrainCount = extractDatasetMetric(latestTrainingMetrics, 'train') ?? 0
  const latestValidationCount = extractDatasetMetric(latestTrainingMetrics, 'validation') ?? 0
  const latestCompleteInputRatio = latestDatasetSummary && typeof latestDatasetSummary.complete_input_ratio === 'number'
    ? latestDatasetSummary.complete_input_ratio
    : null
  const latestPreferenceKeys =
    latestDatasetSummary && Array.isArray(latestDatasetSummary.preference_keys)
      ? latestDatasetSummary.preference_keys.filter((value): value is string => typeof value === 'string')
      : []
  const latestDominantLabelShare = latestLabelDistribution ? dominantLabelShare(latestLabelDistribution) : null
  const runTrustSignals = [
    {
      label: 'Dataset size',
      value: latestRecordCount > 0 ? String(latestRecordCount) : 'No run yet',
      tone: latestRecordCount >= 40 ? 'good' : latestRecordCount >= 12 ? 'watch' : 'risk',
      body:
        latestRecordCount >= 40
          ? 'Enough examples to make the latest metrics more believable for a prototype run.'
          : latestRecordCount >= 12
            ? 'Usable for pipeline testing, but still small enough that metrics may swing a lot.'
            : 'Very small sample. Treat strong-looking metrics as demonstration-only.',
    },
    {
      label: 'Validation split',
      value: latestValidationCount > 0 ? `${latestTrainCount} / ${latestValidationCount}` : 'Missing',
      tone: latestValidationCount >= 5 ? 'good' : latestValidationCount >= 2 ? 'watch' : 'risk',
      body:
        latestValidationCount >= 5
          ? 'There are enough held-out examples to give the latest evaluation at least some friction.'
          : latestValidationCount >= 2
            ? 'A validation split exists, but it is still thin and easy to overread.'
            : 'Without a meaningful validation slice, the reported metrics are weak evidence.',
    },
    {
      label: 'Label balance',
      value: latestDominantLabelShare == null ? 'Unknown' : `${Math.round(latestDominantLabelShare * 100)}% dominant`,
      tone: latestDominantLabelShare != null && latestDominantLabelShare <= 0.55 ? 'good' : latestDominantLabelShare != null && latestDominantLabelShare <= 0.75 ? 'watch' : 'risk',
      body:
        latestDominantLabelShare != null && latestDominantLabelShare <= 0.55
          ? 'No single label dominates too heavily, so accuracy is less likely to be inflated by class imbalance.'
          : latestDominantLabelShare != null && latestDominantLabelShare <= 0.75
            ? 'One label is pulling ahead. Macro F1 matters more than raw accuracy for this run.'
            : 'The batch is heavily skewed toward one label. Accuracy alone is not trustworthy here.',
    },
    {
      label: 'Input completeness',
      value: latestCompleteInputRatio == null ? 'Unknown' : `${Math.round(latestCompleteInputRatio * 100)}% complete`,
      tone: latestCompleteInputRatio != null && latestCompleteInputRatio >= 0.8 ? 'good' : latestCompleteInputRatio != null && latestCompleteInputRatio >= 0.5 ? 'watch' : 'risk',
      body:
        latestCompleteInputRatio != null && latestCompleteInputRatio >= 0.8
          ? 'Most examples include the fields the student needs, which helps the run reflect real usage better.'
          : latestCompleteInputRatio != null && latestCompleteInputRatio >= 0.5
            ? 'Many examples are usable, but there is still enough missing structure to weaken the training signal.'
            : 'A large share of examples are incomplete. Improve record quality before trusting the next run.',
    },
  ]
  const trustSummaryTone = runTrustSignals.filter((signal) => signal.tone === 'risk').length > 1
    ? 'risk'
    : runTrustSignals.some((signal) => signal.tone === 'watch')
      ? 'watch'
      : 'good'
  const trustSummaryTitle =
    trustSummaryTone === 'good'
      ? 'Latest run is reasonably interpretable'
      : trustSummaryTone === 'watch'
        ? 'Latest run is useful, but still easy to overread'
        : 'Latest run is mainly pipeline proof, not strong evidence'
  const trustSummaryCopy =
    trustSummaryTone === 'good'
      ? 'Use the metrics as an early research signal, while still validating with more batches over time.'
      : trustSummaryTone === 'watch'
        ? 'The run says something real about the workflow, but dataset size or balance still limits how much confidence you should place in the numbers.'
        : 'Treat this run as confirmation that the collection and training flow works. Improve curation volume and balance before drawing performance conclusions.'
  const trainingLifecycleCards = [
    {
      title: 'Curate records',
      value: String(overview.approvedForDistillationRecords + overview.pendingReviewRecords),
      subtitle: 'Review products first, then approve only the records that are useful for training.',
    },
    {
      title: 'Export batches',
      value: String(totalBatchCount),
      subtitle: 'An export batch is the exact dataset package that gets handed into one training run.',
    },
    {
      title: 'Run distillation',
      value: String(totalJobCount),
      subtitle: 'A distillation job is one fine-tuning attempt of the student model on one selected batch.',
    },
    {
      title: 'Register versions',
      value: String(totalModelVersionCount),
      subtitle: 'Completed jobs become model versions with metrics and an artifact location.',
    },
    {
      title: 'Activate one',
      value: activeModelVersion?.model_name ?? 'None selected',
      subtitle: 'Only one version should be active for testing at a time. Others stay on standby or archived.',
    },
  ]
  const metricExplainers = [
    {
      label: 'Accuracy',
      value: formatMetricValue(extractEvaluationMetric(latestTrainingMetrics, 'status_accuracy')),
      meaning: 'How often the model predicted the correct label on validation examples.',
      interpretation: 'Higher is better, but tiny datasets can make this look stronger than the model really is.',
    },
    {
      label: 'Macro F1',
      value: formatMetricValue(extractEvaluationMetric(latestTrainingMetrics, 'macro_f1')),
      meaning: 'How balanced the model is across all labels, not just the most common class.',
      interpretation: 'Higher is better. This is often more useful than raw accuracy when labels are uneven.',
    },
    {
      label: 'Eval Loss',
      value: formatMetricValue(extractEvaluationMetric(latestTrainingMetrics, 'eval_loss')),
      meaning: 'A training-side measure of how wrong the model was during evaluation.',
      interpretation: 'Lower is better. Read it together with Accuracy and Macro F1, not alone.',
    },
    {
      label: 'Records',
      value: String(extractDatasetMetric(latestTrainingMetrics, 'record_count') ?? 'N/A'),
      meaning: 'How many examples the run used in total.',
      interpretation: 'More records usually means the evaluation is more trustworthy.',
    },
  ]
  const labelDistributionChart: ChartDatum[] = latestLabelDistribution
    ? [
        { label: 'Safe', value: numericRecordMetric(latestLabelDistribution.safe), tone: 'green' },
        { label: 'Warning', value: numericRecordMetric(latestLabelDistribution.warning), tone: 'amber' },
        { label: 'Unsafe', value: numericRecordMetric(latestLabelDistribution.unsafe), tone: 'red' },
        { label: 'Cannot assess', value: numericRecordMetric(latestLabelDistribution.cannot_assess), tone: 'slate' },
        { label: 'Unknown', value: numericRecordMetric(latestLabelDistribution.unknown), tone: 'slate' },
      ]
    : []
  const trainValidationChart: ChartDatum[] = [
    { label: 'Train records', value: extractDatasetMetric(latestTrainingMetrics, 'train') ?? 0, tone: 'green' },
    { label: 'Validation records', value: extractDatasetMetric(latestTrainingMetrics, 'validation') ?? 0, tone: 'amber' },
  ]
  const distillationSetupCards = [
    {
      eyebrow: 'Teacher',
      title: 'OpenAI teacher',
      body: 'The teacher model analyzes products first and produces the supervision signal that gets curated before training.',
      accent: 'teacher' as const,
    },
    {
      eyebrow: 'Curation',
      title: 'Approved records',
      body: 'Only reviewed records should be exported. This is where low-quality or misleading examples are filtered out.',
      accent: 'curation' as const,
    },
    {
      eyebrow: 'Training',
      title: 'Qwen base + LoRA',
      body: 'Qwen is the student base model. LoRA is the lightweight adapter trained on top of it for this specific task.',
      accent: 'student' as const,
    },
    {
      eyebrow: 'Output',
      title: 'Versioned artifact',
      body: 'Each completed job creates one model version and one artifact path, usually stored in Hugging Face.',
      accent: 'artifact' as const,
    },
  ]
  const glossaryCards = [
    {
      term: 'LoRA',
      meaning: 'A lightweight adapter trained on top of the base model instead of rewriting the full Qwen checkpoint.',
    },
    {
      term: 'Distillation',
      meaning: 'The process where a stronger teacher helps a smaller student learn through curated examples.',
    },
    {
      term: 'Installation',
      meaning: 'One app/device registration. It explains where records came from, not how the model works.',
    },
    {
      term: 'Export batch',
      meaning: 'A grouped dataset package created from approved records and used for one training attempt.',
    },
    {
      term: 'Distillation job',
      meaning: 'One fine-tuning run on one exported batch. It can complete, fail, or produce a new model version.',
    },
    {
      term: 'Active test model',
      meaning: 'The single selected version the system treats as the current model for testing or hosted inference.',
    },
  ]
  const nextStepCards = [
    {
      title: '1. Curate better data',
      copy: 'Keep improving approved records. Better supervision quality matters more than collecting noisy volume.',
    },
    {
      title: '2. Run larger batches',
      copy: 'Tiny runs prove the pipeline, but larger curated batches give more trustworthy metrics and versions.',
    },
    {
      title: '3. Build label_wise_lite',
      copy: 'Use the student inference API contract in the new Flutter client instead of the current OpenAI prompt flow.',
    },
    {
      title: '4. Host when needed',
      copy: 'Keep artifacts in Hugging Face and bring up a separate GPU inference runtime only when you need it.',
    },
  ]
  const educationStages = [
    {
      id: 'teacher' as const,
      eyebrow: 'Stage 1',
      title: 'Teacher records arrive from the mobile app',
      summary: 'The app uploads structured examples containing product data, preferences, and teacher output.',
      details:
        'This is the supervision source for the whole research pipeline. The stronger teacher signal comes from the existing app flow, not from the student model.',
      inputs: 'Uploaded record payloads from the Flutter app',
      outputs: 'Stored analysis records ready for dashboard review',
      risk: 'If the teacher output is noisy or incomplete, the student will learn from bad examples.',
    },
    {
      id: 'curation' as const,
      eyebrow: 'Stage 2',
      title: 'Curate and export a clean batch',
      summary: 'The dashboard filters records, approves the useful ones, and exports them as one JSONL training batch.',
      details:
        'This is the quality gate. Distillation here does not mean every collected record should be used. It means only reviewed examples become training material.',
      inputs: 'Reviewed records with lifecycle states such as pending, approved, or excluded',
      outputs: 'A versioned export batch that can be downloaded or passed into one job',
      risk: 'Metrics become misleading when the batch is too small, too imbalanced, or full of edge cases that were never reviewed.',
    },
    {
      id: 'training' as const,
      eyebrow: 'Stage 3',
      title: 'Run one distillation job',
      summary: 'A worker or Colab run trains a lightweight adapter on top of the Qwen base model.',
      details:
        'This is the real training attempt. The student model is smaller and cheaper to serve later, while the teacher remains the richer source of supervision.',
      inputs: 'One exported batch, one base model, one training configuration',
      outputs: 'Metrics, logs, and one trained adapter artifact',
      risk: 'A completed run is not automatically a good run. You still need to read metrics and dataset size together.',
    },
    {
      id: 'artifact' as const,
      eyebrow: 'Stage 4',
      title: 'Register the artifact and store it in Hugging Face',
      summary: 'The finished adapter can be uploaded to Hugging Face and the stored URL becomes the artifact location shown in the dashboard.',
      details:
        'In this project, Hugging Face is the model-artifact storage and handoff layer. It keeps the trained adapter files accessible for later loading, sharing, or deployment.',
      inputs: 'A completed training output folder such as model_artifact/',
      outputs: 'An artifact URI, often a Hugging Face path, attached to the model version',
      risk: 'If the artifact only exists in Colab and is never uploaded or downloaded, it is temporary and easy to lose.',
    },
    {
      id: 'activation' as const,
      eyebrow: 'Stage 5',
      title: 'Mark one version active for testing',
      summary: 'The dashboard marks one model version as the active test model and the server exposes its metadata.',
      details:
        'This step selects which artifact the future inference runtime should use. Right now the public inference contract exists, but real hosted inference is still deferred.',
      inputs: 'One completed model version with artifact metadata',
      outputs: 'A single active test model for API lookup and future runtime loading',
      risk: 'Activation is only selection metadata today. It does not mean live model serving is already running.',
    },
  ]
  const selectedEducationCard = educationStages.find((stage) => stage.id === selectedEducationStage) ?? educationStages[0]
  const huggingFaceFacts = [
    {
      label: 'What Hugging Face is here',
      value: 'Artifact storage',
      body: 'It stores the trained adapter files and gives the project a durable model path to keep or reuse later.',
    },
    {
      label: 'What gets uploaded',
      value: 'Model artifact folder',
      body: 'The finished adapter output from training, plus the files that describe metrics, config, and the training snapshot.',
    },
    {
      label: 'What the dashboard receives',
      value: 'Artifact URI',
      body: 'The server saves the returned Hugging Face path and the dashboard shows it in jobs, versions, and the active model panel.',
    },
    {
      label: 'What is not live yet',
      value: 'Hosted inference',
      body: 'The current dashboard and API can point to the active artifact, but the real student-model inference runtime is still a later step.',
    },
  ]
  const implementationStateCards = [
    {
      title: 'Implemented now',
      copy: 'Record collection, review, export batches, distillation jobs, artifact registration, Hugging Face upload guidance, and active-model selection are already part of the workflow.',
    },
    {
      title: 'Deferred for later',
      copy: 'Real online student inference is intentionally postponed because serving costs are high. The project keeps the artifact path and activation flow ready for that later phase.',
    },
  ]

  function scrollToTrainingStage(stage: 'teacher' | 'curation' | 'training' | 'artifact' | 'activation') {
    setSelectedEducationStage(stage)

    const target =
      stage === 'curation'
        ? batchesSectionRef.current
        : stage === 'training'
          ? jobsSectionRef.current
          : stage === 'artifact'
            ? modelVersionsSectionRef.current
            : stage === 'activation'
              ? activeModelSectionRef.current
              : trustSectionRef.current

    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const metaphorStageTone =
    selectedEducationStage === 'teacher'
      ? 'Teacher-heavy'
      : selectedEducationStage === 'curation'
        ? 'Quality gate'
        : selectedEducationStage === 'training'
          ? 'Transfer in progress'
          : selectedEducationStage === 'artifact'
            ? 'Artifact handoff'
            : 'Activation ready'
  const comparisonRecordsDelta =
    comparisonLeftVersion && comparisonRightVersion
      ? (extractDatasetMetric(comparisonLeftVersion.metrics_json, 'record_count') ?? 0) - (extractDatasetMetric(comparisonRightVersion.metrics_json, 'record_count') ?? 0)
      : null
  const comparisonAccuracyDelta =
    comparisonLeftVersion && comparisonRightVersion
      ? (extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'status_accuracy') ?? 0) - (extractEvaluationMetric(comparisonRightVersion.metrics_json, 'status_accuracy') ?? 0)
      : null
  const comparisonMacroF1Delta =
    comparisonLeftVersion && comparisonRightVersion
      ? (extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'macro_f1') ?? 0) - (extractEvaluationMetric(comparisonRightVersion.metrics_json, 'macro_f1') ?? 0)
      : null
  const comparisonEvalLossDelta =
    comparisonLeftVersion && comparisonRightVersion
      ? (extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'eval_loss') ?? 0) - (extractEvaluationMetric(comparisonRightVersion.metrics_json, 'eval_loss') ?? 0)
      : null
  const comparisonSummary = buildVersionComparisonSummary(comparisonLeftVersion, comparisonRightVersion)
  const lineageEntries = modelVersions.map((version) => {
    const job = distillationJobs.find((item) => item.id === version.job_id) ?? null
    const batch = exportBatches.find((item) => item.batch_id === version.batch_id) ?? null
    return {
      version,
      job,
      batch,
      active: version.status === 'active_test',
    }
  }).sort((left, right) => {
    if (left.active && !right.active) return -1
    if (!left.active && right.active) return 1
    return right.version.id - left.version.id
  })
  function openCurationWorkspace() {
    if (['exported', 'used_in_training', 'archived'].includes(distillationFilter)) {
      setDistillationFilter('all')
    }
    setActiveWorkspace('curation')
  }

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
      <section style={styles.workspaceNav} role="tablist" aria-label="Dashboard workspaces">
        <WorkspaceTabButton label="Overview" active={activeWorkspace === 'overview'} onClick={() => setActiveWorkspace('overview')} />
        <WorkspaceTabButton label="Curation" active={activeWorkspace === 'curation'} onClick={openCurationWorkspace} />
        <WorkspaceTabButton label="Training" active={activeWorkspace === 'training'} onClick={() => setActiveWorkspace('training')} />
      </section>

      {activeWorkspace === 'overview' ? (
        <>
          <section style={styles.analyticsStrip}>
            <ChartCard title="Status Distribution" subtitle="Current filtered outcome mix">
              <HorizontalBarChart data={chartData.status} emptyLabel="No status data in current filter." />
            </ChartCard>
            <ChartCard title="Record source" subtitle="Barcode versus photo ingestion">
              <HorizontalBarChart data={chartData.route} emptyLabel="No route data in current filter." />
            </ChartCard>
            <ChartCard title="Lifecycle overview" subtitle="Where the visible records sit in the review flow">
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

          <section style={styles.overviewGrid}>
            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Review Pipeline</h2>
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
                    onClick={() => {
                      setDistillationFilter(distillationFilter === stage.key ? 'all' : stage.key)
                      openCurationWorkspace()
                    }}
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
                  <h2 style={styles.cardTitle}>Training Snapshot</h2>
                  <p style={styles.cardSubtitle}>
                    A compact view of what is ready for training, what is currently running, and which model is selected for testing.
                  </p>
                </div>
              </div>
              <div style={styles.trainingSnapshotGrid}>
                <SummaryFact label="Ready batches" value={String(readyBatchCount)} />
                <SummaryFact label="Active jobs" value={String(activeJobCount)} />
                <SummaryFact label="Ready models" value={String(readyModelCount)} />
                <SummaryFact label="Active model" value={activeModelVersion?.model_name ?? 'None selected'} />
              </div>
              <div style={styles.batchFooter}>
                <span style={styles.batchFooterText}>
                  Operational training controls now live in the Training workspace so this overview stays focused on signal, not process noise.
                </span>
                <button type="button" style={styles.actionButton} onClick={() => setActiveWorkspace('training')}>
                  Open training workspace
                </button>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {activeWorkspace === 'training' ? (
        <>
          <section style={styles.pipelinePanel}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>Training Workspace Mode</h2>
                <p style={styles.cardSubtitle}>
                  Switch between a thesis-demo narrative and the full operational workspace. Demo mode keeps the research story clear. Workspace mode exposes the detailed job and batch controls.
                </p>
              </div>
              <span style={styles.batchBadge}>{trainingDemoMode ? 'Demo mode' : 'Workspace mode'}</span>
            </div>
            <div style={styles.modeToggleRow}>
              <button
                type="button"
                style={trainingDemoMode ? styles.modeToggleButtonActive : styles.modeToggleButton}
                onClick={() => setTrainingDemoMode(true)}
              >
                Demo mode
              </button>
              <button
                type="button"
                style={!trainingDemoMode ? styles.modeToggleButtonActive : styles.modeToggleButton}
                onClick={() => setTrainingDemoMode(false)}
              >
                Workspace mode
              </button>
            </div>
            <div style={styles.modeSummaryGrid}>
              <article style={styles.modeSummaryCard}>
                <span style={styles.modeSummaryLabel}>Demo mode focuses on</span>
                <p style={styles.modeSummaryBody}>diagram, guided process, trust summary, lineage, comparison, and active-model story.</p>
              </article>
              <article style={styles.modeSummaryCard}>
                <span style={styles.modeSummaryLabel}>Workspace mode focuses on</span>
                <p style={styles.modeSummaryBody}>export batches, distillation jobs, Colab handoff, full model-version cards, and operational control.</p>
              </article>
            </div>
          </section>

          <section style={styles.pipelinePanel}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>How Distillation Works In Label Wise</h2>
                <p style={styles.cardSubtitle}>
                  The mobile app scans food labels and product data, the OpenAI-backed teacher produces structured decisions, the dashboard curates those records into training batches, and the resulting student artifact is prepared for lower-cost future inference.
                </p>
              </div>
              <span style={styles.batchBadge}>{metaphorStageTone}</span>
            </div>
            <DistillationDiagram
              selectedStage={selectedEducationStage}
              onSelectStage={scrollToTrainingStage}
              selectedStageOutput={selectedEducationCard.outputs}
            />
            <div style={styles.diagramContextGrid}>
              <article style={styles.diagramContextCard}>
                <span style={styles.diagramContextLabel}>Data source</span>
                <p style={styles.diagramContextBody}>
                  Label Wise collects packaged food data from barcode scans and photo-based label capture, then stores the structured result records for review.
                </p>
              </article>
              <article style={styles.diagramContextCard}>
                <span style={styles.diagramContextLabel}>Teacher signal</span>
                <p style={styles.diagramContextBody}>
                  The current app flow uses the OpenAI-backed teacher path to produce the richer judgement, explanation, and label that supervise later student training.
                </p>
              </article>
              <article style={styles.diagramContextCard}>
                <span style={styles.diagramContextLabel}>Training handoff</span>
                <p style={styles.diagramContextBody}>
                  The dashboard filters those records into curated export batches. A training job uses one batch to produce one student artifact and one model version.
                </p>
              </article>
              <article style={styles.diagramContextCard}>
                <span style={styles.diagramContextLabel}>Artifact role</span>
                <p style={styles.diagramContextBody}>
                  Hugging Face stores the finished adapter after training. It is the artifact destination for later loading, not the system that generates the supervision signal.
                </p>
              </article>
            </div>
          </section>

          <section ref={trustSectionRef} style={styles.trainingEducationGrid}>
            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>How This Pipeline Works</h2>
                  <p style={styles.cardSubtitle}>
                    Training here is a guided lifecycle: curate records, export a batch, run one distillation job, register the output as a model version, then activate one version for testing.
                  </p>
                </div>
                <span style={styles.batchBadge}>Workflow guide</span>
              </div>
              <div style={styles.educationFlowGrid}>
                {trainingLifecycleCards.map((card, index) => (
                  <article key={card.title} style={styles.educationFlowCard}>
                    <div style={styles.educationFlowTop}>
                      <span style={styles.factLabel}>{card.title}</span>
                      {index < trainingLifecycleCards.length - 1 ? <span style={styles.flowArrow}>→</span> : null}
                    </div>
                    <strong style={styles.educationFlowValue}>{card.value}</strong>
                    <p style={styles.educationFlowCopy}>{card.subtitle}</p>
                  </article>
                ))}
              </div>
            </section>

            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>How To Read The Metrics</h2>
                  <p style={styles.cardSubtitle}>
                    The latest finished run is summarized below in product language so you do not have to interpret raw training terminology on your own.
                  </p>
                </div>
                <span style={styles.batchBadge}>Latest run</span>
              </div>
              <div style={styles.metricExplainerGrid}>
                {metricExplainers.map((item) => (
                  <article key={item.label} style={styles.metricExplainerCard}>
                    <div style={styles.metricExplainerTop}>
                      <span style={styles.metricExplainerLabel}>{item.label}</span>
                      <strong style={styles.metricExplainerValue}>{item.value}</strong>
                    </div>
                    <p style={styles.metricExplainerBody}>{item.meaning}</p>
                    <p style={styles.metricExplainerHint}>{item.interpretation}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section style={styles.trainingEducationGrid}>
            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Interactive Process Guide</h2>
                  <p style={styles.cardSubtitle}>
                    Follow the actual research flow from teacher output to model artifact. Click a stage to see what goes in, what comes out, and what the dashboard is responsible for.
                  </p>
                </div>
                <span style={styles.batchBadge}>Step by step</span>
              </div>
              <div style={styles.educationStageRail}>
                {educationStages.map((stage, index) => (
                  <button
                    key={stage.id}
                    type="button"
                    style={selectedEducationStage === stage.id ? styles.educationStageButtonActive : styles.educationStageButton}
                    onClick={() => scrollToTrainingStage(stage.id)}
                  >
                    <span style={styles.educationStageEyebrow}>{stage.eyebrow}</span>
                    <strong style={styles.educationStageTitle}>{stage.title}</strong>
                    <span style={styles.educationStageSummary}>{stage.summary}</span>
                    {index < educationStages.length - 1 ? <span style={styles.educationStageArrow}>→</span> : null}
                  </button>
                ))}
              </div>
            </section>

            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>{selectedEducationCard.title}</h2>
                  <p style={styles.cardSubtitle}>{selectedEducationCard.summary}</p>
                </div>
                <span style={styles.batchBadge}>{selectedEducationCard.eyebrow}</span>
              </div>
              <div style={styles.educationDetailCard}>
                <p style={styles.educationDetailLead}>{selectedEducationCard.details}</p>
                <div style={styles.educationDetailGrid}>
                  <article style={styles.educationDetailBlock}>
                    <span style={styles.educationDetailLabel}>Input</span>
                    <p style={styles.educationDetailBody}>{selectedEducationCard.inputs}</p>
                  </article>
                  <article style={styles.educationDetailBlock}>
                    <span style={styles.educationDetailLabel}>Output</span>
                    <p style={styles.educationDetailBody}>{selectedEducationCard.outputs}</p>
                  </article>
                  <article style={styles.educationDetailBlock}>
                    <span style={styles.educationDetailLabel}>Why it matters</span>
                    <p style={styles.educationDetailBody}>{selectedEducationCard.risk}</p>
                  </article>
                </div>
              </div>
            </section>
          </section>

          <section style={styles.analyticsStrip}>
            <ChartCard
              title="Latest Label Distribution"
              subtitle="Shows what the latest training run actually learned from. If one label dominates, some metrics can look better than they really are."
            >
              <HorizontalBarChart data={labelDistributionChart} emptyLabel="Complete one real job to visualize the label mix used in training." />
            </ChartCard>
            <ChartCard
              title="Train vs Validation Split"
              subtitle="Training teaches the model. Validation checks whether it generalizes instead of only memorizing the exported batch."
            >
              <HorizontalBarChart data={trainValidationChart} emptyLabel="No train/validation split is available yet." />
            </ChartCard>
            <ChartCard
              title="Artifact Meaning"
              subtitle="The artifact is the trained LoRA adapter output. It is not the full Qwen model by itself."
            >
              <div style={styles.artifactExplainStack}>
                <div style={styles.artifactExplainRow}>
                  <span style={styles.artifactExplainBadge}>Base model</span>
                  <span style={styles.artifactExplainText}>{activeModelVersion?.base_model ?? latestCompletedVersion?.base_model ?? 'Qwen/Qwen2.5-3B-Instruct'}</span>
                </div>
                <div style={styles.artifactExplainRow}>
                  <span style={styles.artifactExplainBadge}>Adapter</span>
                  <span style={styles.artifactExplainText}>{activeModelVersion?.artifact_uri ?? latestCompletedVersion?.artifact_uri ?? 'No artifact registered yet'}</span>
                </div>
                <div style={styles.artifactExplainRow}>
                  <span style={styles.artifactExplainBadge}>What it means</span>
                  <span style={styles.artifactExplainText}>Hosted inference uses the active base model together with this artifact. The active test model is the one version currently selected to run.</span>
                </div>
              </div>
            </ChartCard>
          </section>

          <section style={styles.trainingEducationGrid}>
            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Is This Run Trustworthy?</h2>
                  <p style={styles.cardSubtitle}>
                    These checks translate the latest dataset summary into a simple research judgement. They are meant to stop the dashboard from making tiny or skewed runs look more convincing than they are.
                  </p>
                </div>
                <span style={trustSummaryTone === 'good' ? styles.batchReadyPill : trustSummaryTone === 'watch' ? styles.miniStatusWarning : styles.miniStatusUnsafe}>
                  {trustSummaryTone === 'good' ? 'Reasonably stable' : trustSummaryTone === 'watch' ? 'Read carefully' : 'Early signal only'}
                </span>
              </div>
              <div style={styles.runTrustHero}>
                <h3 style={styles.runTrustTitle}>{trustSummaryTitle}</h3>
                <p style={styles.runTrustCopy}>{trustSummaryCopy}</p>
                <div style={styles.runTrustMeta}>
                  <span style={styles.miniStagePill}>Preference keys: {latestPreferenceKeys.length > 0 ? latestPreferenceKeys.join(', ') : 'None recorded'}</span>
                  <span style={styles.miniStagePillSecondary}>Latest source: {latestCompletedVersion ? 'Model version metrics' : latestCompletedJob ? 'Job metrics' : 'No completed run'}</span>
                </div>
              </div>
            </section>

            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Trust Signals</h2>
                  <p style={styles.cardSubtitle}>
                    Read these before interpreting Accuracy or Macro F1. They describe whether the latest run was measured under conditions that are even worth comparing.
                  </p>
                </div>
                <span style={styles.batchBadge}>Quality checks</span>
              </div>
              <div style={styles.runTrustGrid}>
                {runTrustSignals.map((signal) => (
                  <article key={signal.label} style={styles.runTrustCard}>
                    <div style={styles.runTrustCardTop}>
                      <span style={styles.runTrustLabel}>{signal.label}</span>
                      <span style={signal.tone === 'good' ? styles.runTrustPillGood : signal.tone === 'watch' ? styles.runTrustPillWatch : styles.runTrustPillRisk}>
                        {signal.value}
                      </span>
                    </div>
                    <p style={styles.runTrustCardBody}>{signal.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section style={styles.trainingEducationGrid}>
            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>What Hugging Face Does Here</h2>
                  <p style={styles.cardSubtitle}>
                    Hugging Face is the artifact destination in this workflow. It is where the trained adapter can live after a run so the project has a reusable model path instead of leaving the output trapped inside Colab.
                  </p>
                </div>
                <span style={styles.batchBadge}>Artifact handoff</span>
              </div>
              <div style={styles.hfFactsGrid}>
                {huggingFaceFacts.map((fact) => (
                  <article key={fact.label} style={styles.hfFactCard}>
                    <span style={styles.hfFactLabel}>{fact.label}</span>
                    <strong style={styles.hfFactValue}>{fact.value}</strong>
                    <p style={styles.hfFactBody}>{fact.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section style={styles.pipelinePanel}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Current Implementation State</h2>
                  <p style={styles.cardSubtitle}>
                    This dashboard should separate what already works from what is intentionally postponed. That matters for a thesis demo because the artifact pipeline is real even though full hosted inference is not.
                  </p>
                </div>
                <span style={styles.batchBadge}>Research scope</span>
              </div>
              <div style={styles.implementationStateGrid}>
                {implementationStateCards.map((item) => (
                  <article key={item.title} style={styles.implementationStateCard}>
                    <h3 style={styles.implementationStateTitle}>{item.title}</h3>
                    <p style={styles.implementationStateCopy}>{item.copy}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>

          {!trainingDemoMode ? (
            <>
              <section style={styles.trainingEducationGrid}>
                <section style={styles.pipelinePanel}>
                  <div style={styles.pipelinePanelHeader}>
                    <div>
                      <h2 style={styles.cardTitle}>Distillation Setup</h2>
                      <p style={styles.cardSubtitle}>
                        This is the teacher-student chemistry of the pipeline: OpenAI acts as the teacher, curated records become the learning material, and Qwen absorbs that knowledge through a LoRA adapter.
                      </p>
                    </div>
                    <span style={styles.batchBadge}>Teacher → Student</span>
                  </div>
                  <div style={styles.setupFlowGrid}>
                    {distillationSetupCards.map((card, index) => (
                      <article key={card.title} style={{ ...styles.setupFlowCard, ...setupFlowAccent(card.accent) }}>
                        <span style={styles.setupFlowEyebrow}>{card.eyebrow}</span>
                        <h3 style={styles.setupFlowTitle}>{card.title}</h3>
                        <p style={styles.setupFlowBody}>{card.body}</p>
                        {index < distillationSetupCards.length - 1 ? <span style={styles.setupFlowArrow}>→</span> : null}
                      </article>
                    ))}
                  </div>
                </section>

                <section style={styles.pipelinePanel}>
                  <div style={styles.pipelinePanelHeader}>
                    <div>
                      <h2 style={styles.cardTitle}>Glossary</h2>
                      <p style={styles.cardSubtitle}>
                        These are the terms that matter most in this workspace so the labels on jobs, versions, and artifacts stay understandable.
                      </p>
                    </div>
                    <span style={styles.batchBadge}>Key concepts</span>
                  </div>
                  <div style={styles.glossaryGrid}>
                    {glossaryCards.map((card) => (
                      <article key={card.term} style={styles.glossaryCard}>
                        <span style={styles.glossaryTerm}>{card.term}</span>
                        <p style={styles.glossaryMeaning}>{card.meaning}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </section>

              <section style={styles.pipelinePanel}>
                <div style={styles.pipelinePanelHeader}>
                  <div>
                    <h2 style={styles.cardTitle}>What Comes Next</h2>
                    <p style={styles.cardSubtitle}>
                      The pipeline foundation is in place. These are the next high-value moves after the first training and artifact flow.
                    </p>
                  </div>
                  <span style={styles.batchBadge}>Next actions</span>
                </div>
                <div style={styles.nextStepsGrid}>
                  {nextStepCards.map((item) => (
                    <article key={item.title} style={styles.nextStepCard}>
                      <h3 style={styles.nextStepTitle}>{item.title}</h3>
                      <p style={styles.nextStepCopy}>{item.copy}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          <section style={styles.trainingControlStrip}>
            <section ref={activeModelSectionRef} style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['activation']) }}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Selected Test Model</h2>
                  <p style={styles.cardSubtitle}>
                    This is the one version currently selected for testing or hosted inference. Everything else stays as history or standby.
                  </p>
                </div>
                <span style={styles.batchBadge}>{activeModelVersion ? 'Active test model' : 'Not set'}</span>
              </div>
              <div style={styles.stageContextBar}>
                <span style={styles.stageContextPill}>Stage 5</span>
                <p style={styles.stageContextText}>
                  This is the final selection layer of the workflow. It points to the version the future runtime should use, even though full hosted inference is still deferred.
                </p>
              </div>
              {activeModelVersion ? (
                <div style={styles.batchMetaList}>
                  <span>{activeModelVersion.model_name}</span>
                  <span>Batch {activeModelVersion.batch_id}</span>
                  <span>Base model {activeModelVersion.base_model}</span>
                  <span>{activeModelVersion.activated_at ? `Activated ${formatDateTime(activeModelVersion.activated_at)}` : 'Activation time not available'}</span>
                </div>
              ) : (
                <p style={styles.emptyPanelText}>No model version is selected for testing yet.</p>
              )}
            </section>

            {!trainingDemoMode ? (
            <section style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['training', 'artifact']) }}>
              <div style={styles.pipelinePanelHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Latest Training Result</h2>
                  <p style={styles.cardSubtitle}>
                    Surface the latest completed run first so you do not have to scan raw JSON across cards.
                  </p>
                </div>
              </div>
              {latestCompletedJob ? (
                <>
                  <div style={styles.trainingSnapshotGrid}>
                    <SummaryFact label="Latest job" value={`#${latestCompletedJob.id}`} />
                    <SummaryFact label="Batch" value={latestCompletedJob.batch_id} />
                    <SummaryFact label="Model output" value={latestCompletedVersion?.model_name ?? 'Pending version'} />
                    <SummaryFact label="Versions" value={String(totalModelVersionCount)} />
                  </div>
                  <div style={styles.metricsGrid}>
                    <MetricCard label="Accuracy" value={formatMetricValue(extractEvaluationMetric(latestCompletedJob.metrics_json, 'status_accuracy'))} />
                    <MetricCard label="Macro F1" value={formatMetricValue(extractEvaluationMetric(latestCompletedJob.metrics_json, 'macro_f1'))} />
                    <MetricCard label="Eval loss" value={formatMetricValue(extractEvaluationMetric(latestCompletedJob.metrics_json, 'eval_loss'))} />
                    <MetricCard label="Train / Val" value={`${latestCompletedJob.train_record_count ?? 0} / ${latestCompletedJob.validation_record_count ?? 0}`} />
                  </div>
                </>
              ) : (
                <div style={styles.trainingSnapshotGrid}>
                  <SummaryFact label="Batches" value={String(totalBatchCount)} />
                  <SummaryFact label="Jobs" value={String(totalJobCount)} />
                  <SummaryFact label="Versions" value={String(totalModelVersionCount)} />
                  <SummaryFact label="Ready for test" value={String(readyModelCount)} />
                </div>
              )}
            </section>
            ) : null}
          </section>

          <section ref={lineageSectionRef} style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['curation', 'training', 'artifact', 'activation']) }}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>Model Lineage</h2>
                <p style={styles.cardSubtitle}>
                  Trace each version back to the batch and training job that produced it. This is the provenance view for the current research pipeline.
                </p>
              </div>
              <span style={styles.batchBadge}>{lineageEntries.length} chains</span>
            </div>
            <div style={styles.stageContextBar}>
              <span style={styles.stageContextPill}>Stages 2-5</span>
              <p style={styles.stageContextText}>
                This view connects the curated dataset, the training attempt, the resulting model version, and the currently active selection.
              </p>
            </div>
            {lineageEntries.length > 0 ? (
              <div style={styles.lineageGrid}>
                {lineageEntries.map((entry) => (
                  <article
                    key={`lineage-${entry.version.id}`}
                    style={{
                      ...styles.lineageCard,
                      ...(entry.active ? styles.lineageCardActive : null),
                    }}
                  >
                    <div style={styles.lineageHeader}>
                      <div>
                        <span style={styles.lineageEyebrow}>{entry.active ? 'Active lineage' : 'Version lineage'}</span>
                        <h3 style={styles.lineageTitle}>{entry.version.model_name}</h3>
                      </div>
                      <span style={entry.active ? styles.batchReadyPill : styles.batchUsedPill}>
                        {entry.active ? 'Active test model' : displayModelVersionStatus(entry.version.status)}
                      </span>
                    </div>
                    <div style={styles.lineageChain}>
                      <div style={styles.lineageNode}>
                        <span style={styles.lineageNodeLabel}>Batch</span>
                        <strong style={styles.lineageNodeValue}>{entry.batch?.batch_id ?? entry.version.batch_id}</strong>
                        <span style={styles.lineageNodeMeta}>
                          {entry.batch ? `${entry.batch.exported_count} records` : 'Batch summary unavailable'}
                        </span>
                      </div>
                      <div style={styles.lineageArrow}>→</div>
                      <div style={styles.lineageNode}>
                        <span style={styles.lineageNodeLabel}>Job</span>
                        <strong style={styles.lineageNodeValue}>{entry.job ? `#${entry.job.id}` : `#${entry.version.job_id}`}</strong>
                        <span style={styles.lineageNodeMeta}>
                          {entry.job ? displayJobStatus(entry.job.status) : 'Job summary unavailable'}
                        </span>
                      </div>
                      <div style={styles.lineageArrow}>→</div>
                      <div style={styles.lineageNode}>
                        <span style={styles.lineageNodeLabel}>Version</span>
                        <strong style={styles.lineageNodeValue}>{entry.version.model_name}</strong>
                        <span style={styles.lineageNodeMeta}>
                          {displayModelVersionStatus(entry.version.status)}
                        </span>
                      </div>
                      <div style={styles.lineageArrow}>→</div>
                      <div style={styles.lineageNode}>
                        <span style={styles.lineageNodeLabel}>Activation</span>
                        <strong style={styles.lineageNodeValue}>{entry.active ? 'Selected' : 'Standby'}</strong>
                        <span style={styles.lineageNodeMeta}>
                          {entry.version.activated_at ? formatDateTime(entry.version.activated_at) : 'Not active'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.lineageFooter}>
                      <span style={styles.lineageFootnote}>
                        {entry.job?.artifact_uri ?? entry.version.artifact_uri ?? 'No artifact URI recorded yet'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={styles.emptyStateCard}>
                <h3 style={styles.emptyStateTitle}>No lineage to show yet</h3>
                <p style={styles.emptyPanelText}>Complete at least one job so the dashboard can connect a batch, a job, and a model version.</p>
              </div>
            )}
          </section>

          <section ref={modelVersionsSectionRef} style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['artifact', 'activation']) }}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>Model Versions</h2>
                <p style={styles.cardSubtitle}>
                  Each version is a trained output. Mark one as active for testing, keep others as standby, or archive old experiments.
                </p>
              </div>
              <span style={styles.batchBadge}>{totalModelVersionCount} versions</span>
            </div>
            <div style={styles.stageContextBar}>
              <span style={styles.stageContextPill}>Stages 4-5</span>
              <p style={styles.stageContextText}>
                Completed jobs turn into version records here. This is the bridge between a finished artifact and an activatable model choice.
              </p>
            </div>
            {modelVersions.length > 0 ? (
              <div style={styles.versionCompareShell}>
                <div style={styles.versionCompareToolbar}>
                  <div style={styles.versionComparePicker}>
                    <span style={styles.versionCompareLabel}>Compare left</span>
                    <select
                      style={styles.select}
                      value={comparisonLeftVersion?.id ?? ''}
                      onChange={(event) => setComparisonLeftVersionId(event.target.value ? Number(event.target.value) : null)}
                    >
                      {modelVersions.map((version) => (
                        <option key={`left-${version.id}`} value={version.id}>
                          {version.model_name} · #{version.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.versionComparePicker}>
                    <span style={styles.versionCompareLabel}>Compare right</span>
                    <select
                      style={styles.select}
                      value={comparisonRightVersion?.id ?? ''}
                      onChange={(event) => setComparisonRightVersionId(event.target.value ? Number(event.target.value) : null)}
                    >
                      {modelVersions.map((version) => (
                        <option key={`right-${version.id}`} value={version.id}>
                          {version.model_name} · #{version.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {comparisonLeftVersion && comparisonRightVersion ? (
                  <>
                    <div style={styles.versionCompareGrid}>
                      <article style={styles.versionCompareCard}>
                        <span style={styles.versionCompareCardLabel}>Left version</span>
                        <h3 style={styles.versionCompareCardTitle}>{comparisonLeftVersion.model_name}</h3>
                        <p style={styles.versionCompareCardMeta}>
                          #{comparisonLeftVersion.id} · {displayModelVersionStatus(comparisonLeftVersion.status)} · Batch {comparisonLeftVersion.batch_id}
                        </p>
                        <div style={styles.metricsGrid}>
                          <MetricCard label="Accuracy" value={formatMetricValue(extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'status_accuracy'))} />
                          <MetricCard label="Macro F1" value={formatMetricValue(extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'macro_f1'))} />
                          <MetricCard label="Eval loss" value={formatMetricValue(extractEvaluationMetric(comparisonLeftVersion.metrics_json, 'eval_loss'))} />
                          <MetricCard label="Records" value={String(extractDatasetMetric(comparisonLeftVersion.metrics_json, 'record_count') ?? 'N/A')} />
                        </div>
                      </article>
                      <article style={styles.versionCompareCard}>
                        <span style={styles.versionCompareCardLabel}>Right version</span>
                        <h3 style={styles.versionCompareCardTitle}>{comparisonRightVersion.model_name}</h3>
                        <p style={styles.versionCompareCardMeta}>
                          #{comparisonRightVersion.id} · {displayModelVersionStatus(comparisonRightVersion.status)} · Batch {comparisonRightVersion.batch_id}
                        </p>
                        <div style={styles.metricsGrid}>
                          <MetricCard label="Accuracy" value={formatMetricValue(extractEvaluationMetric(comparisonRightVersion.metrics_json, 'status_accuracy'))} />
                          <MetricCard label="Macro F1" value={formatMetricValue(extractEvaluationMetric(comparisonRightVersion.metrics_json, 'macro_f1'))} />
                          <MetricCard label="Eval loss" value={formatMetricValue(extractEvaluationMetric(comparisonRightVersion.metrics_json, 'eval_loss'))} />
                          <MetricCard label="Records" value={String(extractDatasetMetric(comparisonRightVersion.metrics_json, 'record_count') ?? 'N/A')} />
                        </div>
                      </article>
                    </div>
                    <div style={styles.versionCompareSummary}>
                      <div style={styles.versionCompareDeltaGrid}>
                        <div style={styles.versionCompareDeltaCard}>
                          <span style={styles.versionCompareDeltaLabel}>Accuracy delta</span>
                          <strong style={styles.versionCompareDeltaValue}>{formatSignedMetricDelta(comparisonAccuracyDelta)}</strong>
                        </div>
                        <div style={styles.versionCompareDeltaCard}>
                          <span style={styles.versionCompareDeltaLabel}>Macro F1 delta</span>
                          <strong style={styles.versionCompareDeltaValue}>{formatSignedMetricDelta(comparisonMacroF1Delta)}</strong>
                        </div>
                        <div style={styles.versionCompareDeltaCard}>
                          <span style={styles.versionCompareDeltaLabel}>Eval loss delta</span>
                          <strong style={styles.versionCompareDeltaValue}>{formatSignedMetricDelta(comparisonEvalLossDelta, { invertMeaning: true })}</strong>
                        </div>
                        <div style={styles.versionCompareDeltaCard}>
                          <span style={styles.versionCompareDeltaLabel}>Record delta</span>
                          <strong style={styles.versionCompareDeltaValue}>{comparisonRecordsDelta == null ? 'N/A' : `${comparisonRecordsDelta > 0 ? '+' : ''}${comparisonRecordsDelta}`}</strong>
                        </div>
                      </div>
                      <div style={styles.versionCompareNarrative}>
                        <span style={styles.versionCompareNarrativeLabel}>Comparison reading</span>
                        <p style={styles.versionCompareNarrativeBody}>{comparisonSummary}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={styles.emptyPanelText}>At least two model versions are needed for comparison.</p>
                )}
              </div>
            ) : null}
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
                        <span style={version.status === 'active_test' ? styles.batchReadyPill : version.status === 'ready_for_test' ? styles.batchUsedPill : styles.miniStatusMuted}>
                          {displayModelVersionStatus(version.status)}
                        </span>
                      </div>
                      <div style={styles.batchMetaList}>
                        <span>Job {version.job_id}</span>
                        <span>Batch {version.batch_id}</span>
                        <span>Base model {version.base_model}</span>
                        <span>Created {formatDateTime(version.created_at)}</span>
                      </div>
                      <div style={styles.batchStatusRow}>
                        <span style={styles.miniStagePill}>Registered version</span>
                        {version.artifact_uri ? <span style={styles.miniStagePillSecondary}>Artifact attached</span> : <span style={styles.miniStagePillMuted}>Artifact pending</span>}
                        {version.status === 'active_test' ? <span style={styles.miniStagePillAccent}>Activation target</span> : null}
                      </div>
                      <div style={styles.compactSummaryGrid}>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Accuracy</span>
                          <strong style={styles.compactSummaryValue}>{formatMetricValue(extractEvaluationMetric(version.metrics_json, 'status_accuracy'))}</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Macro F1</span>
                          <strong style={styles.compactSummaryValue}>{formatMetricValue(extractEvaluationMetric(version.metrics_json, 'macro_f1'))}</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Eval loss</span>
                          <strong style={styles.compactSummaryValue}>{formatMetricValue(extractEvaluationMetric(version.metrics_json, 'eval_loss'))}</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Records</span>
                          <strong style={styles.compactSummaryValue}>{String(extractDatasetMetric(version.metrics_json, 'record_count') ?? 'N/A')}</strong>
                        </div>
                      </div>
                      <div style={styles.artifactPanel}>
                        <span style={styles.jobMetricsTitle}>Artifact Location</span>
                        <span style={styles.jobMetricsText}>{version.artifact_uri ?? 'No artifact URI yet'}</span>
                        <span style={styles.helperText}>If the run happened in Colab, this path is inside the Colab VM until you zip and download it, copy it to Drive, or upload it to another storage location.</span>
                      </div>
                      <div style={styles.batchFooter}>
                        <span style={styles.batchFooterText}>
                          {describeModelVersionStatus(version.status)}
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
                            style={styles.actionButtonMuted}
                            disabled={updatingModelVersionId === version.id || version.status === 'archived'}
                            onClick={() => void updateModelVersionStatus(version.id, 'archived')}
                          >
                            Archive
                          </button>
                        </div>
                      </div>
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
                <p style={styles.emptyPanelText}>Completed jobs will register versions here automatically.</p>
              </div>
            )}
          </section>

          {!trainingDemoMode ? (
          <section ref={jobsSectionRef} style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['training']) }}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>Distillation Jobs</h2>
                <p style={styles.cardSubtitle}>
                  Real training attempts created from exported batches. Jobs move from queued to completed or failed, and only queued jobs can be sent to Colab.
                </p>
              </div>
              <span style={styles.batchBadge}>{totalJobCount} jobs</span>
            </div>
            <div style={styles.stageContextBar}>
              <span style={styles.stageContextPill}>Stage 3</span>
              <p style={styles.stageContextText}>
                A job is one concrete training attempt. It consumes one curated batch and may emit the artifact that later becomes a version.
              </p>
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
                        <span style={job.status === 'completed' ? styles.batchReadyPill : job.status === 'failed' ? styles.miniStatusUnsafe : job.status === 'queued' ? styles.batchUsedPill : styles.miniStatusWarning}>
                          {displayJobStatus(job.status)}
                        </span>
                      </div>
                      <div style={styles.batchMetaList}>
                        <span>Batch {job.batch_id}</span>
                        <span>Task {job.task_type}</span>
                        <span>Mode {job.dataset_mode}</span>
                        <span>Created {formatDateTime(job.created_at)}</span>
                      </div>
                      <div style={styles.batchStatusRow}>
                        <span style={styles.miniStagePill}>Training attempt</span>
                        {job.artifact_uri ? <span style={styles.miniStagePillSecondary}>Artifact emitted</span> : <span style={styles.miniStagePillMuted}>No artifact yet</span>}
                        {job.status === 'queued' ? <span style={styles.miniStagePillAccent}>Ready for Colab</span> : null}
                      </div>
                      <div style={styles.compactSummaryGrid}>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Progress</span>
                          <strong style={styles.compactSummaryValue}>{job.progress_percent}%</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Train</span>
                          <strong style={styles.compactSummaryValue}>{job.train_record_count ?? 0}</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Validation</span>
                          <strong style={styles.compactSummaryValue}>{job.validation_record_count ?? 0}</strong>
                        </div>
                        <div style={styles.compactSummaryItem}>
                          <span style={styles.compactSummaryLabel}>Accuracy</span>
                          <strong style={styles.compactSummaryValue}>{formatMetricValue(extractEvaluationMetric(job.metrics_json, 'status_accuracy'))}</strong>
                        </div>
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
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            style={styles.actionButton}
                            onClick={() => void openInColab(job.id)}
                            disabled={job.status !== 'queued'}
                          >
                            {job.status === 'queued' ? 'Open in Colab' : 'Job closed'}
                          </button>
                        </div>
                      </div>
                      {job.logs_json && job.logs_json.length > 0 ? (
                        <div style={styles.jobMetricsBox}>
                          <span style={styles.jobMetricsTitle}>Worker log</span>
                          <span style={styles.jobMetricsText}>{job.logs_json[job.logs_json.length - 1]?.message}</span>
                        </div>
                      ) : null}
                      {job.artifact_uri ? (
                        <div style={styles.artifactPanel}>
                          <span style={styles.jobMetricsTitle}>Artifact</span>
                          <span style={styles.jobMetricsText}>{job.artifact_uri}</span>
                          <span style={styles.helperText}>Save this out of Colab if you want to keep or host the trained adapter later. The handoff panel includes a zip-and-download command.</span>
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
                <p style={styles.emptyPanelText}>Create a job from a ready export batch to start the training pipeline.</p>
              </div>
            )}
          </section>
          ) : null}

          {!trainingDemoMode ? (
          <section ref={batchesSectionRef} style={{ ...styles.pipelinePanel, ...stagePanelHighlight(selectedEducationStage, ['curation']) }}>
            <div style={styles.pipelinePanelHeader}>
              <div>
                <h2 style={styles.cardTitle}>Export Batches</h2>
                <p style={styles.cardSubtitle}>
                  Exported record groups are the handoff point into training. Use them to inspect dataset readiness, download the training artifact, or create a new job.
                </p>
              </div>
              <span style={styles.batchBadge}>{totalBatchCount} batches</span>
            </div>
            <div style={styles.stageContextBar}>
              <span style={styles.stageContextPill}>Stage 2</span>
              <p style={styles.stageContextText}>
                This is the curated dataset handoff. Batch quality controls the usefulness of every later job, metric, and artifact.
              </p>
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
                    (() => {
                      const quality = assessBatchQuality(batch)
                      return (
                        <article key={batch.batch_id} style={styles.batchCard}>
                          <div style={styles.batchCardTop}>
                            <div>
                              <p style={styles.factLabel}>Batch ID</p>
                              <h3 style={styles.batchCardTitle}>{batch.batch_id}</h3>
                            </div>
                            <span style={batch.ready_for_training ? styles.batchReadyPill : styles.batchUsedPill}>
                              {batch.ready_for_training ? 'Ready for training' : 'Used in training'}
                            </span>
                          </div>
                          <div style={styles.batchMetaList}>
                            <span>{batch.exported_count} records</span>
                            <span>{batch.exported_at ? `Exported ${formatDateTime(batch.exported_at)}` : 'Export time not available'}</span>
                            <span>{batch.last_used_in_training_at ? `Last trained ${formatDateTime(batch.last_used_in_training_at)}` : 'Not yet trained'}</span>
                          </div>
                          <div style={styles.batchStatusRow}>
                            <span style={styles.miniStagePill}>Curated dataset</span>
                            {batch.ready_for_training ? <span style={styles.miniStagePillSecondary}>Job can start</span> : <span style={styles.miniStagePillMuted}>Already consumed</span>}
                          </div>
                          <div style={styles.batchQualityCard}>
                            <div style={styles.batchQualityTop}>
                              <span style={styles.batchQualityLabel}>Batch quality gate</span>
                              <span style={quality.tone === 'good' ? styles.runTrustPillGood : quality.tone === 'watch' ? styles.runTrustPillWatch : styles.runTrustPillRisk}>
                                {quality.badge}
                              </span>
                            </div>
                            <p style={styles.batchQualityBody}>{quality.summary}</p>
                            <div style={styles.batchQualityReasonList}>
                              {quality.reasons.map((reason) => (
                                <span key={`${batch.batch_id}-${reason}`} style={styles.batchQualityReason}>
                                  {reason}
                                </span>
                              ))}
                            </div>
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
                                ? quality.tone === 'good'
                                  ? 'Prepared and looks like a strong candidate for a real training run.'
                                  : quality.tone === 'watch'
                                    ? 'Usable for pipeline testing, but read the warnings before treating the next metrics as strong evidence.'
                                    : 'This batch is better treated as a workflow check than a serious training candidate.'
                                : 'Kept for traceability after a training run.'}
                            </span>
                            <div style={styles.batchActions}>
                              <button
                                type="button"
                                style={styles.actionButton}
                                disabled={downloadingBatchId === batch.batch_id}
                                onClick={() => void downloadTrainingExport(batch.batch_id)}
                              >
                                {downloadingBatchId === batch.batch_id ? 'Preparing JSONL...' : 'Download JSONL'}
                              </button>
                              <button
                                type="button"
                                style={styles.actionButton}
                                disabled={!batch.ready_for_training || creatingJobBatchId === batch.batch_id}
                                onClick={() => void createDistillationJob(batch.batch_id)}
                              >
                                {creatingJobBatchId === batch.batch_id ? 'Creating job...' : quality.tone === 'risk' ? 'Train anyway' : 'Start distillation'}
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })()
                  ))}
                </div>
                {colabJob ? (
                  <div style={styles.colabPanel}>
                    <div style={styles.pipelinePanelHeader}>
                      <div>
                        <h3 style={styles.cardTitle}>Colab Training Handoff</h3>
                        <p style={styles.cardSubtitle}>
                          Use this when training is manual. Open a fresh Colab notebook from a queued job, paste the copied command, and let Colab report completion back to the server.
                        </p>
                      </div>
                      <span style={styles.batchBadge}>Job #{colabJob.id}</span>
                    </div>
                    <div style={styles.colabMetaRow}>
                      <span style={styles.miniStatusMuted}>Batch {colabJob.batch_id}</span>
                      <span style={styles.miniStatusMuted}>Train {colabJob.train_record_count ?? 0}</span>
                      <span style={styles.miniStatusMuted}>Validation {colabJob.validation_record_count ?? 0}</span>
                      <span style={colabJob.status === 'completed' ? styles.batchUsedPill : colabJob.status === 'queued' ? styles.batchReadyPill : styles.miniStatusWarning}>{colabJob.status}</span>
                    </div>
                    <div style={styles.colabSteps}>
                      <span>Open a GPU-backed Colab notebook, then run these cells in order.</span>
                    </div>
                    <div style={styles.colabStepCard}>
                      <div style={styles.colabStepHeader}>
                        <span style={styles.colabStepLabel}>Step 1. Clone the server repo</span>
                        <button type="button" style={styles.stepCopyButton} onClick={() => void copyColabStep('clone', colabCloneCommand)}>
                          {copiedColabStep === 'clone' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={styles.colabCodeBlock}>{colabCloneCommand}</pre>
                    </div>
                    <div style={styles.colabStepCard}>
                      <div style={styles.colabStepHeader}>
                        <span style={styles.colabStepLabel}>Step 2. Install training dependencies</span>
                        <button type="button" style={styles.stepCopyButton} onClick={() => void copyColabStep('install', colabInstallCommand)}>
                          {copiedColabStep === 'install' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={styles.colabCodeBlock}>{colabInstallCommand}</pre>
                    </div>
                    <div style={styles.colabStepCard}>
                      <div style={styles.colabStepHeader}>
                        <span style={styles.colabStepLabel}>Step 3. Log in to Hugging Face in the notebook</span>
                        <button type="button" style={styles.stepCopyButton} onClick={() => void copyColabStep('hf-login', colabHfLoginCommand)}>
                          {copiedColabStep === 'hf-login' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={styles.colabCodeBlock}>{colabHfLoginCommand}</pre>
                    </div>
                    <div style={styles.colabStepCard}>
                      <div style={styles.colabStepHeader}>
                        <span style={styles.colabStepLabel}>Step 4. Run this job in Colab and upload the finished adapter to Hugging Face</span>
                        <button type="button" style={styles.stepCopyButton} onClick={() => void copyColabStep('run', `!${colabCommand}`)}>
                          {copiedColabStep === 'run' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={styles.colabCodeBlock}>{`!${colabCommand}`}</pre>
                    </div>
                    <div style={styles.colabStepCard}>
                      <div style={styles.colabStepHeader}>
                        <span style={styles.colabStepLabel}>Step 5. Zip and download the artifact to your machine</span>
                        <button type="button" style={styles.stepCopyButton} onClick={() => void copyColabStep('download', artifactDownloadCommand)}>
                          {copiedColabStep === 'download' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={styles.colabCodeBlock}>{artifactDownloadCommand}</pre>
                    </div>
                    <div style={styles.batchActions}>
                      <button type="button" style={styles.actionButton} onClick={() => void copyColabCommand()} disabled={copyingColabCommand}>
                        {copyingColabCommand ? 'Copying...' : colabCommandCopied ? 'Copied' : 'Copy command'}
                      </button>
                      <button type="button" style={styles.actionButton} onClick={() => void openInColab(colabJob.id)} disabled={colabJob.status !== 'queued'}>
                        {colabJob.status === 'queued' ? 'Open Colab' : 'Job already started'}
                      </button>
                      <button type="button" style={styles.actionButton} onClick={() => void downloadTrainingExport(colabJob.batch_id)} disabled={downloadingBatchId === colabJob.batch_id}>
                        {downloadingBatchId === colabJob.batch_id ? 'Preparing JSONL...' : 'Download JSONL'}
                      </button>
                    </div>
                  </div>
                ) : null}
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
          ) : null}
        </>
      ) : null}

      {activeWorkspace === 'curation' ? (
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
      ) : null}

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

function WorkspaceTabButton({
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
      role="tab"
      aria-selected={active}
      style={{
        ...styles.workspaceTab,
        ...(active ? styles.workspaceTabActive : null),
      }}
      onClick={onClick}
    >
      {label}
    </button>
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

function DistillationDiagram({
  selectedStage,
  onSelectStage,
  selectedStageOutput,
}: {
  selectedStage: 'teacher' | 'curation' | 'training' | 'artifact' | 'activation'
  onSelectStage: (stage: 'teacher' | 'curation' | 'training' | 'artifact' | 'activation') => void
  selectedStageOutput: string
}) {
  const teacherActive = selectedStage === 'teacher'
  const curationActive = selectedStage === 'curation'
  const trainingActive = selectedStage === 'training'
  const artifactActive = selectedStage === 'artifact'
  const activationActive = selectedStage === 'activation'
  const studentActive = artifactActive || activationActive

  return (
    <div style={styles.diagramShell}>
      <svg viewBox="0 0 960 460" role="img" aria-label="Interactive knowledge distillation diagram" style={styles.diagramSvg}>
        <defs>
          <linearGradient id="teacherGlow" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#f9fbff" />
            <stop offset="100%" stopColor="#eef4ff" />
          </linearGradient>
          <linearGradient id="studentGlow" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#fbfdff" />
            <stop offset="100%" stopColor="#f3f6ff" />
          </linearGradient>
          <linearGradient id="transferGlow" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#fef6e6" />
            <stop offset="100%" stopColor="#fff0cf" />
          </linearGradient>
          <linearGradient id="dataGlow" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#f3fbf5" />
            <stop offset="100%" stopColor="#e6f4ea" />
          </linearGradient>
          <marker id="diagramArrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#6c7ab9" />
          </marker>
        </defs>

        <g onClick={() => onSelectStage('teacher')} style={styles.diagramPointer}>
          <rect x="36" y="50" width="372" height="274" rx="28" fill="url(#teacherGlow)" stroke={teacherActive ? '#596fcb' : '#8da0e2'} strokeWidth={teacherActive ? 4 : 2.5} strokeDasharray="10 9" />
          <text x="222" y="30" textAnchor="middle" style={styles.diagramHeading}>Teacher</text>
          {teacherConnections.map((line, index) => (
            <line key={`teacher-line-${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={teacherActive ? '#5e6db0' : '#7d8494'} strokeWidth={teacherActive ? 2.5 : 2} opacity={teacherActive ? 0.9 : 0.7} />
          ))}
          {teacherNodes.map((node, index) => (
            <circle key={`teacher-node-${index}`} cx={node.x} cy={node.y} r={node.r} fill={node.fill} stroke={teacherActive ? '#ffffff' : '#f3f6fb'} strokeWidth="2.5" />
          ))}
          <text x="222" y="348" textAnchor="middle" style={styles.diagramCaption}>
            App scans + OpenAI teacher outputs
          </text>
        </g>

        <g onClick={() => onSelectStage('training')} style={styles.diagramPointer}>
          <text x="575" y="68" textAnchor="middle" style={styles.diagramHeading}>Transfer</text>
          <rect x="452" y="116" width="196" height="134" rx="28" fill="url(#transferGlow)" stroke={trainingActive ? '#d49d33' : '#d5bf83'} strokeWidth={trainingActive ? 4 : 2.5} strokeDasharray="10 9" />
          <line x1="408" y1="182" x2="452" y2="182" stroke="#6c7ab9" strokeWidth="5" markerEnd="url(#diagramArrow)" />
          <line x1="648" y1="182" x2="705" y2="182" stroke="#6c7ab9" strokeWidth="5" markerEnd="url(#diagramArrow)" />
          <text x="550" y="156" textAnchor="middle" style={styles.diagramSmallLabel}>Train</text>
          <rect x="520" y="138" width="60" height="92" rx="14" fill="#fffdfa" stroke={trainingActive ? '#a27416' : '#c2b281'} strokeWidth="2.5" />
          <text x="550" y="184" textAnchor="middle" transform="rotate(90 550 184)" style={styles.diagramVerticalLabel}>Signals</text>
          <text x="550" y="272" textAnchor="middle" style={styles.diagramCaption}>
            Curation + batch training
          </text>
        </g>

        <g onClick={() => onSelectStage('artifact')} style={styles.diagramPointer}>
          <rect x="714" y="50" width="214" height="238" rx="28" fill="url(#studentGlow)" stroke={studentActive ? '#687ecc' : '#9eafe5'} strokeWidth={studentActive ? 4 : 2.5} strokeDasharray="10 9" />
          <text x="823" y="30" textAnchor="middle" style={styles.diagramHeading}>Student</text>
          {studentConnections.map((line, index) => (
            <line key={`student-line-${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={studentActive ? '#6170b5' : '#7c8492'} strokeWidth={studentActive ? 2.5 : 2} opacity={studentActive ? 0.92 : 0.72} />
          ))}
          {studentNodes.map((node, index) => (
            <circle key={`student-node-${index}`} cx={node.x} cy={node.y} r={node.r} fill={node.fill} stroke={studentActive ? '#ffffff' : '#f3f6fb'} strokeWidth="2.5" />
          ))}
          <text x="823" y="312" textAnchor="middle" style={styles.diagramCaption}>
            Qwen + LoRA artifact
          </text>
        </g>

        <g onClick={() => onSelectStage('curation')} style={styles.diagramPointer}>
          <path d="M500 350 L600 350 L600 412 L500 412 Z" fill="url(#dataGlow)" stroke={curationActive ? '#2d8351' : '#9ac6aa'} strokeWidth={curationActive ? 4 : 2.5} />
          <ellipse cx="550" cy="350" rx="50" ry="12" fill="#f8fcf8" stroke={curationActive ? '#2d8351' : '#9ac6aa'} strokeWidth={curationActive ? 4 : 2.5} />
          <text x="550" y="384" textAnchor="middle" style={styles.diagramBoxLabel}>Batch</text>
          <text x="550" y="402" textAnchor="middle" style={styles.diagramBoxSubLabel}>Reviewed export set</text>
        </g>

        <g>
          <line x1="550" y1="350" x2="550" y2="308" stroke="#6f7f76" strokeWidth="3" />
          <line x1="550" y1="308" x2="222" y2="308" stroke="#6f7f76" strokeWidth="3" />
          <line x1="822" y1="308" x2="822" y2="288" stroke="#6f7f76" strokeWidth="3" />
          <line x1="550" y1="308" x2="822" y2="308" stroke="#6f7f76" strokeWidth="3" />
        </g>

        <g onClick={() => onSelectStage('activation')} style={styles.diagramPointer}>
          <rect x="720" y="350" width="206" height="58" rx="18" fill="#f5f7f8" stroke={activationActive ? '#6b7b74' : '#c7d1cd'} strokeWidth={activationActive ? 4 : 2.5} />
          <text x="823" y="374" textAnchor="middle" style={styles.diagramBoxLabel}>Active Test Model</text>
          <text x="823" y="393" textAnchor="middle" style={styles.diagramBoxSubLabel}>Selected version</text>
        </g>
      </svg>

      <div style={styles.diagramLegendRow}>
        <button type="button" style={teacherActive ? styles.diagramLegendButtonActive : styles.diagramLegendButton} onClick={() => onSelectStage('teacher')}>
          Teacher
        </button>
        <button type="button" style={curationActive ? styles.diagramLegendButtonActive : styles.diagramLegendButton} onClick={() => onSelectStage('curation')}>
          Batch
        </button>
        <button type="button" style={trainingActive ? styles.diagramLegendButtonActive : styles.diagramLegendButton} onClick={() => onSelectStage('training')}>
          Train
        </button>
        <button type="button" style={artifactActive ? styles.diagramLegendButtonActive : styles.diagramLegendButton} onClick={() => onSelectStage('artifact')}>
          Student
        </button>
        <button type="button" style={activationActive ? styles.diagramLegendButtonActive : styles.diagramLegendButton} onClick={() => onSelectStage('activation')}>
          Activation
        </button>
      </div>

      <div style={styles.diagramOutputStrip}>
        <span style={styles.diagramOutputLabel}>Current Label Wise stage output</span>
        <strong style={styles.diagramOutputValue}>{selectedStageOutput}</strong>
      </div>
    </div>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.summaryFactLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  )
}

function MetricsSummaryPanel({ metrics }: { metrics: Record<string, unknown> }) {
  return (
    <div style={styles.metricsPanel}>
      <div style={styles.metricsGrid}>
        <MetricCard label="Accuracy" value={formatMetricValue(extractEvaluationMetric(metrics, 'status_accuracy'))} />
        <MetricCard label="Macro F1" value={formatMetricValue(extractEvaluationMetric(metrics, 'macro_f1'))} />
        <MetricCard label="Eval loss" value={formatMetricValue(extractEvaluationMetric(metrics, 'eval_loss'))} />
        <MetricCard label="Records" value={String(extractDatasetMetric(metrics, 'record_count') ?? 'N/A')} />
      </div>
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

function extractEvaluationMetric(metrics: Record<string, unknown> | null, key: string): number | null {
  const evaluation = metrics && typeof metrics.evaluation === 'object' && metrics.evaluation !== null ? metrics.evaluation as Record<string, unknown> : null
  const value = evaluation?.[key]
  return typeof value === 'number' ? value : null
}

function extractDatasetMetric(metrics: Record<string, unknown> | null, key: string): number | null {
  const datasetSummary = metrics && typeof metrics.dataset_summary === 'object' && metrics.dataset_summary !== null ? metrics.dataset_summary as Record<string, unknown> : null
  const value = datasetSummary?.[key]
  return typeof value === 'number' ? value : null
}

function numericRecordMetric(value: unknown): number {
  return typeof value === 'number' ? value : 0
}

function dominantLabelShare(labelDistribution: Record<string, unknown>): number | null {
  const counts = Object.values(labelDistribution)
    .map((value) => (typeof value === 'number' ? value : 0))
    .filter((value) => value > 0)
  if (counts.length === 0) return null
  const total = counts.reduce((sum, value) => sum + value, 0)
  if (total === 0) return null
  return Math.max(...counts) / total
}

function formatSignedMetricDelta(value: number | null, options?: { invertMeaning?: boolean }): string {
  if (value == null) return 'N/A'
  const rounded = Math.round(value * 1000) / 1000
  const sign = rounded > 0 ? '+' : ''
  const suffix = options?.invertMeaning ? ' lower is better' : ' higher is better'
  return `${sign}${rounded}${suffix}`
}

function buildVersionComparisonSummary(
  left: ModelVersion | null,
  right: ModelVersion | null,
): string {
  if (!left || !right) {
    return 'Pick two model versions to compare their metrics and dataset strength.'
  }

  const leftAccuracy = extractEvaluationMetric(left.metrics_json, 'status_accuracy') ?? 0
  const rightAccuracy = extractEvaluationMetric(right.metrics_json, 'status_accuracy') ?? 0
  const leftMacroF1 = extractEvaluationMetric(left.metrics_json, 'macro_f1') ?? 0
  const rightMacroF1 = extractEvaluationMetric(right.metrics_json, 'macro_f1') ?? 0
  const leftEvalLoss = extractEvaluationMetric(left.metrics_json, 'eval_loss')
  const rightEvalLoss = extractEvaluationMetric(right.metrics_json, 'eval_loss')
  const leftRecords = extractDatasetMetric(left.metrics_json, 'record_count') ?? 0
  const rightRecords = extractDatasetMetric(right.metrics_json, 'record_count') ?? 0

  const winner =
    leftMacroF1 > rightMacroF1
      ? left.model_name
      : rightMacroF1 > leftMacroF1
        ? right.model_name
        : leftAccuracy > rightAccuracy
          ? left.model_name
          : right.model_name

  const sizeCaution =
    Math.abs(leftRecords - rightRecords) >= 15
      ? 'The two runs used noticeably different dataset sizes, so metric gains are not fully apples-to-apples.'
      : 'The dataset sizes are close enough that the comparison is reasonably fair for a dashboard reading.'

  const lossReading =
    leftEvalLoss != null && rightEvalLoss != null
      ? leftEvalLoss < rightEvalLoss
        ? `${left.model_name} also has the lower eval loss.`
        : rightEvalLoss < leftEvalLoss
          ? `${right.model_name} also has the lower eval loss.`
          : 'Their eval loss is effectively tied.'
      : 'Eval loss is missing for at least one version.'

  return `${winner} looks stronger overall in this comparison. Macro F1 matters most here because it says more about label balance than raw accuracy alone. ${sizeCaution} ${lossReading}`
}

function assessBatchQuality(batch: DistillationBatch): {
  tone: 'good' | 'watch' | 'risk'
  badge: string
  summary: string
  reasons: string[]
} {
  const reasons: string[] = []
  const total = Math.max(1, batch.exported_count)
  const dominantShare = Math.max(
    batch.safe_count,
    batch.warning_count,
    batch.unsafe_count,
    batch.cannot_assess_count,
    batch.unknown_count,
  ) / total
  const uncertainShare = (batch.cannot_assess_count + batch.unknown_count) / total

  if (batch.exported_count < 12) {
    reasons.push('very small batch')
  } else if (batch.exported_count < 30) {
    reasons.push('small batch')
  } else {
    reasons.push('usable batch size')
  }

  if (dominantShare > 0.75) {
    reasons.push('heavy label imbalance')
  } else if (dominantShare > 0.55) {
    reasons.push('moderate label imbalance')
  } else {
    reasons.push('labels are fairly balanced')
  }

  if (uncertainShare > 0.35) {
    reasons.push('many uncertain labels')
  } else if (uncertainShare > 0.15) {
    reasons.push('some uncertain labels')
  } else {
    reasons.push('few uncertain labels')
  }

  if (batch.safe_count === 0 || batch.warning_count === 0 || batch.unsafe_count === 0) {
    reasons.push('missing one main class')
  }

  const riskCount =
    (batch.exported_count < 12 ? 1 : 0) +
    (dominantShare > 0.75 ? 1 : 0) +
    (uncertainShare > 0.35 ? 1 : 0) +
    (batch.safe_count === 0 || batch.warning_count === 0 || batch.unsafe_count === 0 ? 1 : 0)
  const watchCount =
    (batch.exported_count >= 12 && batch.exported_count < 30 ? 1 : 0) +
    (dominantShare > 0.55 && dominantShare <= 0.75 ? 1 : 0) +
    (uncertainShare > 0.15 && uncertainShare <= 0.35 ? 1 : 0)

  if (riskCount >= 2) {
    return {
      tone: 'risk',
      badge: 'Needs more curation',
      summary: 'This batch is better for proving the pipeline works than for drawing strong training conclusions.',
      reasons,
    }
  }

  if (riskCount >= 1 || watchCount >= 2) {
    return {
      tone: 'watch',
      badge: 'Usable for testing',
      summary: 'This batch can support a training run, but the resulting metrics should be interpreted carefully.',
      reasons,
    }
  }

  return {
    tone: 'good',
    badge: 'Good training candidate',
    summary: 'This batch looks healthy enough for a more meaningful training attempt and metric reading.',
    reasons,
  }
}

function stagePanelHighlight(
  selectedStage: 'teacher' | 'curation' | 'training' | 'artifact' | 'activation',
  panelStages: Array<'teacher' | 'curation' | 'training' | 'artifact' | 'activation'>,
): CSSProperties {
  if (!panelStages.includes(selectedStage)) {
    return {}
  }

  if (selectedStage === 'curation') {
    return styles.pipelinePanelHighlightGreen
  }
  if (selectedStage === 'training') {
    return styles.pipelinePanelHighlightBlue
  }
  if (selectedStage === 'artifact') {
    return styles.pipelinePanelHighlightAmber
  }
  if (selectedStage === 'activation') {
    return styles.pipelinePanelHighlightSlate
  }
  return styles.pipelinePanelHighlightTeacher
}

function setupFlowAccent(accent: 'teacher' | 'curation' | 'student' | 'artifact'): CSSProperties {
  if (accent === 'teacher') {
    return {
      background: 'linear-gradient(180deg, #f5f0ff 0%, #efe6ff 100%)',
      borderColor: '#dac7fb',
    }
  }
  if (accent === 'curation') {
    return {
      background: 'linear-gradient(180deg, #eef8f1 0%, #e3f3e8 100%)',
      borderColor: '#bfd8c7',
    }
  }
  if (accent === 'student') {
    return {
      background: 'linear-gradient(180deg, #eef6ff 0%, #e0efff 100%)',
      borderColor: '#bfd6ee',
    }
  }
  return {
    background: 'linear-gradient(180deg, #fff6e9 0%, #ffefd2 100%)',
    borderColor: '#ead7ac',
  }
}

function formatMetricValue(value: number | null): string {
  if (value == null) return 'N/A'
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}

function displayModelVersionStatus(status: string): string {
  if (status === 'active_test') return 'Active test model'
  if (status === 'ready_for_test') return 'Standby'
  if (status === 'archived') return 'Archived'
  return status
}

function describeModelVersionStatus(status: string): string {
  if (status === 'active_test') return 'This is the currently selected version for testing or hosted inference.'
  if (status === 'ready_for_test') return 'This version is available, but not currently selected for testing.'
  if (status === 'archived') return 'This version is kept only for history and rollback.'
  return 'Model version status is available.'
}

function displayJobStatus(status: string): string {
  if (status === 'queued') return 'Queued'
  if (status === 'preparing_dataset') return 'Preparing dataset'
  if (status === 'training') return 'Training'
  if (status === 'evaluating') return 'Evaluating'
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  return status
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
  workspaceNav: {
    display: 'flex',
    gap: '0',
    flexWrap: 'nowrap',
    marginBottom: '24px',
    borderBottom: '1px solid #d9e5dc',
    overflowX: 'auto',
  },
  workspaceTab: {
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'transparent',
    color: '#617466',
    padding: '14px 18px 13px',
    borderRadius: 0,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    marginBottom: '-1px',
  },
  workspaceTabActive: {
    color: '#173f2d',
    borderBottomColor: '#173f2d',
    boxShadow: 'inset 0 -1px 0 #173f2d',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '20px',
    marginBottom: '20px',
  },
  trainingSnapshotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '14px',
  },
  trainingControlStrip: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  trainingEducationGrid: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 0.95fr',
    gap: '20px',
    marginBottom: '20px',
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
  pipelinePanelHighlightTeacher: {
    borderColor: '#d8c9f8',
    boxShadow: '0 18px 34px rgba(114, 82, 184, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(246, 241, 255, 0.96) 100%)',
  },
  pipelinePanelHighlightGreen: {
    borderColor: '#b8d7c3',
    boxShadow: '0 18px 34px rgba(36, 103, 62, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(239, 248, 242, 0.96) 100%)',
  },
  pipelinePanelHighlightBlue: {
    borderColor: '#c7d9f2',
    boxShadow: '0 18px 34px rgba(53, 87, 150, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(239, 244, 255, 0.96) 100%)',
  },
  pipelinePanelHighlightAmber: {
    borderColor: '#ecd8a8',
    boxShadow: '0 18px 34px rgba(151, 114, 35, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255, 248, 233, 0.97) 100%)',
  },
  pipelinePanelHighlightSlate: {
    borderColor: '#cfd8d4',
    boxShadow: '0 18px 34px rgba(83, 101, 93, 0.14)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244, 247, 246, 0.97) 100%)',
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
  stageContextBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '16px',
    background: '#f7faf8',
    border: '1px solid #e1ebe4',
  },
  stageContextPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#eaf2ff',
    color: '#355796',
    fontWeight: 800,
    fontSize: '12px',
  },
  stageContextText: {
    margin: 0,
    color: '#5d7065',
    fontSize: '13px',
    lineHeight: 1.5,
    flex: 1,
    minWidth: '220px',
  },
  modeToggleRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  modeToggleButton: {
    border: '1px solid #d4dfd6',
    background: '#ffffff',
    color: '#2e493a',
    padding: '10px 14px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
  },
  modeToggleButtonActive: {
    border: '1px solid #8ab39a',
    background: '#ecf7ef',
    color: '#1f5d38',
    padding: '10px 14px',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
  },
  modeSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  modeSummaryCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f5faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modeSummaryLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#62786b',
    fontWeight: 800,
  },
  modeSummaryBody: {
    margin: 0,
    color: '#52695d',
    fontSize: '13px',
    lineHeight: 1.6,
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
  metaphorScene: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 0.65fr) minmax(220px, 1fr)',
    gap: '18px',
    alignItems: 'center',
  },
  metaphorVesselLarge: {
    borderRadius: '34px 34px 26px 26px',
    border: '1px solid #b6d9c4',
    background: 'linear-gradient(180deg, rgba(248, 253, 249, 0.98) 0%, rgba(225, 244, 232, 0.96) 100%)',
    minHeight: '300px',
    padding: '18px 18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: 'inset 0 -30px 80px rgba(76, 187, 133, 0.14)',
  },
  metaphorVesselSmall: {
    borderRadius: '28px 28px 22px 22px',
    border: '1px solid #c7d7f2',
    background: 'linear-gradient(180deg, rgba(251, 252, 255, 0.98) 0%, rgba(236, 241, 255, 0.96) 100%)',
    minHeight: '252px',
    padding: '18px 18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: 'inset 0 -20px 60px rgba(104, 138, 226, 0.12)',
  },
  metaphorLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#62776a',
    fontWeight: 800,
  },
  metaphorTitle: {
    margin: 0,
    fontSize: '24px',
    lineHeight: 1.1,
    color: '#173c2d',
  },
  metaphorBody: {
    margin: 0,
    color: '#3f5a4b',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  metaphorLiquidStack: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingTop: '8px',
  },
  metaphorLiquidBand: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '42px',
    borderRadius: '999px',
    color: '#f6fff9',
    fontWeight: 800,
    fontSize: '13px',
    padding: '0 14px',
    boxShadow: '0 10px 20px rgba(28, 94, 61, 0.12)',
  },
  metaphorConnector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  metaphorPipe: {
    width: '16px',
    flex: 1,
    minHeight: '48px',
    borderRadius: '999px',
    background: 'linear-gradient(180deg, #d7e6dc 0%, #b8d4c3 100%)',
  },
  metaphorFilterCore: {
    width: '100%',
    borderRadius: '22px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 12px 24px rgba(32, 68, 43, 0.08)',
  },
  metaphorFilterLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#6c8072',
    fontWeight: 800,
  },
  metaphorFilterValue: {
    fontSize: '18px',
    lineHeight: 1.25,
    color: '#173c2d',
  },
  metaphorFilterText: {
    margin: 0,
    color: '#567064',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  metaphorOutputStack: {
    marginTop: 'auto',
    display: 'grid',
    gap: '10px',
  },
  metaphorOutputCard: {
    borderRadius: '16px',
    border: '1px solid #dbe4f5',
    background: '#ffffff',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaphorOutputLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#687b9e',
    fontWeight: 800,
  },
  metaphorOutputValue: {
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#234032',
  },
  metaphorLegend: {
    marginTop: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  metaphorLegendPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#fff3d9',
    color: '#8a5a0e',
    fontSize: '12px',
    fontWeight: 800,
  },
  metaphorLegendText: {
    margin: 0,
    color: '#5f7366',
    fontSize: '13px',
    lineHeight: 1.55,
    flex: 1,
    minWidth: '240px',
  },
  diagramShell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  diagramSvg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: '28px',
    background: 'radial-gradient(circle at top center, rgba(111, 130, 217, 0.06), transparent 28%), linear-gradient(180deg, #fcfdfc 0%, #f1f6f3 100%)',
    border: '1px solid #dce7dd',
  },
  diagramPointer: {
    cursor: 'pointer',
  },
  diagramHeading: {
    fontSize: '20px',
    fontWeight: 800,
    fill: '#24352d',
  },
  diagramCaption: {
    fontSize: '12px',
    fill: '#5c6e63',
    fontWeight: 700,
  },
  diagramSmallLabel: {
    fontSize: '16px',
    fill: '#536074',
    fontWeight: 800,
  },
  diagramVerticalLabel: {
    fontSize: '15px',
    fill: '#27342d',
    fontWeight: 800,
  },
  diagramBoxLabel: {
    fontSize: '18px',
    fill: '#24352d',
    fontWeight: 800,
  },
  diagramBoxSubLabel: {
    fontSize: '12px',
    fill: '#5b6d62',
    fontWeight: 700,
  },
  diagramLegendRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  diagramLegendButton: {
    border: '1px solid #d4dfd6',
    background: 'rgba(255,255,255,0.92)',
    color: '#2e493a',
    padding: '9px 13px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  diagramLegendButtonActive: {
    border: '1px solid #7ca58d',
    background: '#ecf7ef',
    color: '#24673e',
    padding: '9px 13px',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '12px',
    cursor: 'pointer',
  },
  diagramOutputStrip: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  diagramOutputLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6b8072',
    fontWeight: 800,
  },
  diagramOutputValue: {
    fontSize: '15px',
    lineHeight: 1.5,
    color: '#234032',
  },
  diagramContextGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  diagramContextCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f5faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  diagramContextLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: '#607569',
    fontWeight: 800,
  },
  diagramContextBody: {
    margin: 0,
    color: '#4f665a',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  runTrustHero: {
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f4faf6 100%)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  runTrustTitle: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.2,
    color: '#173c2d',
  },
  runTrustCopy: {
    margin: 0,
    color: '#486051',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  runTrustMeta: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  runTrustGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  runTrustCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  runTrustCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  runTrustLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#667c70',
    fontWeight: 800,
  },
  runTrustCardBody: {
    margin: 0,
    color: '#587064',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  runTrustPillGood: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#e3f6ea',
    color: '#17633d',
    fontWeight: 800,
    fontSize: '12px',
  },
  runTrustPillWatch: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#fff2db',
    color: '#8b5609',
    fontWeight: 800,
    fontSize: '12px',
  },
  runTrustPillRisk: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#ffe3e0',
    color: '#9c2f2e',
    fontWeight: 800,
    fontSize: '12px',
  },
  educationFlowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  educationFlowCard: {
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f2f8f4 100%)',
    borderRadius: '18px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '150px',
  },
  educationFlowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'center',
  },
  flowArrow: {
    fontSize: '18px',
    color: '#5f7466',
    fontWeight: 800,
  },
  educationFlowValue: {
    fontSize: '24px',
    lineHeight: 1.1,
    color: '#173c2d',
    overflowWrap: 'anywhere',
  },
  educationFlowCopy: {
    margin: 0,
    color: '#617466',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  metricExplainerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  metricExplainerCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  metricExplainerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'baseline',
  },
  metricExplainerLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6c8072',
    fontWeight: 800,
  },
  metricExplainerValue: {
    fontSize: '24px',
    lineHeight: 1,
    color: '#173c2d',
  },
  metricExplainerBody: {
    margin: 0,
    color: '#2f4a3b',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  metricExplainerHint: {
    margin: 0,
    color: '#617466',
    fontSize: '12px',
    lineHeight: 1.5,
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
  miniStagePill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#ecf7ef',
    color: '#24673e',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStagePillSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#eef3ff',
    color: '#38549a',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStagePillAccent: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#fff2db',
    color: '#8b5609',
    fontWeight: 800,
    fontSize: '12px',
  },
  miniStagePillMuted: {
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
  batchActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  batchQualityCard: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  batchQualityTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  batchQualityLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#698074',
    fontWeight: 800,
  },
  batchQualityBody: {
    margin: 0,
    color: '#51675c',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  batchQualityReasonList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  batchQualityReason: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#f3f6f4',
    color: '#54685d',
    fontWeight: 700,
    fontSize: '12px',
  },
  colabPanel: {
    marginTop: '18px',
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: '#f6fbf7',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  colabMetaRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  colabSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#516557',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  colabStepCard: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  colabStepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  colabStepLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6c8072',
    fontWeight: 800,
  },
  stepCopyButton: {
    border: '1px solid #d4e0d6',
    background: '#ffffff',
    color: '#2a4d39',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  colabCodeBlock: {
    margin: 0,
    padding: '16px',
    borderRadius: '16px',
    background: '#12261c',
    color: '#eaf6ef',
    fontSize: '12px',
    lineHeight: 1.6,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
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
  metricsPanel: {
    borderRadius: '14px',
    border: '1px solid #e1ebe4',
    background: '#f6faf7',
    padding: '12px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px',
  },
  compactSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
    gap: '8px',
  },
  compactSummaryItem: {
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid #e3ece5',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  compactSummaryLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6c8072',
    fontWeight: 800,
  },
  compactSummaryValue: {
    fontSize: '20px',
    lineHeight: 1,
    color: '#173c2d',
  },
  metricCard: {
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid #e3ece5',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metricValue: {
    fontSize: '24px',
    lineHeight: 1,
    color: '#173c2d',
  },
  artifactPanel: {
    borderRadius: '14px',
    border: '1px solid #e1ebe4',
    background: '#f6faf7',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  helperText: {
    color: '#617466',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  artifactExplainStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  artifactExplainRow: {
    display: 'grid',
    gridTemplateColumns: '120px minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'start',
  },
  artifactExplainBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#eef3ff',
    color: '#37539a',
    fontWeight: 800,
    fontSize: '12px',
  },
  artifactExplainText: {
    color: '#244032',
    fontSize: '13px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  educationStageRail: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  educationStageButton: {
    position: 'relative',
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f5faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: '178px',
  },
  educationStageButtonActive: {
    position: 'relative',
    borderRadius: '18px',
    border: '1px solid #99c4aa',
    background: 'linear-gradient(180deg, #eef8f1 0%, #e2f1e8 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: '178px',
    boxShadow: '0 10px 24px rgba(36, 103, 62, 0.12)',
  },
  educationStageEyebrow: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: '#5f7166',
    fontWeight: 800,
  },
  educationStageTitle: {
    fontSize: '17px',
    lineHeight: 1.35,
    color: '#173c2d',
  },
  educationStageSummary: {
    color: '#486051',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  educationStageArrow: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    fontSize: '20px',
    color: '#5d7165',
    fontWeight: 800,
  },
  educationDetailCard: {
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f4faf6 100%)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  educationDetailLead: {
    margin: 0,
    color: '#2d4739',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  educationDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  educationDetailBlock: {
    borderRadius: '16px',
    border: '1px solid #e0ebe3',
    background: '#ffffff',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  educationDetailLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#678070',
    fontWeight: 800,
  },
  educationDetailBody: {
    margin: 0,
    color: '#385244',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  hfFactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  hfFactCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  hfFactLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#607569',
    fontWeight: 800,
  },
  hfFactValue: {
    fontSize: '20px',
    lineHeight: 1.2,
    color: '#173c2d',
  },
  hfFactBody: {
    margin: 0,
    color: '#587064',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  implementationStateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  implementationStateCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f6faf7 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  implementationStateTitle: {
    margin: 0,
    fontSize: '17px',
    lineHeight: 1.3,
    color: '#173c2d',
  },
  implementationStateCopy: {
    margin: 0,
    color: '#607367',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  lineageGrid: {
    display: 'grid',
    gap: '14px',
  },
  lineageCard: {
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f4faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  lineageCardActive: {
    borderColor: '#98c5aa',
    boxShadow: '0 14px 28px rgba(36, 103, 62, 0.12)',
    background: 'linear-gradient(180deg, #f6fcf8 0%, #edf8f1 100%)',
  },
  lineageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  lineageEyebrow: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#667b6f',
    fontWeight: 800,
  },
  lineageTitle: {
    margin: '6px 0 0',
    fontSize: '20px',
    lineHeight: 1.25,
    color: '#173c2d',
  },
  lineageChain: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 26px minmax(0, 1fr) 26px minmax(0, 1fr) 26px minmax(0, 1fr)',
    gap: '10px',
    alignItems: 'center',
  },
  lineageNode: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '102px',
  },
  lineageNodeLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6b8074',
    fontWeight: 800,
  },
  lineageNodeValue: {
    fontSize: '16px',
    lineHeight: 1.35,
    color: '#173c2d',
  },
  lineageNodeMeta: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#5c7266',
  },
  lineageArrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#73859e',
    fontWeight: 900,
    fontSize: '22px',
  },
  lineageFooter: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '12px 14px',
  },
  lineageFootnote: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#556b60',
    wordBreak: 'break-word',
  },
  versionCompareShell: {
    marginBottom: '18px',
    borderRadius: '20px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f4faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  versionCompareToolbar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  versionComparePicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  versionCompareLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64796d',
    fontWeight: 800,
  },
  versionCompareGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
  },
  versionCompareCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  versionCompareCardLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#688073',
    fontWeight: 800,
  },
  versionCompareCardTitle: {
    margin: 0,
    fontSize: '20px',
    lineHeight: 1.25,
    color: '#173c2d',
  },
  versionCompareCardMeta: {
    margin: 0,
    color: '#607367',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  versionCompareSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  versionCompareDeltaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px',
  },
  versionCompareDeltaCard: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  versionCompareDeltaLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6a8174',
    fontWeight: 800,
  },
  versionCompareDeltaValue: {
    fontSize: '14px',
    lineHeight: 1.4,
    color: '#183d2f',
    fontWeight: 800,
  },
  versionCompareNarrative: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#ffffff',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  versionCompareNarrativeLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#698073',
    fontWeight: 800,
  },
  versionCompareNarrativeBody: {
    margin: 0,
    color: '#52695d',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  setupFlowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  setupFlowCard: {
    position: 'relative',
    border: '1px solid #dce7dd',
    borderRadius: '18px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '164px',
  },
  setupFlowEyebrow: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: '#5f7166',
    fontWeight: 800,
  },
  setupFlowTitle: {
    margin: 0,
    fontSize: '18px',
    lineHeight: 1.25,
    color: '#173c2d',
  },
  setupFlowBody: {
    margin: 0,
    color: '#344d3f',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  setupFlowArrow: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    fontSize: '20px',
    color: '#5d7165',
    fontWeight: 800,
  },
  glossaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '12px',
  },
  glossaryCard: {
    borderRadius: '16px',
    border: '1px solid #dce7dd',
    background: '#fbfdfb',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  glossaryTerm: {
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#365144',
    fontWeight: 800,
  },
  glossaryMeaning: {
    margin: 0,
    color: '#607367',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  nextStepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  nextStepCard: {
    borderRadius: '18px',
    border: '1px solid #dce7dd',
    background: 'linear-gradient(180deg, #fbfdfb 0%, #f5faf6 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  nextStepTitle: {
    margin: 0,
    fontSize: '17px',
    lineHeight: 1.3,
    color: '#173c2d',
  },
  nextStepCopy: {
    margin: 0,
    color: '#607367',
    fontSize: '13px',
    lineHeight: 1.55,
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
