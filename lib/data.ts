// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorClass      = 'Technical' | 'Functional' | 'Business'
export type Severity        = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
export type LifecycleStatus = 'open' | 'retrying' | 'dlq' | 'resolved' | 'discarded'
export type SeamName        = 'API Gateway' | 'Service Boundary' | 'Repository' | 'External Adapter' | 'AI Skill'

// Canonical Error Envelope — VLT-<CLASS>-<DOMAIN>-<NNNN>
export interface ErrorEnvelope {
  id:            string
  sno:           number
  // Identification
  errorCode:     string          // VLT-TEC-CARRIER-0001 etc.
  correlationId: string
  traceId:       string
  spanId:        string
  // Classification
  errorClass:    ErrorClass
  severity:      Severity
  status:        LifecycleStatus
  seam:          SeamName
  // Origin
  service:       string
  operation:     string
  domain:        string
  // Payload
  message:       string
  causeChain:    string[]
  // Tenancy
  tenantId:      string
  tenant:        string
  region:        string
  // Retry
  retryCount:    number
  maxRetries:    number
  nextRetryAt?:  string
  // Time
  occurredAt:    string
  resolvedAt?:   string
  ttl:           number          // hours
  // Assignment
  assignee?:     string
  assigneeInitials?: string
}

// ─── Error Events ─────────────────────────────────────────────────────────────

export const errorEvents: ErrorEnvelope[] = [
  {
    id: 'evt-001', sno: 1,
    errorCode: 'VLT-TEC-CARRIER-0001',
    correlationId: 'cid-freight-8a3f2e', traceId: 'trc-y7z8a9', spanId: 'spn-a1',
    errorClass: 'Technical', severity: 'FATAL', status: 'dlq', seam: 'External Adapter',
    service: 'ShipmentOrchestrator', operation: 'allocateCarrier', domain: 'CARRIER',
    message: 'Carrier API gateway timeout after 30 s — no ACK received from https://api.carrier-gw.com/v3/allocate',
    causeChain: ['HTTP 504 from carrier-gw.com', 'TCP connect: no response', 'circuit opened after trip 3'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC', region: 'Ras Al Khaimah, UAE',
    retryCount: 5, maxRetries: 5,
    occurredAt: '2025-07-06T03:14:22Z', ttl: 72,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
  },
  {
    id: 'evt-002', sno: 2,
    errorCode: 'VLT-FNC-RATE-0012',
    correlationId: 'cid-freight-7b9c1a', traceId: 'trc-v4w5x6', spanId: 'spn-b2',
    errorClass: 'Functional', severity: 'ERROR', status: 'retrying', seam: 'Repository',
    service: 'RateEngine', operation: 'computeSpotRate', domain: 'RATE',
    message: 'Fuel-surcharge table stale by > 24 h; spot rate cannot be calculated for SHP-20451',
    causeChain: ['table.fuel_surcharge last_updated = 2025-07-04T22:00Z', '> 86400 s freshness SLA violated'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping', region: 'Dubai, UAE',
    retryCount: 2, maxRetries: 5, nextRetryAt: '2025-07-06T10:30:00Z',
    occurredAt: '2025-07-06T04:02:11Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
  },
  {
    id: 'evt-003', sno: 3,
    errorCode: 'VLT-BUS-CUSTOMS-0007',
    correlationId: 'cid-freight-2d7a4b', traceId: 'trc-s1t2u3', spanId: 'spn-c3',
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'CustomsClearance', operation: 'submitHSDeclaration', domain: 'CUSTOMS',
    message: 'HS code 8471.30 not mapped for shipment SHP-20450; manual review required',
    causeChain: ['tariff_table v2025-Q2 missing HS 8471.30', 'fallback mapping absent'],
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics', region: 'Abu Dhabi, UAE',
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T05:47:03Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
  },
  {
    id: 'evt-004', sno: 4,
    errorCode: 'VLT-TEC-DOC-0018',
    correlationId: 'cid-freight-9e1f5c', traceId: 'trc-p7q8r9', spanId: 'spn-d4',
    errorClass: 'Technical', severity: 'ERROR', status: 'retrying', seam: 'Service Boundary',
    service: 'DocumentService', operation: 'generateBOL', domain: 'DOC',
    message: 'PDF render worker crashed — OOM at 512 MB heap limit; BOL for SHP-20452 not generated',
    causeChain: ['Worker heap: 512/512 MB', 'SIGKILL received', 'Render queue depth: 47'],
    tenantId: 'tnt-004', tenant: 'Triton Freight', region: 'Sharjah, UAE',
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T10:35:00Z',
    occurredAt: '2025-07-06T06:11:55Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
  },
  {
    id: 'evt-005', sno: 5,
    errorCode: 'VLT-FNC-EDI-0004',
    correlationId: 'cid-freight-5c3b8d', traceId: 'trc-m4n5o6', spanId: 'spn-e5',
    errorClass: 'Functional', severity: 'ERROR', status: 'open', seam: 'External Adapter',
    service: 'TrackingGateway', operation: 'pollContainerStatus', domain: 'EDI',
    message: 'DP World EDI stream returned malformed X12 856 ASN segment at position 412',
    causeChain: ['ISA16 delimiter conflict', 'X12 schema violation: GS06 missing'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC', region: 'Ras Al Khaimah, UAE',
    retryCount: 0, maxRetries: 5,
    occurredAt: '2025-07-06T06:33:42Z', ttl: 48,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
  },
  {
    id: 'evt-006', sno: 6,
    errorCode: 'VLT-BUS-INVOICE-0015',
    correlationId: 'cid-freight-1a6d9f', traceId: 'trc-q1r2s3', spanId: 'spn-f6',
    errorClass: 'Business', severity: 'INFO', status: 'resolved', seam: 'Service Boundary',
    service: 'InvoiceEngine', operation: 'applyVAT', domain: 'INVOICE',
    message: 'VAT rate lookup returned null for commodity code 2710 — defaulted to 5%',
    causeChain: ['vat_rates table: no entry for commodity 2710', 'fallback: default_vat_rate=0.05'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping', region: 'Dubai, UAE',
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-05T22:10:00Z', resolvedAt: '2025-07-05T22:10:44Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
  },
  {
    id: 'evt-007', sno: 7,
    errorCode: 'VLT-TEC-NOTIFY-0033',
    correlationId: 'cid-freight-3f4e2c', traceId: 'trc-j1k2l3', spanId: 'spn-g7',
    errorClass: 'Technical', severity: 'WARN', status: 'open', seam: 'External Adapter',
    service: 'NotificationHub', operation: 'dispatchSMSAlert', domain: 'NOTIFY',
    message: 'SMS provider Twilio returning 429 — rate limit; queue depth 1,240 messages',
    causeChain: ['HTTP 429 from api.twilio.com', 'burst limit 1000/min exceeded', 'back-off 60 s applied'],
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics', region: 'Abu Dhabi, UAE',
    retryCount: 3, maxRetries: 10, nextRetryAt: '2025-07-06T10:03:14Z',
    occurredAt: '2025-07-06T07:02:14Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
  },
  {
    id: 'evt-008', sno: 8,
    errorCode: 'VLT-FNC-PAYMENT-0009',
    correlationId: 'cid-freight-6b8a1e', traceId: 'trc-g7h8i9', spanId: 'spn-h8',
    errorClass: 'Functional', severity: 'FATAL', status: 'dlq', seam: 'API Gateway',
    service: 'PaymentGateway', operation: 'authoriseFreightCharge', domain: 'PAYMENT',
    message: 'Stripe webhook signature mismatch — event ID evt_3P9Qx2… rejected and quarantined',
    causeChain: ['HMAC-SHA256 verification failed', 'possible replay attack or misconfigured secret', 'event quarantined to dlq.payment.webhooks'],
    tenantId: 'tnt-004', tenant: 'Triton Freight', region: 'Sharjah, UAE',
    retryCount: 5, maxRetries: 5,
    occurredAt: '2025-07-06T07:45:30Z', ttl: 72,
    assignee: 'Ravi P', assigneeInitials: 'RP',
  },
  {
    id: 'evt-009', sno: 9,
    errorCode: 'VLT-BUS-COMPLIANCE-0021',
    correlationId: 'cid-freight-4d2c7a', traceId: 'trc-d4e5f6', spanId: 'spn-i9',
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'ComplianceChecker', operation: 'validateDangerousGoods', domain: 'COMPLIANCE',
    message: 'UN3480 lithium battery declaration missing for shipment SHP-20512',
    causeChain: ['IATA DGR manifest check failed', 'section 2.3 declaration absent', 'shipment held pending re-submission'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC', region: 'Ras Al Khaimah, UAE',
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T08:15:07Z', ttl: 48,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
  },
  {
    id: 'evt-010', sno: 10,
    errorCode: 'VLT-TEC-MLOPS-0022',
    correlationId: 'cid-freight-8e5f3b', traceId: 'trc-a1b2c3', spanId: 'spn-j10',
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'AI Skill',
    service: 'AIRatePredictor', operation: 'inferDemandSurge', domain: 'MLOPS',
    message: 'ML model artefact v2.4.1 checksum failed — sha256 mismatch; rolled back to v2.3.9',
    causeChain: ['expected sha256: a1b2c3…', 'received sha256: deadbeef…', 'rollback triggered'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping', region: 'Dubai, UAE',
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T08:52:44Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
  },
  {
    id: 'evt-011', sno: 11,
    errorCode: 'VLT-FNC-VESSEL-0008',
    correlationId: 'cid-freight-7c1d4f', traceId: 'trc-b3c4d5', spanId: 'spn-k11',
    errorClass: 'Functional', severity: 'WARN', status: 'retrying', seam: 'External Adapter',
    service: 'VesselScheduler', operation: 'syncPortCalendar', domain: 'VESSEL',
    message: 'Port of Jebel Ali API returned 503 — maintenance window until 10:00 GST',
    causeChain: ['HTTP 503 from portofjebelali.ae/api', 'retry with 5-min back-off', 'circuit half-open'],
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics', region: 'Abu Dhabi, UAE',
    retryCount: 4, maxRetries: 8, nextRetryAt: '2025-07-06T10:00:00Z',
    occurredAt: '2025-07-06T09:05:19Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
  },
  {
    id: 'evt-012', sno: 12,
    errorCode: 'VLT-BUS-SLA-0030',
    correlationId: 'cid-freight-2a9b6e', traceId: 'trc-e6f7g8', spanId: 'spn-l12',
    errorClass: 'Business', severity: 'INFO', status: 'discarded', seam: 'Service Boundary',
    service: 'SLAMonitor', operation: 'evaluateDeliveryWindow', domain: 'SLA',
    message: 'SLA breach pre-warning for consignment CNS-7741 — ETA +4 h vs contract',
    causeChain: ['vessel ETA updated to 2025-07-08T14:00Z', 'contracted window: 2025-07-08T10:00Z'],
    tenantId: 'tnt-004', tenant: 'Triton Freight', region: 'Sharjah, UAE',
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-05T18:30:00Z', resolvedAt: '2025-07-05T18:30:10Z', ttl: 24,
    assignee: 'Ravi P', assigneeInitials: 'RP',
  },
  {
    id: 'evt-013', sno: 13,
    errorCode: 'VLT-TEC-CARRIER-0002',
    correlationId: 'cid-freight-9f3a1c', traceId: 'trc-h9i0j1', spanId: 'spn-m13',
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'External Adapter',
    service: 'ShipmentOrchestrator', operation: 'confirmBooking', domain: 'CARRIER',
    message: 'Carrier confirmation webhook missing after 15 min — booking SHP-20453 in limbo',
    causeChain: ['webhook_timeout: 900 s', 'no event received on queue booking.confirm.inbound'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping', region: 'Dubai, UAE',
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T09:30:00Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
  },
  {
    id: 'evt-014', sno: 14,
    errorCode: 'VLT-BUS-CUSTOMS-0008',
    correlationId: 'cid-freight-4c2b1a', traceId: 'trc-k2l3m4', spanId: 'spn-n14',
    errorClass: 'Business', severity: 'ERROR', status: 'open', seam: 'Service Boundary',
    service: 'CustomsClearance', operation: 'validateImportPermit', domain: 'CUSTOMS',
    message: 'Import permit IP-55312 expired 2025-06-30 — shipment SHP-20460 blocked at port',
    causeChain: ['permit.expiry < now()', 'clearance blocked', 'manual renewal required'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC', region: 'Ras Al Khaimah, UAE',
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:55:00Z', ttl: 24,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
  },
  {
    id: 'evt-015', sno: 15,
    errorCode: 'VLT-TEC-NOTIFY-0034',
    correlationId: 'cid-freight-5d3c2b', traceId: 'trc-n5o6p7', spanId: 'spn-o15',
    errorClass: 'Technical', severity: 'INFO', status: 'resolved', seam: 'External Adapter',
    service: 'NotificationHub', operation: 'dispatchEmailAlert', domain: 'NOTIFY',
    message: 'SendGrid API latency spike — email batch delayed by 12 s; all messages delivered',
    causeChain: ['HTTP 200 after 12 403 ms', 'within SLA tolerance of 30 s'],
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics', region: 'Abu Dhabi, UAE',
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:00:00Z', resolvedAt: '2025-07-06T09:00:14Z', ttl: 12,
    assignee: 'Meera S', assigneeInitials: 'MS',
  },
]

// ─── Error Code Registry ──────────────────────────────────────────────────────

export interface ErrorCodeEntry {
  id:             string
  code:           string
  errorClass:     ErrorClass
  severity:       Severity
  domain:         string
  title:          string
  description:    string
  retryable:      boolean
  maxRetries:     number
  circuitBreaker: boolean
  escalationPath: string
  owner:          string
  ownerInitials:  string
}

export const errorCodeRegistry: ErrorCodeEntry[] = [
  { id: 'reg-001', code: 'VLT-FNC-EDI-0004',        errorClass: 'Functional', severity: 'ERROR', domain: 'EDI',        title: 'EDI Stream Parse Failure',          description: 'Inbound EDI message failed X12 schema validation or segment parsing.', retryable: true,  maxRetries: 5,  circuitBreaker: false, escalationPath: 'Integration Team → P2 On-Call', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'reg-002', code: 'VLT-FNC-PAYMENT-0009',     errorClass: 'Functional', severity: 'FATAL', domain: 'PAYMENT',   title: 'Payment Signature Mismatch',        description: 'Webhook HMAC verification failed — possible replay attack or misconfigured secret.', retryable: false, maxRetries: 0,  circuitBreaker: true,  escalationPath: 'Security Team → P1 Immediate', owner: 'Ravi P', ownerInitials: 'RP' },
  { id: 'reg-003', code: 'VLT-BUS-CUSTOMS-0007',     errorClass: 'Business',   severity: 'WARN',  domain: 'CUSTOMS',   title: 'HS Code Not Mapped',                description: 'Commodity code absent from customs tariff lookup table; shipment held.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'Customs Ops → Manual Review', owner: 'Meera S', ownerInitials: 'MS' },
  { id: 'reg-004', code: 'VLT-BUS-INVOICE-0015',     errorClass: 'Business',   severity: 'INFO',  domain: 'INVOICE',   title: 'VAT Rate Null Fallback',            description: 'VAT lookup returned null; system applied default 5% rate and continued.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'Finance Ops → Notify Only', owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'reg-005', code: 'VLT-FNC-RATE-0012',        errorClass: 'Functional', severity: 'ERROR', domain: 'RATE',      title: 'Stale Fuel Surcharge Table',        description: 'Fuel surcharge data > 24 h old; spot-rate computation blocked.', retryable: true,  maxRetries: 5,  circuitBreaker: false, escalationPath: 'Rate Ops → P2 Alert', owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'reg-006', code: 'VLT-TEC-CARRIER-0001',     errorClass: 'Technical',  severity: 'FATAL', domain: 'CARRIER',   title: 'Carrier API Gateway Timeout',       description: 'Upstream carrier gateway did not ACK within 30 s SLA; circuit opened.', retryable: true,  maxRetries: 5,  circuitBreaker: true,  escalationPath: 'Platform Ops → P1 Immediate', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'reg-007', code: 'VLT-TEC-DOC-0018',         errorClass: 'Technical',  severity: 'ERROR', domain: 'DOC',       title: 'PDF Render OOM',                    description: 'Document worker exceeded 512 MB heap generating Bill of Lading.', retryable: true,  maxRetries: 3,  circuitBreaker: false, escalationPath: 'Platform Eng → P2 On-Call', owner: 'Ravi P', ownerInitials: 'RP' },
  { id: 'reg-008', code: 'VLT-TEC-MLOPS-0022',       errorClass: 'Technical',  severity: 'ERROR', domain: 'MLOPS',     title: 'ML Model Checksum Failure',         description: 'Model artefact hash mismatch — auto-rolled back to previous stable version.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'ML Ops → P2 Alert', owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'reg-009', code: 'VLT-TEC-NOTIFY-0033',      errorClass: 'Technical',  severity: 'WARN',  domain: 'NOTIFY',    title: 'SMS Provider Rate Limit',           description: 'Twilio 429 — burst exceeded; notifications queued with exponential back-off.', retryable: true,  maxRetries: 10, circuitBreaker: false, escalationPath: 'Notification Ops → Monitor', owner: 'Meera S', ownerInitials: 'MS' },
  { id: 'reg-010', code: 'VLT-BUS-COMPLIANCE-0021',  errorClass: 'Business',   severity: 'WARN',  domain: 'COMPLIANCE',title: 'Dangerous Goods Declaration Missing',description: 'Lithium battery UN3480 declaration absent; shipment cannot proceed to customs.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'Compliance Ops → P2 Alert', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'reg-011', code: 'VLT-TEC-CARRIER-0002',     errorClass: 'Technical',  severity: 'ERROR', domain: 'CARRIER',   title: 'Carrier Booking Webhook Missing',   description: 'Booking confirmation webhook not received within 15-min SLA window.', retryable: true,  maxRetries: 3,  circuitBreaker: false, escalationPath: 'Carrier Ops → P2 Alert', owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'reg-012', code: 'VLT-BUS-CUSTOMS-0008',     errorClass: 'Business',   severity: 'ERROR', domain: 'CUSTOMS',   title: 'Expired Import Permit',             description: 'Import permit expiry date exceeded; shipment blocked at border.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'Customs Ops → P1 Immediate', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'reg-013', code: 'VLT-FNC-VESSEL-0008',      errorClass: 'Functional', severity: 'WARN',  domain: 'VESSEL',    title: 'Port API Unavailable',              description: 'Port of Jebel Ali API 503; vessel schedule sync deferred.', retryable: true,  maxRetries: 8,  circuitBreaker: true,  escalationPath: 'Vessel Ops → P3 Monitor', owner: 'Meera S', ownerInitials: 'MS' },
  { id: 'reg-014', code: 'VLT-BUS-SLA-0030',         errorClass: 'Business',   severity: 'INFO',  domain: 'SLA',       title: 'Delivery Window SLA Pre-Warning',   description: 'ETA deviation > 2 h vs contracted window; proactive alert to ops.', retryable: false, maxRetries: 0,  circuitBreaker: false, escalationPath: 'SLA Ops → Notify Only', owner: 'Ravi P', ownerInitials: 'RP' },
]

// ─── Log Entries ──────────────────────────────────────────────────────────────

export interface LogEntry {
  id:            string
  timestamp:     string
  ts?:           string   // alias used by mock logsExtended
  level:         'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  service:       string
  correlationId: string
  traceId?:      string
  message:       string
  tenant:        string
  tenantId?:     string
  category?:     string
  userId?:       string
  duration?:     number
  statusCode?:   number
}

export const logEntries: LogEntry[] = [
  { id: 'log-001', timestamp: '2025-07-06T08:52:44.123Z', level: 'FATAL', service: 'AIRatePredictor',      correlationId: 'cid-freight-8e5f3b', traceId: 'trc-a1b2c3', message: 'Model checksum failed — artefact v2.4.1 sha256 mismatch; rolling back to v2.3.9',            tenant: 'Horizon Shipping',     duration: 42 },
  { id: 'log-002', timestamp: '2025-07-06T08:52:41.000Z', level: 'ERROR', service: 'AIRatePredictor',      correlationId: 'cid-freight-8e5f3b', traceId: 'trc-a1b2c3', message: 'Artefact download from S3 completed in 2 340 ms but hash check returned FAIL',              tenant: 'Horizon Shipping',     duration: 2340 },
  { id: 'log-003', timestamp: '2025-07-06T08:52:38.000Z', level: 'INFO',  service: 'AIRatePredictor',      correlationId: 'cid-freight-8e5f3b', traceId: 'trc-a1b2c3', message: 'Scheduled model refresh triggered by cron job — downloading artefact v2.4.1',             tenant: 'Horizon Shipping' },
  { id: 'log-004', timestamp: '2025-07-06T08:15:07.448Z', level: 'WARN',  service: 'ComplianceChecker',    correlationId: 'cid-freight-4d2c7a', traceId: 'trc-d4e5f6', message: 'Dangerous goods UN3480 declaration not found in manifest for SHP-20512',                  tenant: 'Gulf Cargo LLC' },
  { id: 'log-005', timestamp: '2025-07-06T08:14:59.000Z', level: 'INFO',  service: 'ComplianceChecker',    correlationId: 'cid-freight-4d2c7a', traceId: 'trc-d4e5f6', message: 'Starting compliance validation for shipment SHP-20512 (14 line items)',                    tenant: 'Gulf Cargo LLC',       duration: 8900 },
  { id: 'log-006', timestamp: '2025-07-06T07:45:30.889Z', level: 'FATAL', service: 'PaymentGateway',       correlationId: 'cid-freight-6b8a1e', traceId: 'trc-g7h8i9', message: 'Stripe webhook HMAC-SHA256 mismatch — event evt_3P9Qx2LZ4 rejected and quarantined',      tenant: 'Triton Freight',       statusCode: 401 },
  { id: 'log-007', timestamp: '2025-07-06T07:02:14.201Z', level: 'WARN',  service: 'NotificationHub',      correlationId: 'cid-freight-3f4e2c', traceId: 'trc-j1k2l3', message: 'Twilio rate limit 429 received — 1 240 messages queued; back-off 60 s',                  tenant: 'Al Futtaim Logistics', statusCode: 429 },
  { id: 'log-008', timestamp: '2025-07-06T06:33:42.017Z', level: 'ERROR', service: 'TrackingGateway',      correlationId: 'cid-freight-5c3b8d', traceId: 'trc-m4n5o6', message: 'DP World EDI X12 856 segment ISA16 delimiter conflict at position 412',                  tenant: 'Gulf Cargo LLC' },
  { id: 'log-009', timestamp: '2025-07-06T06:11:55.330Z', level: 'ERROR', service: 'DocumentService',      correlationId: 'cid-freight-9e1f5c', traceId: 'trc-p7q8r9', message: 'PDF worker process exhausted 512 MB heap — SIGKILL received; BOL generation aborted',   tenant: 'Triton Freight',       duration: 15200 },
  { id: 'log-010', timestamp: '2025-07-06T05:47:03.654Z', level: 'WARN',  service: 'CustomsClearance',     correlationId: 'cid-freight-2d7a4b', traceId: 'trc-s1t2u3', message: 'No mapping found for HS code 8471.30 in tariff table version 2025-Q2',                   tenant: 'Al Futtaim Logistics' },
  { id: 'log-011', timestamp: '2025-07-06T04:02:11.782Z', level: 'ERROR', service: 'RateEngine',           correlationId: 'cid-freight-7b9c1a', traceId: 'trc-v4w5x6', message: 'Fuel surcharge data last updated 2025-07-04T22:00Z — exceeds 24-h freshness SLA',        tenant: 'Horizon Shipping' },
  { id: 'log-012', timestamp: '2025-07-06T03:14:22.000Z', level: 'FATAL', service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', traceId: 'trc-y7z8a9', message: 'Carrier API timed out after 30 000 ms — 5/5 retries exhausted; event moved to DLQ', tenant: 'Gulf Cargo LLC',       statusCode: 504 },
  { id: 'log-013', timestamp: '2025-07-06T09:55:00.000Z', level: 'ERROR', service: 'CustomsClearance',     correlationId: 'cid-freight-4c2b1a', traceId: 'trc-k2l3m4', message: 'Import permit IP-55312 expired 2025-06-30 — shipment SHP-20460 blocked at port',     tenant: 'Gulf Cargo LLC' },
  { id: 'log-014', timestamp: '2025-07-06T09:30:00.000Z', level: 'WARN',  service: 'ShipmentOrchestrator', correlationId: 'cid-freight-9f3a1c', traceId: 'trc-h9i0j1', message: 'Carrier confirmation webhook missing after 15 min for booking SHP-20453',              tenant: 'Horizon Shipping' },
  { id: 'log-015', timestamp: '2025-07-06T09:05:19.000Z', level: 'WARN',  service: 'VesselScheduler',      correlationId: 'cid-freight-7c1d4f', traceId: 'trc-b3c4d5', message: 'Port of Jebel Ali API returned 503 — maintenance window until 10:00 GST',             tenant: 'Al Futtaim Logistics', statusCode: 503 },
  { id: 'log-016', timestamp: '2025-07-06T09:00:14.000Z', level: 'INFO',  service: 'NotificationHub',      correlationId: 'cid-freight-5d3c2b', traceId: 'trc-n5o6p7', message: 'SendGrid email batch delivered after 12 s latency spike — all 48 messages sent',      tenant: 'Al Futtaim Logistics', duration: 12403 },
]

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export interface AlertRule {
  id:              string
  name:            string
  condition:       string
  errorClass?:     ErrorClass
  severity:        Severity
  channel:         'PagerDuty' | 'Slack' | 'Email' | 'SMS'
  status:          'active' | 'paused' | 'muted'
  triggeredCount:  number
  lastTriggered?:  string
  owner:           string
  ownerInitials:   string
}

export const alertRules: AlertRule[] = [
  { id: 'alr-001', name: 'FATAL errors — immediate page',           condition: 'severity = FATAL',                                               severity: 'FATAL', channel: 'PagerDuty', status: 'active', triggeredCount: 3, lastTriggered: '2025-07-06T08:52:44Z', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'alr-002', name: 'DLQ depth > 10',                          condition: 'dlq_count > 10',                                                 severity: 'ERROR', channel: 'PagerDuty', status: 'active', triggeredCount: 1, lastTriggered: '2025-07-06T07:45:30Z', owner: 'Ravi P', ownerInitials: 'RP' },
  { id: 'alr-003', name: 'Carrier API circuit open',                condition: 'circuit_breaker = open AND service = ShipmentOrchestrator',      severity: 'ERROR', errorClass: 'Technical',  channel: 'Slack',     status: 'active', triggeredCount: 2, lastTriggered: '2025-07-06T03:14:22Z', owner: 'Jhansi M', ownerInitials: 'JM' },
  { id: 'alr-004', name: 'Payment FATAL — security escalation',     condition: 'errorCode = VLT-FNC-PAYMENT-0009',                               severity: 'FATAL', errorClass: 'Functional', channel: 'PagerDuty', status: 'active', triggeredCount: 1, lastTriggered: '2025-07-06T07:45:30Z', owner: 'Ravi P', ownerInitials: 'RP' },
  { id: 'alr-005', name: 'Customs WARN — daily digest',             condition: 'errorClass = Business AND severity = WARN',                      severity: 'WARN',  errorClass: 'Business',   channel: 'Email',     status: 'active', triggeredCount: 7, lastTriggered: '2025-07-06T05:47:03Z', owner: 'Meera S', ownerInitials: 'MS' },
  { id: 'alr-006', name: 'SMS provider rate limit',                 condition: 'errorCode = VLT-TEC-NOTIFY-0033',                                severity: 'WARN',  errorClass: 'Technical',  channel: 'Slack',     status: 'paused', triggeredCount: 12, lastTriggered: '2025-07-06T07:02:14Z', owner: 'Meera S', ownerInitials: 'MS' },
  { id: 'alr-007', name: 'Retry budget exhausted',                  condition: 'retryCount >= maxRetries',                                       severity: 'ERROR', channel: 'Slack',     status: 'active', triggeredCount: 5, lastTriggered: '2025-07-06T06:11:55Z', owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'alr-008', name: 'ERROR > 20/min across all tenants',       condition: 'error_rate_1m > 20',                                             severity: 'ERROR', channel: 'PagerDuty', status: 'muted',  triggeredCount: 0, owner: 'Arjun K', ownerInitials: 'AK' },
  { id: 'alr-009', name: 'AI healing budget > 80%',                 condition: 'ai_healing_budget_pct > 80 AND agent = AIRatePredictor',         severity: 'WARN',  errorClass: 'Technical',  channel: 'Slack',     status: 'active', triggeredCount: 2, lastTriggered: '2025-07-06T08:52:44Z', owner: 'Arjun K', ownerInitials: 'AK' },
]

// ─── Seams ────────────────────────────────────────────────────────────────────

export interface SeamEntry {
  id:          string
  seam:        SeamName
  description: string
  eventsToday: number
  openErrors:  number
  dlqEvents:   number
  services:    string[]
  lastEvent:   string
  health:      'healthy' | 'degraded' | 'critical'
}

export const seams: SeamEntry[] = [
  {
    id: 'seam-001', seam: 'API Gateway',
    description: 'Inbound HTTP/webhook boundary — catches auth failures, signature mismatches, and oversized payloads before reaching service layer.',
    eventsToday: 3, openErrors: 1, dlqEvents: 1,
    services: ['PaymentGateway', 'WebhookRouter', 'APIGateway'],
    lastEvent: '2025-07-06T07:45:30Z', health: 'critical',
  },
  {
    id: 'seam-002', seam: 'Service Boundary',
    description: 'Inter-service call boundaries — catches domain logic failures, validation errors, and state machine violations across microservices.',
    eventsToday: 8, openErrors: 5, dlqEvents: 0,
    services: ['ShipmentOrchestrator', 'CustomsClearance', 'InvoiceEngine', 'ComplianceChecker', 'SLAMonitor'],
    lastEvent: '2025-07-06T09:55:00Z', health: 'degraded',
  },
  {
    id: 'seam-003', seam: 'Repository',
    description: 'Database and cache access boundary — catches stale data, constraint violations, and connection pool exhaustion.',
    eventsToday: 2, openErrors: 1, dlqEvents: 0,
    services: ['RateEngine', 'TariffRepository', 'CacheLayer'],
    lastEvent: '2025-07-06T04:02:11Z', health: 'degraded',
  },
  {
    id: 'seam-004', seam: 'External Adapter',
    description: 'Third-party API and EDI integration boundary — catches timeouts, malformed responses, and rate limits from external systems.',
    eventsToday: 7, openErrors: 4, dlqEvents: 1,
    services: ['CarrierGateway', 'TrackingGateway', 'NotificationHub', 'VesselScheduler'],
    lastEvent: '2025-07-06T09:30:00Z', health: 'critical',
  },
  {
    id: 'seam-005', seam: 'AI Skill',
    description: 'AI agent and ML model boundary — catches model failures, hallucination guards, healing budget exhaustion, and prompt injection attempts.',
    eventsToday: 2, openErrors: 1, dlqEvents: 0,
    services: ['AIRatePredictor', 'AIDocClassifier', 'AIComplianceAdvisor'],
    lastEvent: '2025-07-06T08:52:44Z', health: 'degraded',
  },
]

// ─── AI Agent Errors ──────────────────────────────────────────────────────────

export type HealingStrategy = 'retry' | 'rollback' | 'fallback' | 'escalate' | 'degrade'

export interface AIAgentError {
  id:              string
  agent:           string
  skill:           string
  errorCode:       string
  severity:        Severity
  status:          LifecycleStatus
  errorType:       'ModelFailure' | 'HallucinationGuard' | 'BudgetExhausted' | 'ToolCallFailed' | 'PromptInjection' | 'ContextOverflow'
  message:         string
  healingStrategy: HealingStrategy
  healingAttempts: number
  maxHealingBudget: number
  healingSucceeded: boolean
  fallbackVersion?: string
  tenant:          string
  occurredAt:      string
}

export const aiAgentErrors: AIAgentError[] = [
  {
    id: 'ai-001', agent: 'AIRatePredictor', skill: 'inferDemandSurge',
    errorCode: 'VLT-TEC-MLOPS-0022', severity: 'ERROR', status: 'open',
    errorType: 'ModelFailure',
    message: 'Model artefact v2.4.1 checksum mismatch — auto-rolled back to v2.3.9 (stable)',
    healingStrategy: 'rollback', healingAttempts: 1, maxHealingBudget: 3, healingSucceeded: true,
    fallbackVersion: 'v2.3.9',
    tenant: 'Horizon Shipping', occurredAt: '2025-07-06T08:52:44Z',
  },
  {
    id: 'ai-002', agent: 'AIDocClassifier', skill: 'classifyBillOfLading',
    errorCode: 'VLT-TEC-MLOPS-0025', severity: 'WARN', status: 'resolved',
    errorType: 'HallucinationGuard',
    message: 'Output confidence 0.41 below threshold 0.70 for BOL classification on SHP-20449 — output suppressed',
    healingStrategy: 'fallback', healingAttempts: 2, maxHealingBudget: 3, healingSucceeded: true,
    fallbackVersion: 'rules-engine-v4',
    tenant: 'Gulf Cargo LLC', occurredAt: '2025-07-06T07:30:00Z',
  },
  {
    id: 'ai-003', agent: 'AIComplianceAdvisor', skill: 'validateDGDeclaration',
    errorCode: 'VLT-TEC-MLOPS-0026', severity: 'FATAL', status: 'dlq',
    errorType: 'BudgetExhausted',
    message: 'Healing budget exhausted (3/3) — all recovery strategies failed for DG validation on SHP-20512',
    healingStrategy: 'escalate', healingAttempts: 3, maxHealingBudget: 3, healingSucceeded: false,
    tenant: 'Gulf Cargo LLC', occurredAt: '2025-07-06T08:20:00Z',
  },
  {
    id: 'ai-004', agent: 'AIRatePredictor', skill: 'computeLaneOptimisation',
    errorCode: 'VLT-TEC-MLOPS-0023', severity: 'ERROR', status: 'retrying',
    errorType: 'ToolCallFailed',
    message: 'Tool call to fuel_surcharge_api returned 503 — cannot complete lane optimisation',
    healingStrategy: 'retry', healingAttempts: 2, maxHealingBudget: 5, healingSucceeded: false,
    tenant: 'Al Futtaim Logistics', occurredAt: '2025-07-06T09:10:00Z',
  },
  {
    id: 'ai-005', agent: 'AIFreightAdvisor', skill: 'parseCustomerIntent',
    errorCode: 'VLT-TEC-MLOPS-0027', severity: 'WARN', status: 'resolved',
    errorType: 'PromptInjection',
    message: 'Prompt injection pattern detected in customer input — request sanitised and re-processed',
    healingStrategy: 'degrade', healingAttempts: 1, maxHealingBudget: 2, healingSucceeded: true,
    tenant: 'Triton Freight', occurredAt: '2025-07-06T06:45:00Z',
  },
  {
    id: 'ai-006', agent: 'AIDocClassifier', skill: 'extractPackingList',
    errorCode: 'VLT-TEC-MLOPS-0028', severity: 'ERROR', status: 'open',
    errorType: 'ContextOverflow',
    message: 'Packing list PDF exceeds 128k token context window — document chunking required',
    healingStrategy: 'fallback', healingAttempts: 1, maxHealingBudget: 3, healingSucceeded: false,
    tenant: 'Horizon Shipping', occurredAt: '2025-07-06T09:40:00Z',
  },
]

// ─── Tenants ──────────────────────────────────────────────────────────────────

export interface TenantConfig {
  id:               string
  name:             string
  region:           string
  plan:             'Starter' | 'Business' | 'Enterprise'
  errorQuota:       number
  usedQuota:        number
  active:           boolean
  contact:          string
  escalation:       string
  redactionEnabled: boolean
}

export const tenants: TenantConfig[] = [
  { id: 'tnt-001', name: 'Gulf Cargo LLC',      region: 'Ras Al Khaimah, UAE', plan: 'Enterprise', errorQuota: 500, usedQuota: 342, active: true,  contact: 'ops@gulfcargo.ae',         escalation: 'P1 → P2 → Exec', redactionEnabled: true  },
  { id: 'tnt-002', name: 'Horizon Shipping',    region: 'Dubai, UAE',          plan: 'Business',   errorQuota: 300, usedQuota: 178, active: true,  contact: 'it@horizonshipping.com',   escalation: 'P2 → P3',        redactionEnabled: true  },
  { id: 'tnt-003', name: 'Al Futtaim Logistics',region: 'Abu Dhabi, UAE',      plan: 'Enterprise', errorQuota: 500, usedQuota: 97,  active: true,  contact: 'tech@alfuttaim.ae',        escalation: 'P1 → P2',        redactionEnabled: false },
  { id: 'tnt-004', name: 'Triton Freight',      region: 'Sharjah, UAE',        plan: 'Starter',    errorQuota: 100, usedQuota: 89,  active: false, contact: 'admin@tritonfreight.com',  escalation: 'P3 only',        redactionEnabled: false },
]

// ─── Hourly trend (for dashboard sparklines) ─────────────────────────────────

export const hourlyTrend = [
  { hour: '00:00', technical: 1, functional: 0, business: 0 },
  { hour: '01:00', technical: 0, functional: 1, business: 1 },
  { hour: '02:00', technical: 2, functional: 0, business: 0 },
  { hour: '03:00', technical: 3, functional: 1, business: 0 },
  { hour: '04:00', technical: 1, functional: 2, business: 0 },
  { hour: '05:00', technical: 0, functional: 0, business: 1 },
  { hour: '06:00', technical: 2, functional: 2, business: 0 },
  { hour: '07:00', technical: 1, functional: 2, business: 0 },
  { hour: '08:00', technical: 2, functional: 0, business: 2 },
  { hour: '09:00', technical: 2, functional: 1, business: 1 },
]
