// ─── Voltus Error & Observability Console — Mock Data Module ─────────────────
// Every record shares correlationId, error_code, and tenancy keys so screens
// can cross-link: click a log line → jump to the error envelope; click a DLQ
// item → see the circuit breaker state; click a registry code → see all events.

// ─── Shared types ────────────────────────────────────────────────────────────

export type ErrorClass      = 'Technical' | 'Functional' | 'Business'
export type Severity        = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
export type LifecycleStatus = 'open' | 'retrying' | 'dlq' | 'resolved' | 'discarded'
export type SeamName        =
  | 'API Gateway'
  | 'Service Boundary'
  | 'Repository'
  | 'External Adapter'
  | 'AI Skill'
export type LogLevel        = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
export type BreakerState    = 'closed' | 'open' | 'half-open'
export type AgentStatus     = 'healing' | 'budget_exhausted' | 'recovered' | 'escalated'

// Tenancy envelope — every record carries this
export interface Tenancy {
  tenantId:    string
  tenant:      string
  accountId:   string
  workspaceId: string
  region:      string
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export interface Tenant extends Tenancy {
  plan:           'Enterprise' | 'Pro' | 'Starter'
  contactEmail:   string
  escalationEmail:string
  piiRedaction:   boolean
  monthlyQuota:   number   // error events / month
  usedQuota:      number
  openErrors:     number
  dlqErrors:      number
  slaBreachCount: number
  createdAt:      string
}

export const tenants: Tenant[] = [
  {
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
    accountId: 'acc-8a3f2e', workspaceId: 'wsp-alpha-01',
    region: 'Ras Al Khaimah, UAE', plan: 'Enterprise',
    contactEmail: 'ops@gulfcargo.ae', escalationEmail: 'cto@gulfcargo.ae',
    piiRedaction: true, monthlyQuota: 50000, usedQuota: 31420,
    openErrors: 5, dlqErrors: 2, slaBreachCount: 1, createdAt: '2023-03-15',
  },
  {
    tenantId: 'tnt-002', tenant: 'Horizon Shipping',
    accountId: 'acc-7b9c1a', workspaceId: 'wsp-beta-02',
    region: 'Dubai, UAE', plan: 'Enterprise',
    contactEmail: 'tech@horizonshipping.com', escalationEmail: 'vp-ops@horizonshipping.com',
    piiRedaction: true, monthlyQuota: 40000, usedQuota: 28900,
    openErrors: 4, dlqErrors: 1, slaBreachCount: 0, createdAt: '2023-07-01',
  },
  {
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics',
    accountId: 'acc-2d7a4b', workspaceId: 'wsp-gamma-03',
    region: 'Abu Dhabi, UAE', plan: 'Pro',
    contactEmail: 'logistics@alfuttaim.ae', escalationEmail: 'itops@alfuttaim.ae',
    piiRedaction: false, monthlyQuota: 20000, usedQuota: 17800,
    openErrors: 3, dlqErrors: 0, slaBreachCount: 2, createdAt: '2024-01-10',
  },
  {
    tenantId: 'tnt-004', tenant: 'Triton Freight',
    accountId: 'acc-4c8d2e', workspaceId: 'wsp-delta-04',
    region: 'Sharjah, UAE', plan: 'Pro',
    contactEmail: 'dev@tritonfreight.com', escalationEmail: 'ops@tritonfreight.com',
    piiRedaction: false, monthlyQuota: 15000, usedQuota: 8640,
    openErrors: 2, dlqErrors: 1, slaBreachCount: 0, createdAt: '2024-05-22',
  },
]

// Helper
const tenancy = (id: string): Tenancy => {
  const t = tenants.find(x => x.tenantId === id)!
  return {
    tenantId:    t.tenantId,
    tenant:      t.tenant,
    accountId:   t.accountId,
    workspaceId: t.workspaceId,
    region:      t.region,
  }
}

// ─── Error Envelopes ─────────────────────────────────────────────────────────
// VLT-<CLASS>-<DOMAIN>-<NNNN>

export interface ErrorEnvelope extends Tenancy {
  id:            string
  sno:           number
  errorCode:     string
  correlationId: string
  traceId:       string
  spanId:        string
  errorClass:    ErrorClass
  severity:      Severity
  status:        LifecycleStatus
  seam:          SeamName
  service:       string
  operation:     string
  domain:        string
  message:       string
  causeChain:    string[]
  retryCount:    number
  maxRetries:    number
  nextRetryAt?:  string
  occurredAt:    string
  resolvedAt?:   string
  ttl:           number
  assignee?:     string
  assigneeInitials?: string
  retryable:     boolean
  context:       Record<string, string>
}

export const errors: ErrorEnvelope[] = [
  {
    id: 'evt-001', sno: 1,
    errorCode: 'VLT-TEC-CARRIER-0001', correlationId: 'cid-freight-8a3f2e',
    traceId: 'trc-y7z8a9', spanId: 'spn-a1',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'FATAL', status: 'dlq', seam: 'External Adapter',
    service: 'ShipmentOrchestrator', operation: 'allocateCarrier', domain: 'CARRIER',
    message: 'Carrier API gateway timeout after 30 s — no ACK received from https://api.carrier-gw.com/v3/allocate',
    causeChain: ['HTTP 504 from carrier-gw.com', 'TCP connect: no response', 'circuit opened after trip 3'],
    retryCount: 5, maxRetries: 5,
    occurredAt: '2025-07-06T03:14:22Z', ttl: 72,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { shipmentId: 'SHP-20449', carrierId: 'CAR-FDX-007', route: 'RAK → DXB' },
    retryable: false,
  },
  {
    id: 'evt-002', sno: 2,
    errorCode: 'VLT-FNC-RATE-0012', correlationId: 'cid-freight-7b9c1a',
    traceId: 'trc-v4w5x6', spanId: 'spn-b2',
    ...tenancy('tnt-002'),
    errorClass: 'Functional', severity: 'ERROR', status: 'retrying', seam: 'Repository',
    service: 'RateEngine', operation: 'computeSpotRate', domain: 'RATE',
    message: 'Fuel-surcharge table stale by > 24 h; spot rate cannot be calculated for SHP-20451',
    causeChain: ['table.fuel_surcharge last_updated = 2025-07-04T22:00Z', '> 86400 s freshness SLA violated'],
    retryCount: 2, maxRetries: 5, nextRetryAt: '2025-07-06T10:30:00Z',
    occurredAt: '2025-07-06T04:02:11Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { shipmentId: 'SHP-20451', rateTableVersion: 'v2025-07-04', staleness: '26h' },
    retryable: true,
  },
  {
    id: 'evt-003', sno: 3,
    errorCode: 'VLT-BUS-CUSTOMS-0007', correlationId: 'cid-freight-2d7a4b',
    traceId: 'trc-s1t2u3', spanId: 'spn-c3',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'CustomsClearance', operation: 'submitHSDeclaration', domain: 'CUSTOMS',
    message: 'HS code 8471.30 not mapped for shipment SHP-20450; manual review required',
    causeChain: ['tariff_table v2025-Q2 missing HS 8471.30', 'fallback mapping absent'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T05:47:03Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { shipmentId: 'SHP-20450', hsCode: '8471.30', declarationType: 'import' },
    retryable: true,
  },
  {
    id: 'evt-004', sno: 4,
    errorCode: 'VLT-TEC-DOC-0018', correlationId: 'cid-freight-9e1f5c',
    traceId: 'trc-p7q8r9', spanId: 'spn-d4',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'ERROR', status: 'retrying', seam: 'Service Boundary',
    service: 'DocumentService', operation: 'generateBillOfLading', domain: 'DOC',
    message: 'PDF render service returned 503 — template engine pod OOMKilled (3/3 restarts)',
    causeChain: ['HTTP 503 from doc-render-svc:8080', 'pod OOMKilled', 'memory limit: 512Mi exceeded'],
    retryCount: 3, maxRetries: 5, nextRetryAt: '2025-07-06T10:15:00Z',
    occurredAt: '2025-07-06T06:10:45Z', ttl: 48,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { shipmentId: 'SHP-20452', template: 'BOL_STANDARD_v3', pod: 'doc-render-7b9d4-xkp2r' },
    retryable: true,
  },
  {
    id: 'evt-005', sno: 5,
    errorCode: 'VLT-FNC-PAYMENT-0005', correlationId: 'cid-freight-1a6b3c',
    traceId: 'trc-m4n5o6', spanId: 'spn-e5',
    ...tenancy('tnt-004'),
    errorClass: 'Functional', severity: 'ERROR', status: 'dlq', seam: 'External Adapter',
    service: 'PaymentGateway', operation: 'chargeFreightInvoice', domain: 'PAYMENT',
    message: 'Stripe charge declined — card_error: insufficient_funds for invoice INV-88721',
    causeChain: ['Stripe API: code=insufficient_funds', 'retry policy: non-retriable', 'moved to DLQ'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T06:55:18Z', ttl: 72,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { invoiceId: 'INV-88721', amount: 'AED 14,500', currency: 'AED' },
    retryable: false,
  },
  {
    id: 'evt-006', sno: 6,
    errorCode: 'VLT-TEC-DB-0003', correlationId: 'cid-freight-5c4d2e',
    traceId: 'trc-j1k2l3', spanId: 'spn-f6',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'FATAL', status: 'resolved', seam: 'Repository',
    service: 'FreightLedger', operation: 'persistShipmentEvent', domain: 'DB',
    message: 'PostgreSQL connection pool exhausted — all 50 connections busy > 30 s',
    causeChain: ['pg pool: active=50/50', 'queue depth: 1240 pending queries', 'timeout after 30 s'],
    retryCount: 5, maxRetries: 5,
    occurredAt: '2025-07-06T07:04:01Z', resolvedAt: '2025-07-06T07:18:33Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { database: 'freight_ledger_prod', poolSize: '50', pendingQueries: '1240' },
    retryable: true,
  },
  {
    id: 'evt-007', sno: 7,
    errorCode: 'VLT-BUS-SLA-0028', correlationId: 'cid-freight-3e7a9b',
    traceId: 'trc-g4h5i6', spanId: 'spn-g7',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'SLAMonitor', operation: 'checkDeliveryCompliance', domain: 'SLA',
    message: 'Shipment SHP-20447 ETA deviation +6 h vs SLA contract for Al Futtaim Logistics',
    causeChain: ['vessel delay: Port Jebel Ali congestion', 'ETA recalculated: +6 h', 'SLA window: T+48h'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T07:30:00Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { shipmentId: 'SHP-20447', slaTier: 'Platinum', deviationHours: '6' },
    retryable: false,
  },
  {
    id: 'evt-008', sno: 8,
    errorCode: 'VLT-TEC-AUTH-0011', correlationId: 'cid-freight-6f8a1c',
    traceId: 'trc-d7e8f9', spanId: 'spn-h8',
    ...tenancy('tnt-004'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'API Gateway',
    service: 'AuthService', operation: 'validateAPIKey', domain: 'AUTH',
    message: 'API key rotation conflict — key VLT-KEY-4521 invalidated before new key propagated',
    causeChain: ['key_rotation_lag: 15 s propagation delay', 'cache TTL: 30 s', 'stale key served'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T10:45:00Z',
    occurredAt: '2025-07-06T07:58:22Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { keyId: 'VLT-KEY-4521', service: 'freight-api-gw', rotationDelay: '15s' },
    retryable: true,
  },
  {
    id: 'evt-009', sno: 9,
    errorCode: 'VLT-BUS-COMPLIANCE-0004', correlationId: 'cid-freight-7a2c5d',
    traceId: 'trc-a1b2c3', spanId: 'spn-i9',
    ...tenancy('tnt-001'),
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'ComplianceChecker', operation: 'validateDangerousGoods', domain: 'COMPLIANCE',
    message: 'UN3480 lithium battery declaration missing for shipment SHP-20512',
    causeChain: ['IATA DGR manifest check failed', 'section 2.3 declaration absent'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T08:15:07Z', ttl: 48,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { shipmentId: 'SHP-20512', goodsType: 'UN3480', manifestSection: '2.3' },
    retryable: true,
  },
  {
    id: 'evt-010', sno: 10,
    errorCode: 'VLT-TEC-MLOPS-0022', correlationId: 'cid-freight-8e5f3b',
    traceId: 'trc-b3c4d5', spanId: 'spn-j10',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'AI Skill',
    service: 'AIRatePredictor', operation: 'inferDemandSurge', domain: 'MLOPS',
    message: 'ML model artefact v2.4.1 checksum mismatch — rolled back to v2.3.9',
    causeChain: ['expected sha256: a1b2c3…', 'received sha256: deadbeef…', 'rollback triggered'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T08:52:44Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { modelVersion: 'v2.4.1', rollbackVersion: 'v2.3.9', domain: 'demand-forecasting' },
    retryable: true,
  },
  {
    id: 'evt-011', sno: 11,
    errorCode: 'VLT-FNC-VESSEL-0008', correlationId: 'cid-freight-7c1d4f',
    traceId: 'trc-b3c4d5', spanId: 'spn-k11',
    ...tenancy('tnt-003'),
    errorClass: 'Functional', severity: 'WARN', status: 'retrying', seam: 'External Adapter',
    service: 'VesselScheduler', operation: 'syncPortCalendar', domain: 'VESSEL',
    message: 'Port of Jebel Ali API returned 503 — maintenance window until 10:00 GST',
    causeChain: ['HTTP 503 from portofjebelali.ae/api', 'circuit half-open after 4 retries'],
    retryCount: 4, maxRetries: 8, nextRetryAt: '2025-07-06T10:00:00Z',
    occurredAt: '2025-07-06T09:05:19Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { port: 'Jebel Ali', maintenanceWindow: '09:00–10:00 GST', vesselId: 'VSL-20450' },
    retryable: true,
  },
  {
    id: 'evt-012', sno: 12,
    errorCode: 'VLT-BUS-SLA-0030', correlationId: 'cid-freight-2a9b6e',
    traceId: 'trc-e6f7g8', spanId: 'spn-l12',
    ...tenancy('tnt-004'),
    errorClass: 'Business', severity: 'INFO', status: 'discarded', seam: 'Service Boundary',
    service: 'SLAMonitor', operation: 'evaluateDeliveryWindow', domain: 'SLA',
    message: 'SLA breach pre-warning for CNS-7741 — ETA +4 h vs contract',
    causeChain: ['vessel ETA updated to 2025-07-08T14:00Z', 'contracted window: 2025-07-08T10:00Z'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-05T18:30:00Z', resolvedAt: '2025-07-05T18:30:10Z', ttl: 24,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { consignmentId: 'CNS-7741', contractedETA: '2025-07-08T10:00Z', actualETA: '2025-07-08T14:00Z' },
    retryable: false,
  },
  // ── spec codes from Section 4 ────────────────────────────────────────────
  {
    id: 'evt-spec-01', sno: 13,
    errorCode: 'VLT-TEC-DB-0003', correlationId: 'cid-spec-db3',
    traceId: 'trc-db3-001', spanId: 'spn-s1',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'WARN', status: 'retrying', seam: 'Repository',
    service: 'FreightLedger', operation: 'queryShipmentIndex', domain: 'DB',
    message: 'PostgreSQL query timeout after 5 000 ms on shipment_events_idx — slow plan detected',
    causeChain: ['query_plan: SeqScan on shipment_events (18 M rows)', 'index shipment_events_idx bloated', 'autovacuum pending'],
    retryCount: 2, maxRetries: 5, nextRetryAt: '2025-07-06T09:20:00Z',
    occurredAt: '2025-07-06T09:12:04Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { table: 'shipment_events', queryMs: '5042', planType: 'SeqScan' },
    retryable: true,
  },
  {
    id: 'evt-spec-02', sno: 14,
    errorCode: 'VLT-TEC-LLM-0001', correlationId: 'cid-spec-llm1',
    traceId: 'trc-llm-001', spanId: 'spn-s2',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'WARN', status: 'retrying', seam: 'AI Skill',
    service: 'AIRatePredictor', operation: 'callOpenAICompletion', domain: 'LLM',
    message: 'LLM provider overloaded — OpenAI gpt-4o returned 429 Too Many Requests',
    causeChain: ['HTTP 429 from api.openai.com/v1/chat/completions', 'Retry-After: 45 s', 'healing attempt 2/5'],
    retryCount: 2, maxRetries: 5, nextRetryAt: '2025-07-06T09:18:45Z',
    occurredAt: '2025-07-06T09:17:00Z', ttl: 24,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { model: 'gpt-4o', retryAfter: '45s', endpoint: '/v1/chat/completions' },
    retryable: true,
  },
  {
    id: 'evt-spec-03', sno: 15,
    errorCode: 'VLT-FUN-VAL-0001', correlationId: 'cid-spec-val1',
    traceId: 'trc-val-001', spanId: 'spn-s3',
    ...tenancy('tnt-003'),
    errorClass: 'Functional', severity: 'INFO', status: 'open', seam: 'API Gateway',
    service: 'ShipmentAPI', operation: 'createShipment', domain: 'VAL',
    message: 'Required field missing: consignee.postalCode on CreateShipmentRequest',
    causeChain: ['JSON schema validation failed', 'field: consignee.postalCode required by rule SR-042'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:22:11Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { field: 'consignee.postalCode', ruleId: 'SR-042', requestId: 'req-4921' },
    retryable: false,
  },
  {
    id: 'evt-spec-04', sno: 16,
    errorCode: 'VLT-FUN-AUT-0009', correlationId: 'cid-spec-aut9',
    traceId: 'trc-aut-009', spanId: 'spn-s4',
    ...tenancy('tnt-004'),
    errorClass: 'Functional', severity: 'ERROR', status: 'dlq', seam: 'API Gateway',
    service: 'AuthService', operation: 'authorizeResourceAccess', domain: 'AUT',
    message: 'Cross-tenant resource access attempt — tenant tnt-004 tried to read shipment SHP-20449 owned by tnt-001',
    causeChain: ['resource.tenantId=tnt-001 != principal.tenantId=tnt-004', 'RBAC policy DENY cross-tenant-read'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:35:47Z', ttl: 72,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { requestedResource: 'SHP-20449', ownerTenant: 'tnt-001', callerTenant: 'tnt-004' },
    retryable: false,
  },
  {
    id: 'evt-spec-05', sno: 17,
    errorCode: 'VLT-BUS-FIN-0001', correlationId: 'cid-spec-fin1',
    traceId: 'trc-fin-001', spanId: 'spn-s5',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'CreditController', operation: 'checkCreditLimit', domain: 'FIN',
    message: 'Credit limit exceeded for Al Futtaim Logistics — outstanding AED 980,000 vs limit AED 1,000,000',
    causeChain: ['credit_balance: AED 980 K', 'limit: AED 1 000 K', 'utilisation: 98%'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:41:30Z', ttl: 48,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { outstanding: 'AED 980,000', limit: 'AED 1,000,000', utilisation: '98%' },
    retryable: false,
  },
  {
    id: 'evt-spec-06', sno: 18,
    errorCode: 'VLT-TEC-BUS-0002', correlationId: 'cid-spec-bus2',
    traceId: 'trc-bus-002', spanId: 'spn-s6',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'FATAL', status: 'dlq', seam: 'Repository',
    service: 'OutboxProcessor', operation: 'processOutboxBatch', domain: 'BUS',
    message: 'Dead outbox row evt-bus-8831 — 10 relay attempts exhausted, moved to dead-letter store',
    causeChain: ['relay attempt 10/10 failed', 'downstream topic freight.events.outbound unreachable', 'Kafka broker: LEADER_NOT_AVAILABLE'],
    retryCount: 10, maxRetries: 10,
    occurredAt: '2025-07-06T09:50:15Z', ttl: 72,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { outboxRow: 'evt-bus-8831', topic: 'freight.events.outbound', kafkaError: 'LEADER_NOT_AVAILABLE' },
    retryable: false,
  },
  // ── additional rows for pagination and full filter coverage ──────────────
  {
    id: 'evt-014', sno: 19,
    errorCode: 'VLT-TEC-CB-0005', correlationId: 'cid-freight-cb5',
    traceId: 'trc-cb5-001', spanId: 'spn-t1',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'External Adapter',
    service: 'CarrierGateway', operation: 'checkCircuitBreaker', domain: 'CB',
    message: 'Circuit breaker aramax-gw is OPEN — 12 consecutive failures in 5 min window',
    causeChain: ['failure_count: 12', 'threshold: 10', 'breaker tripped OPEN at 09:52:01Z'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:52:01Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { breaker: 'aramax-gw', failureCount: '12', threshold: '10' },
    retryable: false,
  },
  {
    id: 'evt-015', sno: 20,
    errorCode: 'VLT-FUN-INT-0003', correlationId: 'cid-freight-int3',
    traceId: 'trc-int3-001', spanId: 'spn-t2',
    ...tenancy('tnt-004'),
    errorClass: 'Functional', severity: 'WARN', status: 'retrying', seam: 'External Adapter',
    service: 'ERPConnector', operation: 'syncInvoiceToSAP', domain: 'INT',
    message: 'SAP ERP sync rejected invoice INV-88730 — duplicate document key FI-2025-0441',
    causeChain: ['SAP BAPI_ACC_DOCUMENT_POST: DUPLICATE_DOC_KEY', 'local idempotency key expired', 'retry scheduled'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T10:05:00Z',
    occurredAt: '2025-07-06T09:58:22Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { invoiceId: 'INV-88730', sapDocKey: 'FI-2025-0441', sapError: 'DUPLICATE_DOC_KEY' },
    retryable: true,
  },
  {
    id: 'evt-016', sno: 21,
    errorCode: 'VLT-TEC-GRD-0001', correlationId: 'cid-freight-grd1',
    traceId: 'trc-grd1-001', spanId: 'spn-t3',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'FATAL', status: 'dlq', seam: 'AI Skill',
    service: 'AIAgentOrchestrator', operation: 'callFreightGuardrail', domain: 'GRD',
    message: 'AI guardrail VLT-GRD-SANCTION blocked freight to sanctioned entity — agent halted',
    causeChain: ['OFAC check hit: entity match score 0.97', 'guardrail VLT-GRD-SANCTION triggered', 'agent healing budget exhausted'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:01:07Z', ttl: 72,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { entityId: 'ENT-88120', sanctionList: 'OFAC-SDN', matchScore: '0.97' },
    retryable: false,
  },
  {
    id: 'evt-017', sno: 22,
    errorCode: 'VLT-BUS-FRT-0003', correlationId: 'cid-freight-frt3',
    traceId: 'trc-frt3-001', spanId: 'spn-t4',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'WARN', status: 'resolved', seam: 'Service Boundary',
    service: 'FreightController', operation: 'assignRoute', domain: 'FRT',
    message: 'Optimal route RAK→DXB→JFK unavailable — capacity exhausted on DXB→JFK leg',
    causeChain: ['capacity: DXB→JFK full until 2025-07-08', 'alternative: DXB→AUH→JFK +6 h', 'auto-rerouted'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:10:44Z', resolvedAt: '2025-07-06T10:12:01Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { route: 'RAK→DXB→JFK', alternativeRoute: 'DXB→AUH→JFK', shipmentId: 'SHP-20460' },
    retryable: false,
  },
  {
    id: 'evt-018', sno: 23,
    errorCode: 'VLT-TEC-STA-0002', correlationId: 'cid-freight-sta2',
    traceId: 'trc-sta2-001', spanId: 'spn-t5',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'Repository',
    service: 'TrackingService', operation: 'updateShipmentState', domain: 'STA',
    message: 'Optimistic lock conflict on shipment_state for SHP-20462 — concurrent update collision',
    causeChain: ['expected_version: 14', 'actual_version: 15', 'concurrent update from TrackingWorker-3'],
    retryCount: 1, maxRetries: 3,
    occurredAt: '2025-07-06T10:18:30Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { shipmentId: 'SHP-20462', expectedVersion: '14', actualVersion: '15' },
    retryable: true,
  },
  {
    id: 'evt-019', sno: 24,
    errorCode: 'VLT-FUN-FLW-0007', correlationId: 'cid-freight-flw7',
    traceId: 'trc-flw7-001', spanId: 'spn-t6',
    ...tenancy('tnt-004'),
    errorClass: 'Functional', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'WorkflowEngine', operation: 'advanceBookingState', domain: 'FLW',
    message: 'Workflow WF-BOOKING-4512 stuck in awaiting_carrier_confirm for > 2 h',
    causeChain: ['step: carrier_confirm_received never fired', 'carrier webhook not received', 'timeout guard triggered'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T10:22:00Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { workflowId: 'WF-BOOKING-4512', stuckStep: 'awaiting_carrier_confirm', stuckDuration: '2h 3m' },
    retryable: true,
  },
  {
    id: 'evt-020', sno: 25,
    errorCode: 'VLT-TEC-LLM-0002', correlationId: 'cid-freight-llm2',
    traceId: 'trc-llm2-001', spanId: 'spn-t7',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'ERROR', status: 'retrying', seam: 'AI Skill',
    service: 'DocumentExtractor', operation: 'extractBOLFields', domain: 'LLM',
    message: 'LLM context window exceeded — BOL document 48 K tokens > 32 K limit for gpt-4o',
    causeChain: ['token_count: 48124', 'context_limit: 32768', 'chunking fallback triggered'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T10:30:00Z',
    occurredAt: '2025-07-06T10:28:10Z', ttl: 24,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { documentId: 'DOC-BOL-9921', tokenCount: '48124', contextLimit: '32768' },
    retryable: true,
  },
  {
    id: 'evt-021', sno: 26,
    errorCode: 'VLT-BUS-FIN-0004', correlationId: 'cid-freight-fin4',
    traceId: 'trc-fin4-001', spanId: 'spn-t8',
    ...tenancy('tnt-004'),
    errorClass: 'Business', severity: 'ERROR', status: 'dlq', seam: 'Service Boundary',
    service: 'InvoicingEngine', operation: 'applyTaxMatrix', domain: 'FIN',
    message: 'UAE VAT rate lookup failure — tax matrix v2025-Q2 missing row for HS 9705.90',
    causeChain: ['tax_matrix query: no row for hs_code=9705.90 in vat_rates_2025Q2', 'fallback rate absent'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:33:17Z', ttl: 72,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { hsCode: '9705.90', taxMatrix: 'vat_rates_2025Q2', invoiceId: 'INV-88735' },
    retryable: false,
  },
  {
    id: 'evt-022', sno: 27,
    errorCode: 'VLT-TEC-AUTH-0004', correlationId: 'cid-freight-auth4',
    traceId: 'trc-auth4-001', spanId: 'spn-t9',
    ...tenancy('tnt-003'),
    errorClass: 'Technical', severity: 'WARN', status: 'open', seam: 'API Gateway',
    service: 'AuthService', operation: 'refreshOAuthToken', domain: 'AUTH',
    message: 'OAuth refresh token expired for service-account freight-etl@alfuttaim — re-auth required',
    causeChain: ['refresh_token expired at 2025-07-06T10:00Z', 'token_ttl: 24h', 'last rotation: 24 h ago'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:01:00Z', ttl: 24,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { serviceAccount: 'freight-etl@alfuttaim', tokenExpiry: '2025-07-06T10:00Z', provider: 'Azure AD' },
    retryable: false,
  },
  {
    id: 'evt-023', sno: 28,
    errorCode: 'VLT-FUN-VAL-0008', correlationId: 'cid-freight-val8',
    traceId: 'trc-val8-001', spanId: 'spn-t10',
    ...tenancy('tnt-002'),
    errorClass: 'Functional', severity: 'INFO', status: 'resolved', seam: 'API Gateway',
    service: 'BookingAPI', operation: 'validateBookingRequest', domain: 'VAL',
    message: 'Booking request BKG-7812 missing shipper EORI number — required for EU import',
    causeChain: ['EU import validation rule EU-EORI-001', 'field: shipper.eoriNumber absent'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T08:45:22Z', resolvedAt: '2025-07-06T08:46:00Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { bookingId: 'BKG-7812', rule: 'EU-EORI-001', destination: 'DE' },
    retryable: false,
  },
  {
    id: 'evt-024', sno: 29,
    errorCode: 'VLT-TEC-DB-0009', correlationId: 'cid-freight-db9',
    traceId: 'trc-db9-001', spanId: 'spn-t11',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'ERROR', status: 'resolved', seam: 'Repository',
    service: 'ShipmentRepository', operation: 'bulkInsertEvents', domain: 'DB',
    message: 'Unique constraint violation on shipment_events.correlation_id — duplicate batch detected',
    causeChain: ['pg error: duplicate key value violates unique constraint', 'batch re-submitted after network blip'],
    retryCount: 1, maxRetries: 3,
    occurredAt: '2025-07-06T07:55:00Z', resolvedAt: '2025-07-06T07:55:45Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { table: 'shipment_events', constraint: 'uq_correlation_id', batchSize: '120' },
    retryable: true,
  },
  {
    id: 'evt-025', sno: 30,
    errorCode: 'VLT-BUS-CUSTOMS-0011', correlationId: 'cid-freight-cus11',
    traceId: 'trc-cus11-001', spanId: 'spn-t12',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'ERROR', status: 'open', seam: 'External Adapter',
    service: 'CustomsClearance', operation: 'submitToFedEx', domain: 'CUSTOMS',
    message: 'Customs clearance rejected by FedEx NAFL — missing certificate of origin for SHP-20478',
    causeChain: ['FedEx API: CERT_OF_ORIGIN_REQUIRED', 'document checklist gap', 'manual upload required'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T09:14:00Z', ttl: 72,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { shipmentId: 'SHP-20478', carrier: 'FedEx', errorCode: 'CERT_OF_ORIGIN_REQUIRED' },
    retryable: true,
  },
  {
    id: 'evt-026', sno: 31,
    errorCode: 'VLT-TEC-INT-0014', correlationId: 'cid-freight-int14',
    traceId: 'trc-int14-001', spanId: 'spn-t13',
    ...tenancy('tnt-004'),
    errorClass: 'Technical', severity: 'WARN', status: 'retrying', seam: 'External Adapter',
    service: 'PortalConnector', operation: 'syncTradeDocument', domain: 'INT',
    message: 'Dubai Trade portal session expired mid-upload for manifest MNF-12289',
    causeChain: ['session_token TTL: 3600 s', 'upload duration: 3610 s', 'session invalidated at 55% progress'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T10:40:00Z',
    occurredAt: '2025-07-06T09:44:20Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { manifestId: 'MNF-12289', uploadProgress: '55%', portal: 'Dubai Trade' },
    retryable: true,
  },
  {
    id: 'evt-027', sno: 32,
    errorCode: 'VLT-FUN-FLW-0012', correlationId: 'cid-freight-flw12',
    traceId: 'trc-flw12-001', spanId: 'spn-t14',
    ...tenancy('tnt-001'),
    errorClass: 'Functional', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'WorkflowEngine', operation: 'executeCompensation', domain: 'FLW',
    message: 'Saga compensation for WF-PAYMENT-7741 failed — refund step returned non-idempotent error',
    causeChain: ['compensation step refund_to_wallet failed', 'Stripe refund: already_refunded', 'saga left in inconsistent state'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T08:30:00Z', ttl: 72,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { sagaId: 'WF-PAYMENT-7741', compensationStep: 'refund_to_wallet', stripeError: 'already_refunded' },
    retryable: true,
  },
  {
    id: 'evt-028', sno: 33,
    errorCode: 'VLT-TEC-MLOPS-0031', correlationId: 'cid-freight-ml31',
    traceId: 'trc-ml31-001', spanId: 'spn-t15',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'INFO', status: 'resolved', seam: 'AI Skill',
    service: 'ModelRegistry', operation: 'promoteModelVersion', domain: 'MLOPS',
    message: 'Model promotion gate failed shadow test — accuracy 0.91 below threshold 0.93',
    causeChain: ['shadow_test accuracy: 0.91', 'threshold: 0.93', 'promotion blocked — rolled back to v2.3.9'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T06:00:00Z', resolvedAt: '2025-07-06T06:00:30Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { modelId: 'rate-predictor-v2.4.2', accuracy: '0.91', threshold: '0.93' },
    retryable: false,
  },
  {
    id: 'evt-029', sno: 34,
    errorCode: 'VLT-BUS-SLA-0034', correlationId: 'cid-freight-sla34',
    traceId: 'trc-sla34-001', spanId: 'spn-t16',
    ...tenancy('tnt-004'),
    errorClass: 'Business', severity: 'WARN', status: 'open', seam: 'Service Boundary',
    service: 'SLAMonitor', operation: 'evaluatePickupWindow', domain: 'SLA',
    message: 'Pickup SLA breached for SHP-20490 — driver arrival T+2h vs contract T+30min',
    causeChain: ['driver eta: T+2h', 'sla_contract: T+30min', 'breach delta: +1h 30min'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:45:00Z', ttl: 48,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { shipmentId: 'SHP-20490', driverETA: 'T+2h', slaContract: 'T+30min' },
    retryable: false,
  },
  {
    id: 'evt-030', sno: 35,
    errorCode: 'VLT-TEC-AUTH-0016', correlationId: 'cid-freight-auth16',
    traceId: 'trc-auth16-001', spanId: 'spn-t17',
    ...tenancy('tnt-003'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'API Gateway',
    service: 'AuthService', operation: 'verifyMFAToken', domain: 'AUTH',
    message: 'MFA TOTP token replayed — operator login from IP 185.220.101.34 blocked',
    causeChain: ['TOTP replay detected', 'token used at 10:43:12Z and 10:43:49Z', 'suspicious IP 185.220.101.34 (Tor exit)'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T10:43:50Z', ttl: 72,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { ip: '185.220.101.34', userId: 'usr-ops-771', mfaType: 'TOTP' },
    retryable: false,
  },
  {
    id: 'evt-031', sno: 36,
    errorCode: 'VLT-FUN-INT-0009', correlationId: 'cid-freight-int9',
    traceId: 'trc-int9-001', spanId: 'spn-t18',
    ...tenancy('tnt-001'),
    errorClass: 'Functional', severity: 'ERROR', status: 'retrying', seam: 'External Adapter',
    service: 'ERPConnector', operation: 'reconcileJournalEntries', domain: 'INT',
    message: 'Oracle ERP journal reconciliation failed — debit total AED 1,421,300 ≠ credit total AED 1,421,290',
    causeChain: ['debit: AED 1,421,300', 'credit: AED 1,421,290', 'delta: AED 10 (FX rounding)'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T11:00:00Z',
    occurredAt: '2025-07-06T10:50:00Z', ttl: 48,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { journalId: 'JNL-2025-4421', debitTotal: 'AED 1,421,300', creditTotal: 'AED 1,421,290' },
    retryable: true,
  },
  {
    id: 'evt-032', sno: 37,
    errorCode: 'VLT-TEC-CB-0009', correlationId: 'cid-freight-cb9',
    traceId: 'trc-cb9-001', spanId: 'spn-t19',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'WARN', status: 'open', seam: 'External Adapter',
    service: 'VesselScheduler', operation: 'pollPortAuthority', domain: 'CB',
    message: 'Circuit breaker port-jebel-ali moving to half-open — testing after 5 min cooldown',
    causeChain: ['breaker state: OPEN → HALF_OPEN', 'cooldown elapsed: 300 s', 'probe request in-flight'],
    retryCount: 0, maxRetries: 1,
    occurredAt: '2025-07-06T10:55:00Z', ttl: 24,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { breaker: 'port-jebel-ali', previousState: 'OPEN', cooldownSec: '300' },
    retryable: true,
  },
  {
    id: 'evt-033', sno: 38,
    errorCode: 'VLT-BUS-COMPLIANCE-0009', correlationId: 'cid-freight-comp9',
    traceId: 'trc-comp9-001', spanId: 'spn-t20',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'ERROR', status: 'dlq', seam: 'Service Boundary',
    service: 'ComplianceChecker', operation: 'verifyExportLicense', domain: 'COMPLIANCE',
    message: 'Export license EXL-20240788 expired 3 days ago — shipment SHP-20488 cannot be dispatched',
    causeChain: ['license expiry: 2025-07-03', 'check date: 2025-07-06', 'grace period: 0 days'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T11:00:22Z', ttl: 72,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { licenseId: 'EXL-20240788', expiry: '2025-07-03', shipmentId: 'SHP-20488' },
    retryable: false,
  },
  {
    id: 'evt-034', sno: 39,
    errorCode: 'VLT-TEC-GRD-0003', correlationId: 'cid-freight-grd3',
    traceId: 'trc-grd3-001', spanId: 'spn-t21',
    ...tenancy('tnt-004'),
    errorClass: 'Technical', severity: 'WARN', status: 'open', seam: 'AI Skill',
    service: 'AIAgentOrchestrator', operation: 'applyOutputGuardrail', domain: 'GRD',
    message: 'PII detected in LLM output — credit card number masked before logging; response returned clean',
    causeChain: ['guardrail scan: CREDIT_CARD_NUMBER pattern matched', 'PII masked: ****-****-****-1234', 'response sanitised'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T11:05:00Z', ttl: 24,
    assignee: 'Ravi P', assigneeInitials: 'RP',
    context: { guardrail: 'VLT-GRD-PII', piiType: 'CREDIT_CARD_NUMBER', sanitised: 'true' },
    retryable: false,
  },
  {
    id: 'evt-035', sno: 40,
    errorCode: 'VLT-FUN-AUT-0003', correlationId: 'cid-freight-aut3',
    traceId: 'trc-aut3-001', spanId: 'spn-t22',
    ...tenancy('tnt-001'),
    errorClass: 'Functional', severity: 'WARN', status: 'discarded', seam: 'API Gateway',
    service: 'AuthService', operation: 'checkPermissionScope', domain: 'AUT',
    message: 'Insufficient scope — token has read:shipments but route requires write:shipments',
    causeChain: ['token scopes: [read:shipments, read:rates]', 'required: write:shipments', 'HTTP 403 returned'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-05T22:15:00Z', resolvedAt: '2025-07-05T22:15:01Z', ttl: 24,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { tokenScopes: 'read:shipments,read:rates', requiredScope: 'write:shipments', route: 'PUT /shipments/:id' },
    retryable: false,
  },
  // ── original evt-013 ──────────────────────────────────────────────────────
  {
    id: 'evt-013', sno: 41,
    errorCode: 'VLT-TEC-CARRIER-0002', correlationId: 'cid-freight-9f3a1c',
    traceId: 'trc-h9i0j1', spanId: 'spn-m13',
    ...tenancy('tnt-002'),
    errorClass: 'Technical', severity: 'ERROR', status: 'open', seam: 'External Adapter',
    service: 'ShipmentOrchestrator', operation: 'confirmBooking', domain: 'CARRIER',
    message: 'Carrier confirmation webhook missing after 15 min — booking SHP-20453 in limbo',
    causeChain: ['webhook_timeout: 900 s', 'no event on queue booking.confirm.inbound'],
    retryCount: 0, maxRetries: 3,
    occurredAt: '2025-07-06T09:30:00Z', ttl: 48,
    assignee: 'Arjun K', assigneeInitials: 'AK',
    context: { shipmentId: 'SHP-20453', webhookQueue: 'booking.confirm.inbound', timeoutSec: '900' },
    retryable: true,
  },
  {
    id: 'evt-014', sno: 14,
    errorCode: 'VLT-BUS-CUSTOMS-0008', correlationId: 'cid-freight-4c2b1a',
    traceId: 'trc-k2l3m4', spanId: 'spn-n14',
    ...tenancy('tnt-003'),
    errorClass: 'Business', severity: 'ERROR', status: 'open', seam: 'Service Boundary',
    service: 'CustomsClearance', operation: 'validateImportPermit', domain: 'CUSTOMS',
    message: 'Import permit IP-55312 expired 2025-06-30 — shipment SHP-20460 blocked',
    causeChain: ['permit_expiry: 2025-06-30', 'grace_period: 0 days', 'shipment held at customs'],
    retryCount: 0, maxRetries: 0,
    occurredAt: '2025-07-06T09:45:00Z', ttl: 48,
    assignee: 'Meera S', assigneeInitials: 'MS',
    context: { permitId: 'IP-55312', shipmentId: 'SHP-20460', expiredOn: '2025-06-30' },
    retryable: false,
  },
  {
    id: 'evt-015', sno: 15,
    errorCode: 'VLT-TEC-NOTIFY-0009', correlationId: 'cid-freight-5d3e2f',
    traceId: 'trc-n5o6p7', spanId: 'spn-o15',
    ...tenancy('tnt-001'),
    errorClass: 'Technical', severity: 'WARN', status: 'retrying', seam: 'External Adapter',
    service: 'NotificationDispatcher', operation: 'sendTrackingUpdate', domain: 'NOTIFY',
    message: 'SendGrid delivery failed for tracking email — bounce: invalid domain mx record',
    causeChain: ['SMTP bounce: 550 5.1.1 invalid MX', 'recipient: logistics@mistyped.com', 'retry queued'],
    retryCount: 1, maxRetries: 3, nextRetryAt: '2025-07-06T11:00:00Z',
    occurredAt: '2025-07-06T10:02:14Z', ttl: 24,
    assignee: 'Jhansi M', assigneeInitials: 'JM',
    context: { recipient: 'logistics@mistyped.com', template: 'TRACKING_UPDATE_v2', shipmentId: 'SHP-20449' },
    retryable: true,
  },
]

// ─── Hourly trend (last 10 h) ─────────────────────────────────────────────────

export interface HourlyBucket {
  hour:       string
  technical:  number
  functional: number
  business:   number
}

export const hourlyTrend: HourlyBucket[] = [
  { hour: '01:00', technical: 2, functional: 1, business: 0 },
  { hour: '02:00', technical: 1, functional: 0, business: 1 },
  { hour: '03:00', technical: 3, functional: 2, business: 0 },
  { hour: '04:00', technical: 2, functional: 2, business: 1 },
  { hour: '05:00', technical: 1, functional: 1, business: 2 },
  { hour: '06:00', technical: 4, functional: 2, business: 1 },
  { hour: '07:00', technical: 3, functional: 1, business: 2 },
  { hour: '08:00', technical: 2, functional: 3, business: 1 },
  { hour: '09:00', technical: 3, functional: 2, business: 2 },
  { hour: '10:00', technical: 2, functional: 1, business: 1 },
]

// ─── Structured Logs ─────────────────────────────────────────────────────────

export interface LogEntry {
  id:            string
  timestamp?:    string
  ts?:           string          // alias used by logsExtended
  level:         LogLevel
  logger?:       string          // hierarchical: com.voltus.carrier.allocator
  service:       string
  correlationId: string
  traceId?:      string
  spanId?:       string
  errorCode?:    string
  message:       string
  context?:      Record<string, string>
  tenantId?:     string
  tenant?:       string
  category?:     string
}

export const logs: LogEntry[] = [
  {
    id: 'log-001', timestamp: '2025-07-06T03:14:20Z', level: 'ERROR',
    logger: 'com.voltus.carrier.allocator', service: 'ShipmentOrchestrator',
    correlationId: 'cid-freight-8a3f2e', traceId: 'trc-y7z8a9', spanId: 'spn-a1',
    errorCode: 'VLT-TEC-CARRIER-0001',
    message: 'HTTP 504 from https://api.carrier-gw.com/v3/allocate after 30000 ms',
    context: { httpStatus: '504', url: 'https://api.carrier-gw.com/v3/allocate', timeout: '30000ms' },
    tenantId: 'tnt-001',
  },
  {
    id: 'log-002', timestamp: '2025-07-06T03:14:21Z', level: 'FATAL',
    logger: 'com.voltus.carrier.circuit', service: 'ShipmentOrchestrator',
    correlationId: 'cid-freight-8a3f2e', traceId: 'trc-y7z8a9', spanId: 'spn-a1',
    errorCode: 'VLT-TEC-CARRIER-0001',
    message: 'Circuit breaker carrier-gw tripped OPEN after 3 consecutive failures',
    context: { breaker: 'carrier-gw', state: 'OPEN', failures: '3', threshold: '3' },
    tenantId: 'tnt-001',
  },
  {
    id: 'log-003', timestamp: '2025-07-06T04:02:10Z', level: 'WARN',
    logger: 'com.voltus.rate.freshness', service: 'RateEngine',
    correlationId: 'cid-freight-7b9c1a', traceId: 'trc-v4w5x6', spanId: 'spn-b2',
    errorCode: 'VLT-FNC-RATE-0012',
    message: 'fuel_surcharge table staleness 93600 s exceeds SLA of 86400 s',
    context: { table: 'fuel_surcharge', stalenessSec: '93600', slaSec: '86400' },
    tenantId: 'tnt-002',
  },
  {
    id: 'log-004', timestamp: '2025-07-06T05:47:01Z', level: 'WARN',
    logger: 'com.voltus.customs.hs', service: 'CustomsClearance',
    correlationId: 'cid-freight-2d7a4b', traceId: 'trc-s1t2u3', spanId: 'spn-c3',
    errorCode: 'VLT-BUS-CUSTOMS-0007',
    message: 'HS code lookup miss for 8471.30 in tariff_table v2025-Q2',
    context: { hsCode: '8471.30', table: 'tariff_table', version: 'v2025-Q2' },
    tenantId: 'tnt-003',
  },
  {
    id: 'log-005', timestamp: '2025-07-06T06:10:44Z', level: 'ERROR',
    logger: 'com.voltus.doc.renderer', service: 'DocumentService',
    correlationId: 'cid-freight-9e1f5c', traceId: 'trc-p7q8r9', spanId: 'spn-d4',
    errorCode: 'VLT-TEC-DOC-0018',
    message: 'PDF render pod doc-render-7b9d4-xkp2r OOMKilled — 512Mi limit exceeded',
    context: { pod: 'doc-render-7b9d4-xkp2r', memLimit: '512Mi', exitCode: 'OOMKilled' },
    tenantId: 'tnt-001',
  },
  {
    id: 'log-006', timestamp: '2025-07-06T06:55:17Z', level: 'ERROR',
    logger: 'com.voltus.payment.stripe', service: 'PaymentGateway',
    correlationId: 'cid-freight-1a6b3c', traceId: 'trc-m4n5o6', spanId: 'spn-e5',
    errorCode: 'VLT-FNC-PAYMENT-0005',
    message: 'Stripe charge declined — code=insufficient_funds invoice=INV-88721',
    context: { stripeCode: 'insufficient_funds', invoice: 'INV-88721', amount: 'AED 14500' },
    tenantId: 'tnt-004',
  },
  {
    id: 'log-007', timestamp: '2025-07-06T07:04:00Z', level: 'FATAL',
    logger: 'com.voltus.db.pool', service: 'FreightLedger',
    correlationId: 'cid-freight-5c4d2e', traceId: 'trc-j1k2l3', spanId: 'spn-f6',
    errorCode: 'VLT-TEC-DB-0003',
    message: 'pg connection pool exhausted: 50/50 active, 1240 queued',
    context: { active: '50', maxPool: '50', queued: '1240', timeout: '30000ms' },
    tenantId: 'tnt-002',
  },
  {
    id: 'log-008', timestamp: '2025-07-06T07:18:30Z', level: 'INFO',
    logger: 'com.voltus.db.pool', service: 'FreightLedger',
    correlationId: 'cid-freight-5c4d2e', traceId: 'trc-j1k2l3', spanId: 'spn-f6',
    message: 'pg connection pool recovered: connections released, queue drained',
    context: { active: '12', maxPool: '50', queued: '0' },
    tenantId: 'tnt-002',
  },
  {
    id: 'log-009', timestamp: '2025-07-06T08:52:43Z', level: 'ERROR',
    logger: 'com.voltus.mlops.artifact', service: 'AIRatePredictor',
    correlationId: 'cid-freight-8e5f3b', traceId: 'trc-b3c4d5', spanId: 'spn-j10',
    errorCode: 'VLT-TEC-MLOPS-0022',
    message: 'Model artifact checksum mismatch — expected=a1b2c3 received=deadbeef',
    context: { model: 'rate-predictor-v2.4.1', expected: 'a1b2c3', received: 'deadbeef' },
    tenantId: 'tnt-002',
  },
  {
    id: 'log-010', timestamp: '2025-07-06T09:45:01Z', level: 'DEBUG',
    logger: 'com.voltus.customs.permit', service: 'CustomsClearance',
    correlationId: 'cid-freight-4c2b1a', traceId: 'trc-k2l3m4', spanId: 'spn-n14',
    message: 'Import permit validation started for IP-55312',
    context: { permitId: 'IP-55312', shipmentId: 'SHP-20460', validating: 'expiry,scope,goods-type' },
    tenantId: 'tnt-003',
  },
  {
    id: 'log-011', timestamp: '2025-07-06T09:45:02Z', level: 'ERROR',
    logger: 'com.voltus.customs.permit', service: 'CustomsClearance',
    correlationId: 'cid-freight-4c2b1a', traceId: 'trc-k2l3m4', spanId: 'spn-n14',
    errorCode: 'VLT-BUS-CUSTOMS-0008',
    message: 'Import permit IP-55312 expired on 2025-06-30; grace period exhausted',
    context: { permitId: 'IP-55312', expiredOn: '2025-06-30', gracePeriodDays: '0' },
    tenantId: 'tnt-003',
  },
  {
    id: 'log-012', timestamp: '2025-07-06T10:02:13Z', level: 'WARN',
    logger: 'com.voltus.notify.smtp', service: 'NotificationDispatcher',
    correlationId: 'cid-freight-5d3e2f', traceId: 'trc-n5o6p7', spanId: 'spn-o15',
    errorCode: 'VLT-TEC-NOTIFY-0009',
    message: 'SendGrid SMTP 550 5.1.1 — invalid MX for logistics@mistyped.com',
    context: { smtpCode: '550 5.1.1', recipient: 'logistics@mistyped.com', retryIn: '3600s' },
    tenantId: 'tnt-001',
  },
]

// ─── DLQ Items ──────────────────────────────────────────────��─���───────────────

export interface DlqItem {
  id:             string
  errorCode:      string
  correlationId:  string
  service:        string
  operation:      string
  domain:         string
  severity:       Severity
  enqueuedAt:     string
  retryCount:     number
  maxRetries:     number
  message:        string
  reason:         string          // Why it landed in DLQ
  resolution?:    'redrive' | 'discard' | 'pending'
  resolvedBy?:    string
  resolvedAt?:    string
  auditNote?:     string
  tenantId:       string
  tenant:         string
}

export const dlqItems: DlqItem[] = [
  {
    id: 'dlq-001',
    errorCode: 'VLT-TEC-CARRIER-0001', correlationId: 'cid-freight-8a3f2e',
    service: 'ShipmentOrchestrator', operation: 'allocateCarrier', domain: 'CARRIER',
    severity: 'FATAL', enqueuedAt: '2025-07-06T03:24:22Z',
    retryCount: 5, maxRetries: 5,
    message: 'Carrier API gateway timeout after 30 s — no ACK from carrier-gw.com',
    reason: 'Max retries (5/5) exhausted with no successful response',
    resolution: 'pending', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'dlq-002',
    errorCode: 'VLT-FNC-PAYMENT-0005', correlationId: 'cid-freight-1a6b3c',
    service: 'PaymentGateway', operation: 'chargeFreightInvoice', domain: 'PAYMENT',
    severity: 'ERROR', enqueuedAt: '2025-07-06T06:55:18Z',
    retryCount: 0, maxRetries: 0,
    message: 'Stripe charge declined — insufficient_funds for INV-88721',
    reason: 'Non-retriable error class: card_error',
    resolution: 'pending', tenantId: 'tnt-004', tenant: 'Triton Freight',
  },
  {
    id: 'dlq-003',
    errorCode: 'VLT-TEC-DOC-0018', correlationId: 'cid-freight-9e1f5c',
    service: 'DocumentService', operation: 'generateBillOfLading', domain: 'DOC',
    severity: 'ERROR', enqueuedAt: '2025-07-06T06:45:00Z',
    retryCount: 5, maxRetries: 5,
    message: 'PDF render service unavailable — 5 retries exhausted',
    reason: 'Render pod OOMKilled repeatedly; circuit breaker tripped',
    resolution: 'redrive',
    resolvedBy: 'Jhansi M', resolvedAt: '2025-07-06T09:00:00Z',
    auditNote: 'Pod memory limit raised to 1Gi; redrive successful',
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'dlq-004',
    errorCode: 'VLT-TEC-AUTH-0011', correlationId: 'cid-freight-6f8a1c',
    service: 'AuthService', operation: 'validateAPIKey', domain: 'AUTH',
    severity: 'ERROR', enqueuedAt: '2025-07-06T08:10:00Z',
    retryCount: 3, maxRetries: 3,
    message: 'API key rotation conflict — VLT-KEY-4521 invalidated mid-flight',
    reason: 'Propagation delay caused 3 consecutive auth failures',
    resolution: 'discard',
    resolvedBy: 'Ravi P', resolvedAt: '2025-07-06T09:15:00Z',
    auditNote: 'Discarded — API key rotation complete; fresh key active',
    tenantId: 'tnt-004', tenant: 'Triton Freight',
  },
]

// ─── Circuit Breakers ─────────────────────────────────────────────────────────

export interface CircuitBreaker {
  id:               string
  name:             string
  dependency:       string
  service:          string
  state:            BreakerState
  failureRate:      number   // percent in last window
  failureThreshold: number   // percent to trip
  successCount:     number
  failureCount:     number
  totalRequests:    number
  lastTrippedAt?:   string
  nextHalfOpenAt?:  string
  cooldownSec:      number
  windowSec:        number
  correlationIds:   string[]
  errorCodes:       string[]
  tenantId:         string
  tenant:           string
}

export const circuitBreakers: CircuitBreaker[] = [
  {
    id: 'cb-001', name: 'carrier-gw',
    dependency: 'https://api.carrier-gw.com/v3', service: 'ShipmentOrchestrator',
    state: 'open', failureRate: 100, failureThreshold: 50,
    successCount: 0, failureCount: 5, totalRequests: 5,
    lastTrippedAt: '2025-07-06T03:14:22Z', nextHalfOpenAt: '2025-07-06T10:44:22Z',
    cooldownSec: 300, windowSec: 60,
    correlationIds: ['cid-freight-8a3f2e'],
    errorCodes: ['VLT-TEC-CARRIER-0001'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'cb-002', name: 'port-jebelali-api',
    dependency: 'https://portofjebelali.ae/api/v2', service: 'VesselScheduler',
    state: 'half-open', failureRate: 62, failureThreshold: 50,
    successCount: 1, failureCount: 4, totalRequests: 8,
    lastTrippedAt: '2025-07-06T09:00:00Z', nextHalfOpenAt: '2025-07-06T10:00:00Z',
    cooldownSec: 180, windowSec: 60,
    correlationIds: ['cid-freight-7c1d4f'],
    errorCodes: ['VLT-FNC-VESSEL-0008'],
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics',
  },
  {
    id: 'cb-003', name: 'freight-ledger-pg',
    dependency: 'postgresql://freight-ledger-prod:5432', service: 'FreightLedger',
    state: 'closed', failureRate: 2, failureThreshold: 50,
    successCount: 248, failureCount: 5, totalRequests: 253,
    lastTrippedAt: '2025-07-06T07:04:01Z',
    cooldownSec: 120, windowSec: 60,
    correlationIds: ['cid-freight-5c4d2e'],
    errorCodes: ['VLT-TEC-DB-0003'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping',
  },
  {
    id: 'cb-004', name: 'sendgrid-smtp',
    dependency: 'smtp.sendgrid.net:587', service: 'NotificationDispatcher',
    state: 'closed', failureRate: 8, failureThreshold: 50,
    successCount: 920, failureCount: 80, totalRequests: 1000,
    cooldownSec: 60, windowSec: 60,
    correlationIds: ['cid-freight-5d3e2f'],
    errorCodes: ['VLT-TEC-NOTIFY-0009'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'cb-005', name: 'doc-render-svc',
    dependency: 'http://doc-render-svc:8080', service: 'DocumentService',
    state: 'closed', failureRate: 5, failureThreshold: 50,
    successCount: 190, failureCount: 10, totalRequests: 200,
    lastTrippedAt: '2025-07-06T06:10:44Z',
    cooldownSec: 120, windowSec: 60,
    correlationIds: ['cid-freight-9e1f5c'],
    errorCodes: ['VLT-TEC-DOC-0018'],
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
]

// ─── Error Code Registry ──────────────────────────────────────────────────────

export interface RegistryEntry {
  errorCode:       string
  errorClass:      ErrorClass
  domain:          string
  description:     string
  httpStatus?:     number
  isRetriable:     boolean
  circuitBreaker:  boolean
  maxRetries:      number
  backoffStrategy: 'exponential' | 'fixed' | 'none'
  escalationPath:  string
  owner:           string
  createdAt:       string
  updatedAt:       string
  eventCount:      number
  lastSeen?:       string
}

export const registry: RegistryEntry[] = [
  {
    errorCode: 'VLT-TEC-CARRIER-0001', errorClass: 'Technical', domain: 'CARRIER',
    description: 'Carrier API gateway timeout — no ACK within SLA window',
    httpStatus: 504, isRetriable: true, circuitBreaker: true, maxRetries: 5,
    backoffStrategy: 'exponential', escalationPath: 'L1 → L2 → Carrier Ops',
    owner: 'Platform Engineering', createdAt: '2024-01-15', updatedAt: '2025-06-30',
    eventCount: 42, lastSeen: '2025-07-06T03:14:22Z',
  },
  {
    errorCode: 'VLT-TEC-CARRIER-0002', errorClass: 'Technical', domain: 'CARRIER',
    description: 'Carrier confirmation webhook missing after timeout window',
    isRetriable: true, circuitBreaker: false, maxRetries: 3,
    backoffStrategy: 'fixed', escalationPath: 'L1 → Carrier Ops',
    owner: 'Platform Engineering', createdAt: '2024-02-20', updatedAt: '2025-05-15',
    eventCount: 18, lastSeen: '2025-07-06T09:30:00Z',
  },
  {
    errorCode: 'VLT-TEC-DB-0003', errorClass: 'Technical', domain: 'DB',
    description: 'PostgreSQL connection pool exhausted',
    isRetriable: true, circuitBreaker: true, maxRetries: 5,
    backoffStrategy: 'exponential', escalationPath: 'L1 → DBA On-Call',
    owner: 'Database Team', createdAt: '2023-11-01', updatedAt: '2025-07-01',
    eventCount: 7, lastSeen: '2025-07-06T07:04:01Z',
  },
  {
    errorCode: 'VLT-FNC-RATE-0012', errorClass: 'Functional', domain: 'RATE',
    description: 'Fuel-surcharge table freshness SLA violation',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'Rate Ops → Finance',
    owner: 'Rate Team', createdAt: '2024-03-10', updatedAt: '2025-06-28',
    eventCount: 9, lastSeen: '2025-07-06T04:02:11Z',
  },
  {
    errorCode: 'VLT-FNC-PAYMENT-0005', errorClass: 'Functional', domain: 'PAYMENT',
    description: 'Stripe charge declined — non-retriable card error',
    httpStatus: 402, isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'Finance Ops → Account Manager',
    owner: 'Payments Team', createdAt: '2024-01-22', updatedAt: '2025-07-02',
    eventCount: 31, lastSeen: '2025-07-06T06:55:18Z',
  },
  {
    errorCode: 'VLT-FNC-VESSEL-0008', errorClass: 'Functional', domain: 'VESSEL',
    description: 'Port API 503 — scheduled maintenance or overload',
    httpStatus: 503, isRetriable: true, circuitBreaker: true, maxRetries: 8,
    backoffStrategy: 'exponential', escalationPath: 'L1 → Port Liaison',
    owner: 'Vessel Ops', createdAt: '2024-04-18', updatedAt: '2025-06-14',
    eventCount: 22, lastSeen: '2025-07-06T09:05:19Z',
  },
  {
    errorCode: 'VLT-BUS-CUSTOMS-0007', errorClass: 'Business', domain: 'CUSTOMS',
    description: 'HS code not mapped in active tariff table — manual review needed',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'Customs Desk → Trade Compliance',
    owner: 'Trade Compliance', createdAt: '2024-02-05', updatedAt: '2025-07-04',
    eventCount: 15, lastSeen: '2025-07-06T05:47:03Z',
  },
  {
    errorCode: 'VLT-BUS-CUSTOMS-0008', errorClass: 'Business', domain: 'CUSTOMS',
    description: 'Import permit expired — shipment blocked at customs',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'Customs Desk → Account Manager → Tenant',
    owner: 'Trade Compliance', createdAt: '2024-06-10', updatedAt: '2025-07-05',
    eventCount: 8, lastSeen: '2025-07-06T09:45:00Z',
  },
  {
    errorCode: 'VLT-BUS-SLA-0028', errorClass: 'Business', domain: 'SLA',
    description: 'Shipment ETA deviation exceeds SLA contract threshold',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'SLA Manager → Account Manager',
    owner: 'Operations', createdAt: '2023-09-01', updatedAt: '2025-06-20',
    eventCount: 44, lastSeen: '2025-07-06T07:30:00Z',
  },
  {
    errorCode: 'VLT-TEC-DOC-0018', errorClass: 'Technical', domain: 'DOC',
    description: 'PDF render service OOMKilled — pod memory exceeded',
    httpStatus: 503, isRetriable: true, circuitBreaker: true, maxRetries: 5,
    backoffStrategy: 'exponential', escalationPath: 'L1 → Platform Ops',
    owner: 'Platform Engineering', createdAt: '2024-07-11', updatedAt: '2025-07-03',
    eventCount: 12, lastSeen: '2025-07-06T06:10:45Z',
  },
  {
    errorCode: 'VLT-TEC-AUTH-0011', errorClass: 'Technical', domain: 'AUTH',
    description: 'API key rotation propagation conflict',
    isRetriable: true, circuitBreaker: false, maxRetries: 3,
    backoffStrategy: 'fixed', escalationPath: 'L1 → Security Ops',
    owner: 'Security Team', createdAt: '2024-05-20', updatedAt: '2025-06-30',
    eventCount: 5, lastSeen: '2025-07-06T07:58:22Z',
  },
  {
    errorCode: 'VLT-TEC-MLOPS-0022', errorClass: 'Technical', domain: 'MLOPS',
    description: 'ML model artifact checksum mismatch — rollback triggered',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'MLOps → AI Platform Team',
    owner: 'AI Platform', createdAt: '2024-09-14', updatedAt: '2025-07-01',
    eventCount: 3, lastSeen: '2025-07-06T08:52:44Z',
  },
  {
    errorCode: 'VLT-TEC-NOTIFY-0009', errorClass: 'Technical', domain: 'NOTIFY',
    description: 'SendGrid SMTP bounce — invalid MX record',
    isRetriable: true, circuitBreaker: false, maxRetries: 3,
    backoffStrategy: 'fixed', escalationPath: 'L1 → Comms Ops',
    owner: 'Platform Engineering', createdAt: '2024-03-28', updatedAt: '2025-06-12',
    eventCount: 27, lastSeen: '2025-07-06T10:02:14Z',
  },
  {
    errorCode: 'VLT-BUS-COMPLIANCE-0004', errorClass: 'Business', domain: 'COMPLIANCE',
    description: 'Dangerous goods declaration missing — shipment held',
    isRetriable: false, circuitBreaker: false, maxRetries: 0,
    backoffStrategy: 'none', escalationPath: 'Compliance Desk → IATA Liaison',
    owner: 'Compliance Team', createdAt: '2024-01-08', updatedAt: '2025-06-25',
    eventCount: 6, lastSeen: '2025-07-06T08:15:07Z',
  },
]

// ─── AI Agent / Skill Runs ────────────────────────────────────────────────────

export interface AgentRun {
  id:                 string
  agent:              string        // e.g. RateAdvisorAgent
  skill:              string        // e.g. demand-forecast
  correlationId:      string
  errorCode:          string
  errorClass:         ErrorClass
  severity:           Severity
  status:             AgentStatus
  message:            string
  healingAttempts:    number
  maxHealingBudget:   number
  healingStrategy:    string
  healingLog:         HealingStep[]
  budgetExhaustedAt?: string
  escalatedTo?:       string
  occurredAt:         string
  tenantId:           string
  tenant:             string
}

export interface HealingStep {
  attempt:    number
  action:     string
  outcome:    'success' | 'failure' | 'partial'
  timestamp:  string
  detail:     string
}

export const agentRuns: AgentRun[] = [
  {
    id: 'agt-001', agent: 'AIRateAdvisorAgent', skill: 'demand-forecast',
    correlationId: 'cid-freight-8e5f3b', errorCode: 'VLT-TEC-MLOPS-0022',
    errorClass: 'Technical', severity: 'ERROR', status: 'escalated',
    message: 'ML model v2.4.1 checksum mismatch — healing exhausted, escalated to AI Platform',
    healingAttempts: 3, maxHealingBudget: 3,
    healingStrategy: 'rollback → checksum-verify → redeploy',
    healingLog: [
      { attempt: 1, action: 'Rollback to v2.3.9', outcome: 'success', timestamp: '2025-07-06T08:53:00Z', detail: 'Rolled back model serving to v2.3.9; inference resumed' },
      { attempt: 2, action: 'Re-download v2.4.1 artefact', outcome: 'failure', timestamp: '2025-07-06T08:58:00Z', detail: 'Checksum still mismatch — S3 object may be corrupted' },
      { attempt: 3, action: 'Trigger artefact rebuild pipeline', outcome: 'failure', timestamp: '2025-07-06T09:10:00Z', detail: 'Pipeline failed: training job quota exceeded' },
    ],
    budgetExhaustedAt: '2025-07-06T09:10:00Z',
    escalatedTo: 'AI Platform Team — Slack #mlops-incidents',
    occurredAt: '2025-07-06T08:52:44Z',
    tenantId: 'tnt-002', tenant: 'Horizon Shipping',
  },
  {
    id: 'agt-002', agent: 'CustomsClearanceAgent', skill: 'hs-code-mapping',
    correlationId: 'cid-freight-2d7a4b', errorCode: 'VLT-BUS-CUSTOMS-0007',
    errorClass: 'Business', severity: 'WARN', status: 'recovered',
    message: 'HS code 8471.30 unmapped — agent auto-mapped via WCO fallback table',
    healingAttempts: 1, maxHealingBudget: 2,
    healingStrategy: 'fallback-table-lookup → manual-escalate',
    healingLog: [
      { attempt: 1, action: 'WCO fallback table lookup for 8471.30', outcome: 'success', timestamp: '2025-07-06T05:48:00Z', detail: 'Mapped 8471.30 to parent code 8471 (ADP machines); declaration submitted' },
    ],
    occurredAt: '2025-07-06T05:47:03Z',
    tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics',
  },
  {
    id: 'agt-003', agent: 'DocumentGeneratorAgent', skill: 'bill-of-lading',
    correlationId: 'cid-freight-9e1f5c', errorCode: 'VLT-TEC-DOC-0018',
    errorClass: 'Technical', severity: 'ERROR', status: 'healing',
    message: 'PDF render OOMKilled — agent attempting pod restart and memory limit expansion',
    healingAttempts: 2, maxHealingBudget: 4,
    healingStrategy: 'pod-restart → resource-patch → fallback-renderer',
    healingLog: [
      { attempt: 1, action: 'Restart OOMKilled pod', outcome: 'failure', timestamp: '2025-07-06T06:11:00Z', detail: 'Pod restarted but OOMKilled again within 30 s' },
      { attempt: 2, action: 'Patch deployment memoryLimit to 1Gi', outcome: 'partial', timestamp: '2025-07-06T06:15:00Z', detail: 'Patch applied; pod starting — awaiting readiness probe' },
    ],
    occurredAt: '2025-07-06T06:10:45Z',
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'agt-004', agent: 'CarrierAllocationAgent', skill: 'carrier-selection',
    correlationId: 'cid-freight-8a3f2e', errorCode: 'VLT-TEC-CARRIER-0001',
    errorClass: 'Technical', severity: 'FATAL', status: 'budget_exhausted',
    message: 'Carrier API gateway down — all 5 healing attempts failed; awaiting DLQ triage',
    healingAttempts: 5, maxHealingBudget: 5,
    healingStrategy: 'retry-with-backoff → fallback-carrier → manual-override',
    healingLog: [
      { attempt: 1, action: 'Exponential backoff retry #1', outcome: 'failure', timestamp: '2025-07-06T03:15:00Z', detail: 'HTTP 504 repeated' },
      { attempt: 2, action: 'Exponential backoff retry #2', outcome: 'failure', timestamp: '2025-07-06T03:16:00Z', detail: 'HTTP 504 repeated' },
      { attempt: 3, action: 'Exponential backoff retry #3', outcome: 'failure', timestamp: '2025-07-06T03:18:00Z', detail: 'Circuit breaker tripped OPEN' },
      { attempt: 4, action: 'Fallback to secondary carrier FedEx', outcome: 'failure', timestamp: '2025-07-06T03:22:00Z', detail: 'FedEx API rate limit — 429' },
      { attempt: 5, action: 'Emergency manual override ticket raised', outcome: 'failure', timestamp: '2025-07-06T03:24:00Z', detail: 'No ops response within SLA — moved to DLQ' },
    ],
    budgetExhaustedAt: '2025-07-06T03:24:00Z',
    occurredAt: '2025-07-06T03:14:22Z',
    tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
]

// ─── Catch Seams ─────────────────────────────────────────────────────────────

export interface Seam {
  id:          string
  seam:        SeamName
  description: string
  health:      'healthy' | 'degraded' | 'critical'
  eventsToday: number
  openErrors:  number
  dlqEvents:   number
  services:    string[]
  errorCodes:  string[]
}

export const seams: Seam[] = [
  {
    id: 'seam-1', seam: 'API Gateway', health: 'degraded', eventsToday: 3, openErrors: 2, dlqEvents: 0,
    description: 'Ingress layer — auth, rate limiting, routing, TLS termination',
    services: ['AuthService', 'FreightAPIGateway', 'RateLimiter'],
    errorCodes: ['VLT-TEC-AUTH-0011'],
  },
  {
    id: 'seam-2', seam: 'Service Boundary', health: 'critical', eventsToday: 6, openErrors: 4, dlqEvents: 1,
    description: 'Internal service-to-service calls — gRPC, REST, message broker',
    services: ['DocumentService', 'CustomsClearance', 'SLAMonitor', 'ComplianceChecker'],
    errorCodes: ['VLT-TEC-DOC-0018', 'VLT-BUS-CUSTOMS-0007', 'VLT-BUS-SLA-0028', 'VLT-BUS-COMPLIANCE-0004'],
  },
  {
    id: 'seam-3', seam: 'Repository', health: 'healthy', eventsToday: 2, openErrors: 0, dlqEvents: 0,
    description: 'Database / cache reads and writes — SQL, Redis, object store',
    services: ['FreightLedger', 'RateEngine'],
    errorCodes: ['VLT-TEC-DB-0003', 'VLT-FNC-RATE-0012'],
  },
  {
    id: 'seam-4', seam: 'External Adapter', health: 'critical', eventsToday: 5, openErrors: 3, dlqEvents: 2,
    description: 'Third-party integration layer — carrier APIs, port APIs, payment gateways',
    services: ['ShipmentOrchestrator', 'PaymentGateway', 'NotificationDispatcher', 'VesselScheduler'],
    errorCodes: ['VLT-TEC-CARRIER-0001', 'VLT-FNC-PAYMENT-0005', 'VLT-TEC-NOTIFY-0009', 'VLT-FNC-VESSEL-0008'],
  },
  {
    id: 'seam-5', seam: 'AI Skill', health: 'degraded', eventsToday: 2, openErrors: 1, dlqEvents: 0,
    description: 'AI agent / skill boundary — model inference, tool calls, healing budget',
    services: ['AIRatePredictor', 'CustomsClearanceAgent', 'CarrierAllocationAgent'],
    errorCodes: ['VLT-TEC-MLOPS-0022'],
  },
]

// ─── DLQ Queues ──────────────────────────────────────────────────────────────

export interface DlqQueue {
  id:         string
  name:       string
  service:    string
  depth:      number
  oldest:     string     // ISO timestamp of oldest item
  poisonPct:  number     // % that hit ≥2 subscribers
  tenantId:   string
  tenant:     string
}

export const dlqQueues: DlqQueue[] = [
  { id: 'q-001', name: 'shipment.orchestrator.dlq',    service: 'ShipmentOrchestrator',      depth: 3, oldest: '2025-07-06T03:24:22Z', poisonPct: 33, tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'q-002', name: 'payment.gateway.dlq',          service: 'PaymentGateway',             depth: 2, oldest: '2025-07-06T06:55:18Z', poisonPct: 0,  tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'q-003', name: 'document.service.dlq',         service: 'DocumentService',            depth: 1, oldest: '2025-07-06T06:45:00Z', poisonPct: 0,  tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'q-004', name: 'auth.service.dlq',             service: 'AuthService',                depth: 1, oldest: '2025-07-06T08:10:00Z', poisonPct: 0,  tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'q-005', name: 'customs.clearance.dlq',        service: 'CustomsClearance',           depth: 2, oldest: '2025-07-06T09:14:00Z', poisonPct: 50, tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics' },
  { id: 'q-006', name: 'compliance.checker.dlq',       service: 'ComplianceChecker',          depth: 1, oldest: '2025-07-06T11:00:22Z', poisonPct: 0,  tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics' },
  { id: 'q-007', name: 'erp.connector.dlq',            service: 'ERPConnector',               depth: 0, oldest: '',                     poisonPct: 0,  tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'q-008', name: 'outbox.processor.dlq',         service: 'OutboxProcessor',            depth: 1, oldest: '2025-07-06T09:50:15Z', poisonPct: 0,  tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
]

// Extend dlqItems with more realistic data
export const dlqItemsExtended: DlqItem[] = [
  ...dlqItems,
  {
    id: 'dlq-005',
    errorCode: 'VLT-BUS-CUSTOMS-0011', correlationId: 'cid-freight-cus11',
    service: 'CustomsClearance', operation: 'submitToFedEx', domain: 'CUSTOMS',
    severity: 'ERROR', enqueuedAt: '2025-07-06T09:14:00Z',
    retryCount: 3, maxRetries: 3,
    message: 'FedEx API: CERT_OF_ORIGIN_REQUIRED for SHP-20478',
    reason: 'Retries exhausted — document checklist gap; manual upload required',
    resolution: 'pending', tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics',
  },
  {
    id: 'dlq-006',
    errorCode: 'VLT-TEC-BUS-0002', correlationId: 'cid-freight-bus2',
    service: 'OutboxProcessor', operation: 'processOutboxBatch', domain: 'BUS',
    severity: 'FATAL', enqueuedAt: '2025-07-06T09:50:15Z',
    retryCount: 10, maxRetries: 10,
    message: 'Dead outbox row evt-bus-8831 — 10 relay attempts, Kafka LEADER_NOT_AVAILABLE',
    reason: 'Kafka broker leader election failure; outbox row marked dead after 10 attempts',
    resolution: 'pending', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC',
  },
  {
    id: 'dlq-007',
    errorCode: 'VLT-BUS-COMPLIANCE-0009', correlationId: 'cid-freight-comp9',
    service: 'ComplianceChecker', operation: 'verifyExportLicense', domain: 'COMPLIANCE',
    severity: 'ERROR', enqueuedAt: '2025-07-06T11:00:22Z',
    retryCount: 0, maxRetries: 0,
    message: 'Export license EXL-20240788 expired — SHP-20488 cannot be dispatched',
    reason: 'Non-retriable: expired document requires manual renewal',
    resolution: 'pending', tenantId: 'tnt-003', tenant: 'Al Futtaim Logistics',
  },
  {
    id: 'dlq-008',
    errorCode: 'VLT-FUN-AUT-0009', correlationId: 'cid-freight-aut9',
    service: 'AuthService', operation: 'authorizeResourceAccess', domain: 'AUT',
    severity: 'ERROR', enqueuedAt: '2025-07-06T09:35:47Z',
    retryCount: 0, maxRetries: 0,
    message: 'Cross-tenant read attempt tnt-004 → SHP-20449 (owned tnt-001)',
    reason: 'Security: cross-tenant access blocked, sent to security DLQ for audit',
    resolution: 'pending', tenantId: 'tnt-004', tenant: 'Triton Freight',
  },
]

// Extended circuit breakers with per-tenant scope and LLM
export const circuitBreakersExtended: CircuitBreaker[] = [
  ...circuitBreakers,
  {
    id: 'cb-006', name: 'openai-gpt4o-global',
    dependency: 'https://api.openai.com/v1/chat/completions', service: 'AIRatePredictor',
    state: 'open', failureRate: 78, failureThreshold: 50,
    successCount: 11, failureCount: 39, totalRequests: 50,
    lastTrippedAt: '2025-07-06T09:05:00Z', nextHalfOpenAt: '2025-07-06T10:35:00Z',
    cooldownSec: 300, windowSec: 120,
    correlationIds: ['cid-freight-llm1', 'cid-freight-llm2'],
    errorCodes: ['VLT-TEC-LLM-0001', 'VLT-TEC-LLM-0002'],
    tenantId: 'tnt-global', tenant: 'Global (all tenants)',
  },
  {
    id: 'cb-007', name: 'sap-erp-connector-tnt002',
    dependency: 'https://erp.horizonshipping.ae/sap/opu/odata', service: 'ERPConnector',
    state: 'open', failureRate: 100, failureThreshold: 50,
    successCount: 0, failureCount: 7, totalRequests: 7,
    lastTrippedAt: '2025-07-06T10:30:00Z', nextHalfOpenAt: '2025-07-06T10:35:00Z',
    cooldownSec: 300, windowSec: 60,
    correlationIds: ['cid-freight-int3'],
    errorCodes: ['VLT-FUN-INT-0003'],
    tenantId: 'tnt-002', tenant: 'Horizon Shipping',
  },
  {
    id: 'cb-008', name: 'stripe-payment-gateway',
    dependency: 'https://api.stripe.com/v1/charges', service: 'PaymentGateway',
    state: 'closed', failureRate: 12, failureThreshold: 50,
    successCount: 440, failureCount: 60, totalRequests: 500,
    cooldownSec: 60, windowSec: 60,
    correlationIds: [],
    errorCodes: ['VLT-FNC-PAYMENT-0005'],
    tenantId: 'tnt-global', tenant: 'Global (all tenants)',
  },
  {
    id: 'cb-009', name: 'dubai-trade-portal-tnt004',
    dependency: 'https://api.dubaitrade.ae/v2/manifest', service: 'PortalConnector',
    state: 'half-open', failureRate: 55, failureThreshold: 50,
    successCount: 2, failureCount: 7, totalRequests: 16,
    lastTrippedAt: '2025-07-06T09:44:20Z', nextHalfOpenAt: '2025-07-06T10:39:20Z',
    cooldownSec: 180, windowSec: 60,
    correlationIds: ['cid-freight-int14'],
    errorCodes: ['VLT-TEC-INT-0014'],
    tenantId: 'tnt-004', tenant: 'Triton Freight',
  },
]

// ─── Extended Registry (60 codes) ─────────────────────────────────────────────

export interface RegistryEntryFull extends RegistryEntry {
  defaultSeverity:  Severity
  userMessageKey:   string
  deprecatedIn?:    string
  introducedIn:     string
  ownerTeam:        string
  ownerInitials:    string
  usage30d:         number
}

export const registryFull: RegistryEntryFull[] = [
  // DB
  { errorCode: 'VLT-TEC-DB-0001', errorClass: 'Technical', domain: 'DB', defaultSeverity: 'ERROR', description: 'PostgreSQL connection pool exhausted', isRetriable: true, circuitBreaker: true, maxRetries: 5, backoffStrategy: 'exponential', escalationPath: 'DBA On-Call', owner: 'Database Team', ownerTeam: 'db-team', ownerInitials: 'DT', introducedIn: 'v1.0.0', userMessageKey: 'err.db.pool_exhausted', usage30d: 14, eventCount: 14, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-DB-0002', errorClass: 'Technical', domain: 'DB', defaultSeverity: 'ERROR', description: 'Unique constraint violation on primary key', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'L1', owner: 'Database Team', ownerTeam: 'db-team', ownerInitials: 'DT', introducedIn: 'v1.0.0', userMessageKey: 'err.db.unique_violation', usage30d: 6, eventCount: 6, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-DB-0003', errorClass: 'Technical', domain: 'DB', defaultSeverity: 'WARN', description: 'Query timeout — slow plan detected', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'DBA On-Call', owner: 'Database Team', ownerTeam: 'db-team', ownerInitials: 'DT', introducedIn: 'v1.1.0', userMessageKey: 'err.db.query_timeout', usage30d: 7, eventCount: 7, createdAt: '2024-02-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-DB-0004', errorClass: 'Technical', domain: 'DB', defaultSeverity: 'FATAL', description: 'Replication lag exceeds threshold — read replicas stale', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'DBA On-Call → SRE', owner: 'Database Team', ownerTeam: 'db-team', ownerInitials: 'DT', introducedIn: 'v1.2.0', userMessageKey: 'err.db.replica_lag', usage30d: 2, eventCount: 2, createdAt: '2024-03-01', updatedAt: '2025-06-15' },
  { errorCode: 'VLT-TEC-DB-0009', errorClass: 'Technical', domain: 'DB', defaultSeverity: 'ERROR', description: 'Bulk insert constraint violation on correlation_id', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'L1', owner: 'Database Team', ownerTeam: 'db-team', ownerInitials: 'DT', introducedIn: 'v1.4.0', userMessageKey: 'err.db.bulk_constraint', usage30d: 1, eventCount: 1, createdAt: '2024-06-01', updatedAt: '2025-07-01' },
  // BUS
  { errorCode: 'VLT-TEC-BUS-0001', errorClass: 'Technical', domain: 'BUS', defaultSeverity: 'ERROR', description: 'Message bus connection dropped — reconnect required', isRetriable: true, circuitBreaker: true, maxRetries: 5, backoffStrategy: 'exponential', escalationPath: 'Platform Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.0.0', userMessageKey: 'err.bus.connection_dropped', usage30d: 9, eventCount: 9, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-BUS-0002', errorClass: 'Technical', domain: 'BUS', defaultSeverity: 'FATAL', description: 'Dead outbox row — all relay attempts exhausted', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Platform Ops → SRE', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.0.0', userMessageKey: 'err.bus.dead_outbox', usage30d: 1, eventCount: 1, createdAt: '2024-01-01', updatedAt: '2025-07-05' },
  { errorCode: 'VLT-TEC-BUS-0003', errorClass: 'Technical', domain: 'BUS', defaultSeverity: 'ERROR', description: 'Kafka partition rebalance timeout', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'Platform Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.1.0', userMessageKey: 'err.bus.rebalance_timeout', usage30d: 4, eventCount: 4, createdAt: '2024-04-01', updatedAt: '2025-06-20' },
  // CB
  { errorCode: 'VLT-TEC-CB-0001', errorClass: 'Technical', domain: 'CB', defaultSeverity: 'WARN', description: 'Circuit breaker tripped OPEN — failure rate exceeded', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'L1 → Dependency Owner', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.0.0', userMessageKey: 'err.cb.tripped_open', usage30d: 8, eventCount: 8, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-CB-0005', errorClass: 'Technical', domain: 'CB', defaultSeverity: 'ERROR', description: '12 consecutive failures in 5 min window', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'L1 → Dependency Owner', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.2.0', userMessageKey: 'err.cb.consecutive_failures', usage30d: 3, eventCount: 3, createdAt: '2024-03-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-CB-0009', errorClass: 'Technical', domain: 'CB', defaultSeverity: 'WARN', description: 'Circuit breaker moving to half-open — probe request sent', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'L1', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.3.0', userMessageKey: 'err.cb.half_open_probe', usage30d: 5, eventCount: 5, createdAt: '2024-05-01', updatedAt: '2025-06-30' },
  // INT
  { errorCode: 'VLT-TEC-INT-0003', errorClass: 'Technical', domain: 'INT', defaultSeverity: 'WARN', description: 'ERP sync rejected — duplicate document key', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'L1 → ERP Team', owner: 'Integrations Team', ownerTeam: 'integrations', ownerInitials: 'IT', introducedIn: 'v1.1.0', userMessageKey: 'err.int.duplicate_doc_key', usage30d: 2, eventCount: 2, createdAt: '2024-02-01', updatedAt: '2025-06-15' },
  { errorCode: 'VLT-TEC-INT-0009', errorClass: 'Technical', domain: 'INT', defaultSeverity: 'ERROR', description: 'Oracle ERP journal reconciliation failure — debit/credit mismatch', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'Finance Ops', owner: 'Integrations Team', ownerTeam: 'integrations', ownerInitials: 'IT', introducedIn: 'v1.3.0', userMessageKey: 'err.int.journal_mismatch', usage30d: 1, eventCount: 1, createdAt: '2024-05-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-INT-0014', errorClass: 'Technical', domain: 'INT', defaultSeverity: 'WARN', description: 'Trade portal session expired mid-upload', isRetriable: true, circuitBreaker: true, maxRetries: 3, backoffStrategy: 'exponential', escalationPath: 'L1 → Trade Ops', owner: 'Integrations Team', ownerTeam: 'integrations', ownerInitials: 'IT', introducedIn: 'v1.5.0', userMessageKey: 'err.int.session_expired', usage30d: 1, eventCount: 1, createdAt: '2024-08-01', updatedAt: '2025-07-01' },
  // LLM
  { errorCode: 'VLT-TEC-LLM-0001', errorClass: 'Technical', domain: 'LLM', defaultSeverity: 'WARN', description: 'LLM provider 429 Too Many Requests — rate limit hit', isRetriable: true, circuitBreaker: true, maxRetries: 5, backoffStrategy: 'exponential', escalationPath: 'AI Platform', owner: 'AI Platform', ownerTeam: 'ai-platform', ownerInitials: 'AP', introducedIn: 'v2.0.0', userMessageKey: 'err.llm.rate_limit', usage30d: 12, eventCount: 12, createdAt: '2024-10-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-LLM-0002', errorClass: 'Technical', domain: 'LLM', defaultSeverity: 'ERROR', description: 'LLM context window exceeded — chunking required', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'none', escalationPath: 'AI Platform', owner: 'AI Platform', ownerTeam: 'ai-platform', ownerInitials: 'AP', introducedIn: 'v2.0.0', userMessageKey: 'err.llm.context_exceeded', usage30d: 4, eventCount: 4, createdAt: '2024-10-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-LLM-0003', errorClass: 'Technical', domain: 'LLM', defaultSeverity: 'ERROR', description: 'LLM provider returned malformed JSON — parsing failed', isRetriable: true, circuitBreaker: false, maxRetries: 2, backoffStrategy: 'fixed', escalationPath: 'AI Platform', owner: 'AI Platform', ownerTeam: 'ai-platform', ownerInitials: 'AP', introducedIn: 'v2.1.0', userMessageKey: 'err.llm.malformed_response', usage30d: 3, eventCount: 3, createdAt: '2024-11-01', updatedAt: '2025-06-30' },
  // GRD
  { errorCode: 'VLT-TEC-GRD-0001', errorClass: 'Technical', domain: 'GRD', defaultSeverity: 'FATAL', description: 'AI guardrail blocked — sanctioned entity match', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Compliance → Legal', owner: 'Compliance Team', ownerTeam: 'compliance', ownerInitials: 'CT', introducedIn: 'v2.0.0', userMessageKey: 'err.grd.sanction_block', usage30d: 1, eventCount: 1, createdAt: '2024-10-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-GRD-0003', errorClass: 'Technical', domain: 'GRD', defaultSeverity: 'WARN', description: 'PII detected in LLM output — masked before logging', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Security Ops', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v2.0.0', userMessageKey: 'err.grd.pii_detected', usage30d: 2, eventCount: 2, createdAt: '2024-10-01', updatedAt: '2025-07-01' },
  // VAL
  { errorCode: 'VLT-FUN-VAL-0001', errorClass: 'Functional', domain: 'VAL', defaultSeverity: 'INFO', description: 'Required field missing on inbound request', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Caller', owner: 'API Team', ownerTeam: 'api-team', ownerInitials: 'AT', introducedIn: 'v1.0.0', userMessageKey: 'err.val.required_field', usage30d: 28, eventCount: 28, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-FUN-VAL-0008', errorClass: 'Functional', domain: 'VAL', defaultSeverity: 'INFO', description: 'EU import validation — EORI number required', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Caller', owner: 'API Team', ownerTeam: 'api-team', ownerInitials: 'AT', introducedIn: 'v1.3.0', userMessageKey: 'err.val.eori_required', usage30d: 5, eventCount: 5, createdAt: '2024-04-01', updatedAt: '2025-06-30' },
  // AUT
  { errorCode: 'VLT-FUN-AUT-0003', errorClass: 'Functional', domain: 'AUT', defaultSeverity: 'WARN', description: 'Insufficient token scope for requested operation', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Caller → IAM', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v1.0.0', userMessageKey: 'err.aut.insufficient_scope', usage30d: 11, eventCount: 11, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-FUN-AUT-0009', errorClass: 'Functional', domain: 'AUT', defaultSeverity: 'ERROR', description: 'Cross-tenant resource access attempt blocked', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Security Channel', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v1.0.0', userMessageKey: 'err.aut.cross_tenant_blocked', usage30d: 3, eventCount: 3, createdAt: '2024-01-01', updatedAt: '2025-07-05' },
  // STA
  { errorCode: 'VLT-TEC-STA-0002', errorClass: 'Technical', domain: 'STA', defaultSeverity: 'ERROR', description: 'Optimistic lock conflict — concurrent state update collision', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'L1', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.2.0', userMessageKey: 'err.sta.optimistic_lock', usage30d: 7, eventCount: 7, createdAt: '2024-03-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-STA-0005', errorClass: 'Technical', domain: 'STA', defaultSeverity: 'WARN', description: 'State machine transition guard rejected — invalid precondition', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'L1 → Domain Team', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.2.0', userMessageKey: 'err.sta.transition_guard', usage30d: 4, eventCount: 4, createdAt: '2024-03-01', updatedAt: '2025-06-20' },
  // FLW
  { errorCode: 'VLT-FUN-FLW-0007', errorClass: 'Functional', domain: 'FLW', defaultSeverity: 'WARN', description: 'Workflow stuck in awaiting-confirm step > timeout', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Ops → Carrier', owner: 'Workflow Team', ownerTeam: 'workflow', ownerInitials: 'WT', introducedIn: 'v1.4.0', userMessageKey: 'err.flw.awaiting_confirm_timeout', usage30d: 3, eventCount: 3, createdAt: '2024-06-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-FUN-FLW-0012', errorClass: 'Functional', domain: 'FLW', defaultSeverity: 'WARN', description: 'Saga compensation step failed — non-idempotent error', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Finance Ops', owner: 'Workflow Team', ownerTeam: 'workflow', ownerInitials: 'WT', introducedIn: 'v1.5.0', userMessageKey: 'err.flw.compensation_failed', usage30d: 1, eventCount: 1, createdAt: '2024-08-01', updatedAt: '2025-07-01' },
  // FIN
  { errorCode: 'VLT-BUS-FIN-0001', errorClass: 'Business', domain: 'FIN', defaultSeverity: 'WARN', description: 'Credit limit exceeded — operation blocked', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Credit Controller → Account Manager', owner: 'Finance Team', ownerTeam: 'finance', ownerInitials: 'FT', introducedIn: 'v1.0.0', userMessageKey: 'err.fin.credit_limit_exceeded', usage30d: 9, eventCount: 9, createdAt: '2024-01-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-BUS-FIN-0004', errorClass: 'Business', domain: 'FIN', defaultSeverity: 'ERROR', description: 'Tax matrix missing row — VAT lookup failed', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Finance Ops → Tax Team', owner: 'Finance Team', ownerTeam: 'finance', ownerInitials: 'FT', introducedIn: 'v2.0.0', userMessageKey: 'err.fin.tax_matrix_missing', usage30d: 2, eventCount: 2, createdAt: '2024-10-01', updatedAt: '2025-07-01' },
  // FRT
  { errorCode: 'VLT-BUS-FRT-0003', errorClass: 'Business', domain: 'FRT', defaultSeverity: 'WARN', description: 'Optimal route capacity exhausted — re-routing required', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Freight Ops', owner: 'Freight Team', ownerTeam: 'freight', ownerInitials: 'FO', introducedIn: 'v1.1.0', userMessageKey: 'err.frt.capacity_exhausted', usage30d: 5, eventCount: 5, createdAt: '2024-02-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-BUS-FRT-0007', errorClass: 'Business', domain: 'FRT', defaultSeverity: 'ERROR', description: 'Dangerous goods classification error — IATA violation', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Compliance Desk → IATA Liaison', owner: 'Compliance Team', ownerTeam: 'compliance', ownerInitials: 'CT', introducedIn: 'v1.3.0', userMessageKey: 'err.frt.dangerous_goods', usage30d: 2, eventCount: 2, createdAt: '2024-04-01', updatedAt: '2025-06-25' },
  // SLA
  { errorCode: 'VLT-BUS-SLA-0028', errorClass: 'Business', domain: 'SLA', defaultSeverity: 'WARN', description: 'Shipment ETA deviation exceeds SLA contract threshold', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'SLA Manager → Account Manager', owner: 'Operations', ownerTeam: 'operations', ownerInitials: 'OPS', introducedIn: 'v1.0.0', userMessageKey: 'err.sla.eta_deviation', usage30d: 44, eventCount: 44, createdAt: '2023-09-01', updatedAt: '2025-06-20' },
  { errorCode: 'VLT-BUS-SLA-0034', errorClass: 'Business', domain: 'SLA', defaultSeverity: 'WARN', description: 'Pickup window SLA breached — driver arrival late', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Dispatch → Account Manager', owner: 'Operations', ownerTeam: 'operations', ownerInitials: 'OPS', introducedIn: 'v1.2.0', userMessageKey: 'err.sla.pickup_breach', usage30d: 7, eventCount: 7, createdAt: '2024-03-01', updatedAt: '2025-07-01' },
  // CUSTOMS
  { errorCode: 'VLT-BUS-CUSTOMS-0007', errorClass: 'Business', domain: 'CUSTOMS', defaultSeverity: 'WARN', description: 'HS code not mapped in active tariff table', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Customs Desk → Trade Compliance', owner: 'Trade Compliance', ownerTeam: 'trade-compliance', ownerInitials: 'TC', introducedIn: 'v1.0.0', userMessageKey: 'err.customs.hs_unmapped', usage30d: 15, eventCount: 15, createdAt: '2024-02-05', updatedAt: '2025-07-04' },
  { errorCode: 'VLT-BUS-CUSTOMS-0009', errorClass: 'Business', domain: 'CUSTOMS', defaultSeverity: 'ERROR', description: 'Export license expired — shipment blocked', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Customs Desk → Account Manager', owner: 'Trade Compliance', ownerTeam: 'trade-compliance', ownerInitials: 'TC', introducedIn: 'v1.3.0', userMessageKey: 'err.customs.license_expired', usage30d: 3, eventCount: 3, createdAt: '2024-05-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-BUS-CUSTOMS-0011', errorClass: 'Business', domain: 'CUSTOMS', defaultSeverity: 'ERROR', description: 'Carrier rejected — certificate of origin missing', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Customs Desk', owner: 'Trade Compliance', ownerTeam: 'trade-compliance', ownerInitials: 'TC', introducedIn: 'v1.4.0', userMessageKey: 'err.customs.cert_origin_missing', usage30d: 2, eventCount: 2, createdAt: '2024-06-01', updatedAt: '2025-07-01' },
  // COMPLIANCE
  { errorCode: 'VLT-BUS-COMPLIANCE-0004', errorClass: 'Business', domain: 'COMPLIANCE', defaultSeverity: 'ERROR', description: 'Dangerous goods declaration missing', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Compliance Desk → IATA', owner: 'Compliance Team', ownerTeam: 'compliance', ownerInitials: 'CT', introducedIn: 'v1.0.0', userMessageKey: 'err.compliance.dg_declaration', usage30d: 6, eventCount: 6, createdAt: '2024-01-08', updatedAt: '2025-06-25' },
  { errorCode: 'VLT-BUS-COMPLIANCE-0009', errorClass: 'Business', domain: 'COMPLIANCE', defaultSeverity: 'ERROR', description: 'Export license expired — dispatch blocked', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Legal → Account Manager', owner: 'Compliance Team', ownerTeam: 'compliance', ownerInitials: 'CT', introducedIn: 'v1.4.0', userMessageKey: 'err.compliance.export_license_expired', usage30d: 1, eventCount: 1, createdAt: '2024-06-01', updatedAt: '2025-07-01' },
  // AUTH
  { errorCode: 'VLT-TEC-AUTH-0004', errorClass: 'Technical', domain: 'AUTH', defaultSeverity: 'WARN', description: 'OAuth refresh token expired — re-auth required', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'IAM Ops', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v1.1.0', userMessageKey: 'err.auth.refresh_expired', usage30d: 4, eventCount: 4, createdAt: '2024-02-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-AUTH-0011', errorClass: 'Technical', domain: 'AUTH', defaultSeverity: 'ERROR', description: 'API key rotation propagation conflict', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'Security Ops', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v1.2.0', userMessageKey: 'err.auth.key_rotation_conflict', usage30d: 5, eventCount: 5, createdAt: '2024-03-01', updatedAt: '2025-06-30' },
  { errorCode: 'VLT-TEC-AUTH-0016', errorClass: 'Technical', domain: 'AUTH', defaultSeverity: 'ERROR', description: 'MFA TOTP token replayed — login blocked', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Security Ops → SOC', owner: 'Security Team', ownerTeam: 'security', ownerInitials: 'ST', introducedIn: 'v1.3.0', userMessageKey: 'err.auth.totp_replay', usage30d: 2, eventCount: 2, createdAt: '2024-04-01', updatedAt: '2025-07-01' },
  // CARRIER
  { errorCode: 'VLT-TEC-CARRIER-0001', errorClass: 'Technical', domain: 'CARRIER', defaultSeverity: 'FATAL', description: 'Carrier API gateway timeout — no ACK within SLA', isRetriable: true, circuitBreaker: true, maxRetries: 5, backoffStrategy: 'exponential', escalationPath: 'L1 → Carrier Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.0.0', userMessageKey: 'err.carrier.timeout', usage30d: 42, eventCount: 42, createdAt: '2024-01-15', updatedAt: '2025-06-30' },
  { errorCode: 'VLT-TEC-CARRIER-0002', errorClass: 'Technical', domain: 'CARRIER', defaultSeverity: 'ERROR', description: 'Carrier confirmation webhook missing after timeout', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'L1 → Carrier Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.1.0', userMessageKey: 'err.carrier.webhook_missing', usage30d: 18, eventCount: 18, createdAt: '2024-02-01', updatedAt: '2025-05-15' },
  // MLOPS
  { errorCode: 'VLT-TEC-MLOPS-0022', errorClass: 'Technical', domain: 'MLOPS', defaultSeverity: 'ERROR', description: 'ML model artifact checksum mismatch — rollback triggered', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'MLOps → AI Platform', owner: 'AI Platform', ownerTeam: 'ai-platform', ownerInitials: 'AP', introducedIn: 'v2.0.0', userMessageKey: 'err.mlops.checksum_mismatch', usage30d: 3, eventCount: 3, createdAt: '2024-09-01', updatedAt: '2025-07-01' },
  { errorCode: 'VLT-TEC-MLOPS-0031', errorClass: 'Technical', domain: 'MLOPS', defaultSeverity: 'INFO', description: 'Model promotion gate failed shadow test — accuracy below threshold', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'AI Platform', owner: 'AI Platform', ownerTeam: 'ai-platform', ownerInitials: 'AP', introducedIn: 'v2.1.0', userMessageKey: 'err.mlops.shadow_test_failed', usage30d: 1, eventCount: 1, createdAt: '2024-11-01', updatedAt: '2025-07-01' },
  // NOTIFY
  { errorCode: 'VLT-TEC-NOTIFY-0009', errorClass: 'Technical', domain: 'NOTIFY', defaultSeverity: 'WARN', description: 'SendGrid SMTP bounce — invalid MX record', isRetriable: true, circuitBreaker: false, maxRetries: 3, backoffStrategy: 'fixed', escalationPath: 'Comms Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.1.0', userMessageKey: 'err.notify.smtp_bounce', usage30d: 27, eventCount: 27, createdAt: '2024-02-01', updatedAt: '2025-06-12' },
  // DOC
  { errorCode: 'VLT-TEC-DOC-0018', errorClass: 'Technical', domain: 'DOC', defaultSeverity: 'ERROR', description: 'PDF render service OOMKilled', isRetriable: true, circuitBreaker: true, maxRetries: 5, backoffStrategy: 'exponential', escalationPath: 'Platform Ops', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v1.4.0', userMessageKey: 'err.doc.render_oom', usage30d: 12, eventCount: 12, createdAt: '2024-06-01', updatedAt: '2025-07-03' },
  // VESSEL
  { errorCode: 'VLT-FNC-VESSEL-0008', errorClass: 'Functional', domain: 'VESSEL', defaultSeverity: 'WARN', description: 'Port API 503 — maintenance or overload', isRetriable: true, circuitBreaker: true, maxRetries: 8, backoffStrategy: 'exponential', escalationPath: 'Port Liaison', owner: 'Vessel Ops', ownerTeam: 'vessel-ops', ownerInitials: 'VO', introducedIn: 'v1.2.0', userMessageKey: 'err.vessel.port_unavailable', usage30d: 22, eventCount: 22, createdAt: '2024-03-01', updatedAt: '2025-06-14' },
  // PAYMENT
  { errorCode: 'VLT-FNC-PAYMENT-0005', errorClass: 'Functional', domain: 'PAYMENT', defaultSeverity: 'ERROR', description: 'Stripe charge declined — non-retriable card error', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Finance Ops', owner: 'Payments Team', ownerTeam: 'payments', ownerInitials: 'PT', introducedIn: 'v1.0.0', userMessageKey: 'err.payment.declined', usage30d: 31, eventCount: 31, createdAt: '2024-01-01', updatedAt: '2025-07-02' },
  { errorCode: 'VLT-FNC-PAYMENT-0012', errorClass: 'Functional', domain: 'PAYMENT', defaultSeverity: 'WARN', description: 'Duplicate payment detected — idempotency key collision', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Finance Ops', owner: 'Payments Team', ownerTeam: 'payments', ownerInitials: 'PT', introducedIn: 'v1.2.0', userMessageKey: 'err.payment.duplicate', usage30d: 4, eventCount: 4, createdAt: '2024-03-01', updatedAt: '2025-06-20' },
  // RATE
  { errorCode: 'VLT-FNC-RATE-0012', errorClass: 'Functional', domain: 'RATE', defaultSeverity: 'WARN', description: 'Fuel-surcharge table freshness SLA violation', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Rate Ops → Finance', owner: 'Rate Team', ownerTeam: 'rate-team', ownerInitials: 'RT', introducedIn: 'v1.1.0', userMessageKey: 'err.rate.surcharge_stale', usage30d: 9, eventCount: 9, createdAt: '2024-02-01', updatedAt: '2025-06-28' },
  // UNK
  { errorCode: 'VLT-UNK-UNK-0001', errorClass: 'Technical', domain: 'UNK', defaultSeverity: 'ERROR', description: 'Unclassified error — no matching VLT code found', isRetriable: false, circuitBreaker: false, maxRetries: 0, backoffStrategy: 'none', escalationPath: 'Migration Task Force', owner: 'Platform Engineering', ownerTeam: 'platform', ownerInitials: 'PE', introducedIn: 'v0.9.0', userMessageKey: 'err.unk.unclassified', usage30d: 147, eventCount: 147, createdAt: '2023-06-01', updatedAt: '2025-07-06', deprecatedIn: undefined },
]

// ─── Log Level Elevations ─────────────────────────────────────────────────────

export type ElevationScope = { env: string; cluster?: string; service?: string; instance?: string; category?: string; tenantId?: string }
export type ElevationStatus = 'active' | 'expired' | 'reverted'

export interface ElevationRecord {
  id:          string
  scope:       ElevationScope
  targetLevel: 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'
  sampleRate:  number
  ttlMinutes:  number
  reason:      string
  createdBy:   string
  createdAt:   string
  expiresAt:   string
  status:      ElevationStatus
  revertedAt?: string
  revertedBy?: string
  revertType?: 'auto' | 'manual'
}

export const elevations: ElevationRecord[] = [
  {
    id: 'elv-001',
    scope: { env: 'prod', service: 'ShipmentOrchestrator', category: 'voltus.action.carrier', tenantId: 'tnt-001' },
    targetLevel: 'DEBUG', sampleRate: 10, ttlMinutes: 60,
    reason: 'INC-2214: carrier connector timeouts on document sync — need request/response trace',
    createdBy: 'Jhansi M', createdAt: '2025-07-06T08:00:00Z',
    expiresAt: '2025-07-06T09:00:00Z', status: 'active',
  },
  {
    id: 'elv-002',
    scope: { env: 'prod', service: 'FreightLedger', category: 'voltus.repository.postgres' },
    targetLevel: 'DEBUG', sampleRate: 100, ttlMinutes: 120,
    reason: 'INC-2198: slow query investigation on shipment_events table',
    createdBy: 'Arjun K', createdAt: '2025-07-06T07:00:00Z',
    expiresAt: '2025-07-06T09:00:00Z', status: 'active',
  },
  {
    id: 'elv-003',
    scope: { env: 'prod', service: 'AIRatePredictor', category: 'voltus.ai.llm' },
    targetLevel: 'TRACE', sampleRate: 5, ttlMinutes: 30,
    reason: 'INC-2221: LLM response schema mismatch causing JSON parse failures',
    createdBy: 'Ravi P', createdAt: '2025-07-06T09:00:00Z',
    expiresAt: '2025-07-06T09:30:00Z', status: 'active',
  },
  {
    id: 'elv-004',
    scope: { env: 'prod', service: 'AuthService', category: 'voltus.security.auth' },
    targetLevel: 'INFO', sampleRate: 100, ttlMinutes: 240,
    reason: 'INC-2209: audit trail gap — elevating to INFO for auth events',
    createdBy: 'Meera S', createdAt: '2025-07-06T06:00:00Z',
    expiresAt: '2025-07-06T10:00:00Z', status: 'expired',
    revertedAt: '2025-07-06T10:00:01Z', revertType: 'auto',
  },
  {
    id: 'elv-005',
    scope: { env: 'qa', service: 'WorkflowEngine', category: 'voltus.workflow.saga' },
    targetLevel: 'TRACE', sampleRate: 100, ttlMinutes: 480,
    reason: 'QA-441: saga compensation flow debugging — no TTL restriction in QA',
    createdBy: 'Arjun K', createdAt: '2025-07-06T05:00:00Z',
    expiresAt: '2025-07-06T13:00:00Z', status: 'active',
  },
]

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export interface AlertRule {
  id:           string
  name:         string
  condition:    string
  severity:     Severity
  channel:      'pagerduty' | 'slack' | 'email'
  dedupKey?:    string
  enabled:      boolean
  tenantScoped: boolean
  triggeredAt?: string
  ackBy?:       string
  ackAt?:       string
  snoozeUntil?: string
  stormCount?:  number
}

export const alertRules: AlertRule[] = [
  { id: 'alr-001', name: 'Any FATAL error', condition: 'severity = FATAL', severity: 'FATAL', channel: 'pagerduty', dedupKey: 'fatal-{code}-{source}', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T03:14:22Z', stormCount: 1 },
  { id: 'alr-002', name: 'ERROR rate > 1% per service', condition: 'error_rate(5m) > 0.01 per service', severity: 'ERROR', channel: 'pagerduty', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T09:52:01Z' },
  { id: 'alr-003', name: 'DLQ depth > 0', condition: 'dlq_depth > 0', severity: 'WARN', channel: 'slack', enabled: true, tenantScoped: true, triggeredAt: '2025-07-06T03:24:22Z', stormCount: 8 },
  { id: 'alr-004', name: 'Outbox dead rows > 0 (VLT-TEC-BUS-0002)', condition: 'outbox_dead_rows > 0', severity: 'FATAL', channel: 'pagerduty', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T09:50:15Z' },
  { id: 'alr-005', name: 'Circuit breaker open > 10 min', condition: 'cb_state = open AND duration > 600s', severity: 'ERROR', channel: 'pagerduty', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T03:24:22Z' },
  { id: 'alr-006', name: 'Cross-tenant access attempt (VLT-FUN-AUT-0009)', condition: 'error_code = VLT-FUN-AUT-0009', severity: 'ERROR', channel: 'slack', dedupKey: 'security-cross-tenant', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T09:35:47Z' },
  { id: 'alr-007', name: 'MTTR > 15 min', condition: 'mttr_seconds > 900', severity: 'WARN', channel: 'email', enabled: true, tenantScoped: false },
  { id: 'alr-008', name: 'UNK error rate > 0', condition: 'error_code LIKE VLT-UNK-%', severity: 'WARN', channel: 'slack', enabled: true, tenantScoped: false, triggeredAt: '2025-07-06T08:00:00Z' },
]

// ─── Migration Modules ────────────────────────────────────────────────────────

export type MigrationPhase = 'E0' | 'E1' | 'E2' | 'E3' | 'E4'
export type ModuleStatus   = 'not-started' | 'in-progress' | 'migrated' | 'blocked'

export interface MigrationModule {
  id:              string
  name:            string
  service:         string
  owner:           string
  ownerInitials:   string
  phase:           MigrationPhase
  status:          ModuleStatus
  unkRate:         number     // percent
  unkZeroDays:     number     // consecutive days at zero
  emptyCatches:    number
  consoleLogs:     number
  adhocRetries:    number
  lintPassing:     boolean
  dualWriteDrift:  'clean' | 'drift' | 'pending'
  readSwitch:      'off' | 'shadow' | 'on'
  ownerSignOff:    boolean
  dod: {
    allThrowsClassified:  boolean
    noEmptyCatch:         boolean
    noConsoleErrors:      boolean
    noAdhocRetry:         boolean
    businessAsOutcomes:   boolean
    i18nKeysExist:        boolean
    tenancyCausationOk:   boolean
    legacyReadSwitched:   boolean
    ownerSignedOff:       boolean
  }
}

export const migrationModules: MigrationModule[] = [
  {
    id: 'mod-001', name: 'CarrierAllocationHandler', service: 'ShipmentOrchestrator',
    owner: 'Arjun K', ownerInitials: 'AK', phase: 'E3', status: 'migrated',
    unkRate: 0, unkZeroDays: 14, emptyCatches: 0, consoleLogs: 0, adhocRetries: 0,
    lintPassing: true, dualWriteDrift: 'clean', readSwitch: 'on', ownerSignOff: true,
    dod: { allThrowsClassified: true, noEmptyCatch: true, noConsoleErrors: true, noAdhocRetry: true, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: true, legacyReadSwitched: true, ownerSignedOff: true },
  },
  {
    id: 'mod-002', name: 'PaymentChargeAction', service: 'PaymentGateway',
    owner: 'Jhansi M', ownerInitials: 'JM', phase: 'E3', status: 'migrated',
    unkRate: 0, unkZeroDays: 9, emptyCatches: 0, consoleLogs: 0, adhocRetries: 0,
    lintPassing: true, dualWriteDrift: 'clean', readSwitch: 'on', ownerSignOff: true,
    dod: { allThrowsClassified: true, noEmptyCatch: true, noConsoleErrors: true, noAdhocRetry: true, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: true, legacyReadSwitched: true, ownerSignedOff: true },
  },
  {
    id: 'mod-003', name: 'DocumentRenderSkill', service: 'DocumentService',
    owner: 'Meera S', ownerInitials: 'MS', phase: 'E2', status: 'in-progress',
    unkRate: 3.2, unkZeroDays: 0, emptyCatches: 2, consoleLogs: 5, adhocRetries: 1,
    lintPassing: false, dualWriteDrift: 'drift', readSwitch: 'shadow', ownerSignOff: false,
    dod: { allThrowsClassified: false, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: false, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: true, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-004', name: 'CustomsHSCodeSkill', service: 'CustomsClearance',
    owner: 'Ravi P', ownerInitials: 'RP', phase: 'E2', status: 'in-progress',
    unkRate: 1.1, unkZeroDays: 0, emptyCatches: 1, consoleLogs: 3, adhocRetries: 0,
    lintPassing: false, dualWriteDrift: 'pending', readSwitch: 'shadow', ownerSignOff: false,
    dod: { allThrowsClassified: true, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: true, businessAsOutcomes: false, i18nKeysExist: false, tenancyCausationOk: true, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-005', name: 'VesselSchedulerAdapter', service: 'VesselScheduler',
    owner: 'Arjun K', ownerInitials: 'AK', phase: 'E1', status: 'in-progress',
    unkRate: 8.7, unkZeroDays: 0, emptyCatches: 7, consoleLogs: 12, adhocRetries: 3,
    lintPassing: false, dualWriteDrift: 'pending', readSwitch: 'off', ownerSignOff: false,
    dod: { allThrowsClassified: false, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: false, businessAsOutcomes: false, i18nKeysExist: false, tenancyCausationOk: false, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-006', name: 'FreightLedgerRepository', service: 'FreightLedger',
    owner: 'Jhansi M', ownerInitials: 'JM', phase: 'E3', status: 'migrated',
    unkRate: 0, unkZeroDays: 21, emptyCatches: 0, consoleLogs: 0, adhocRetries: 0,
    lintPassing: true, dualWriteDrift: 'clean', readSwitch: 'on', ownerSignOff: true,
    dod: { allThrowsClassified: true, noEmptyCatch: true, noConsoleErrors: true, noAdhocRetry: true, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: true, legacyReadSwitched: true, ownerSignedOff: true },
  },
  {
    id: 'mod-007', name: 'RateEngineAdapter', service: 'RateEngine',
    owner: 'Meera S', ownerInitials: 'MS', phase: 'E1', status: 'not-started',
    unkRate: 14.2, unkZeroDays: 0, emptyCatches: 11, consoleLogs: 23, adhocRetries: 6,
    lintPassing: false, dualWriteDrift: 'pending', readSwitch: 'off', ownerSignOff: false,
    dod: { allThrowsClassified: false, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: false, businessAsOutcomes: false, i18nKeysExist: false, tenancyCausationOk: false, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-008', name: 'ERPSyncConnector', service: 'ERPConnector',
    owner: 'Ravi P', ownerInitials: 'RP', phase: 'E2', status: 'in-progress',
    unkRate: 2.4, unkZeroDays: 0, emptyCatches: 3, consoleLogs: 4, adhocRetries: 1,
    lintPassing: false, dualWriteDrift: 'drift', readSwitch: 'shadow', ownerSignOff: false,
    dod: { allThrowsClassified: false, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: false, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: false, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-009', name: 'SLAMonitorWorker', service: 'SLAMonitor',
    owner: 'Arjun K', ownerInitials: 'AK', phase: 'E0', status: 'not-started',
    unkRate: 22.1, unkZeroDays: 0, emptyCatches: 18, consoleLogs: 31, adhocRetries: 9,
    lintPassing: false, dualWriteDrift: 'pending', readSwitch: 'off', ownerSignOff: false,
    dod: { allThrowsClassified: false, noEmptyCatch: false, noConsoleErrors: false, noAdhocRetry: false, businessAsOutcomes: false, i18nKeysExist: false, tenancyCausationOk: false, legacyReadSwitched: false, ownerSignedOff: false },
  },
  {
    id: 'mod-010', name: 'AIRateAdvisorSkill', service: 'AIRatePredictor',
    owner: 'Jhansi M', ownerInitials: 'JM', phase: 'E3', status: 'in-progress',
    unkRate: 0.5, unkZeroDays: 3, emptyCatches: 0, consoleLogs: 1, adhocRetries: 0,
    lintPassing: true, dualWriteDrift: 'clean', readSwitch: 'shadow', ownerSignOff: false,
    dod: { allThrowsClassified: true, noEmptyCatch: true, noConsoleErrors: false, noAdhocRetry: true, businessAsOutcomes: true, i18nKeysExist: true, tenancyCausationOk: true, legacyReadSwitched: true, ownerSignedOff: false },
  },
]

// ─── UNK burn-down buckets ────────────────────────────────────────────────────
export interface UnkBucket { date: string; unk: number; total: number }
export const unkTrend: UnkBucket[] = [
  { date: '2025-06-01', unk: 812, total: 3100 },
  { date: '2025-06-08', unk: 694, total: 3050 },
  { date: '2025-06-15', unk: 521, total: 3010 },
  { date: '2025-06-22', unk: 388, total: 2980 },
  { date: '2025-06-29', unk: 247, total: 2920 },
  { date: '2025-07-06', unk: 147, total: 2850 },
]

// ─── Extended log entries with correlation IDs matching errors ────────────────
export const logsExtended: LogEntry[] = [
  ...logs,
  { id: 'log-ext-001', level: 'INFO',  category: 'voltus.action.carrier',     service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', message: 'Starting carrier allocation for SHP-20441',                     ts: '2025-07-06T03:14:20Z', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'log-ext-002', level: 'WARN',  category: 'voltus.adapter.carrier',     service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', message: 'Carrier API attempt 1/5 timeout after 30s',                     ts: '2025-07-06T03:14:52Z', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'log-ext-003', level: 'WARN',  category: 'voltus.adapter.carrier',     service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', message: 'Carrier API attempt 2/5 timeout after 30s',                     ts: '2025-07-06T03:15:30Z', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'log-ext-004', level: 'ERROR', category: 'voltus.circuit-breaker',     service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', message: 'Circuit breaker carrier-gw tripped OPEN — 5 failures',          ts: '2025-07-06T03:18:05Z', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'log-ext-005', level: 'FATAL', category: 'voltus.action.carrier',      service: 'ShipmentOrchestrator', correlationId: 'cid-freight-8a3f2e', message: 'Carrier allocation failed — all retries exhausted, moving to DLQ', ts: '2025-07-06T03:24:22Z', tenantId: 'tnt-001', tenant: 'Gulf Cargo LLC' },
  { id: 'log-ext-006', level: 'DEBUG', category: 'voltus.repository.postgres',  service: 'FreightLedger',        correlationId: 'cid-freight-5c4d2e', message: 'Query shipment_events idx plan: SeqScan (18M rows)',             ts: '2025-07-06T07:04:00Z', tenantId: 'tnt-002', tenant: 'Horizon Shipping' },
  { id: 'log-ext-007', level: 'WARN',  category: 'voltus.repository.postgres',  service: 'FreightLedger',        correlationId: 'cid-freight-5c4d2e', message: 'Query timeout 5042ms exceeds threshold 5000ms',                  ts: '2025-07-06T07:04:01Z', tenantId: 'tnt-002', tenant: 'Horizon Shipping' },
  { id: 'log-ext-008', level: 'INFO',  category: 'voltus.ai.llm',              service: 'AIRatePredictor',       correlationId: 'cid-freight-llm1',  message: 'Calling gpt-4o for demand forecast — tenant tnt-002',           ts: '2025-07-06T09:17:00Z', tenantId: 'tnt-002', tenant: 'Horizon Shipping' },
  { id: 'log-ext-009', level: 'WARN',  category: 'voltus.ai.llm',              service: 'AIRatePredictor',       correlationId: 'cid-freight-llm1',  message: 'OpenAI 429: Retry-After 45s — backing off',                     ts: '2025-07-06T09:17:02Z', tenantId: 'tnt-002', tenant: 'Horizon Shipping' },
  { id: 'log-ext-010', level: 'INFO',  category: 'voltus.action.auth',         service: 'AuthService',           correlationId: 'cid-freight-aut9',  message: 'Resource authorization check for SHP-20449 by tnt-004',         ts: '2025-07-06T09:35:45Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'log-ext-011', level: 'ERROR', category: 'voltus.security.rbac',       service: 'AuthService',           correlationId: 'cid-freight-aut9',  message: 'Cross-tenant access blocked: tnt-004 -> SHP-20449 (tnt-001)',   ts: '2025-07-06T09:35:47Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'log-ext-012', level: 'INFO',  category: 'voltus.workflow.booking',    service: 'WorkflowEngine',        correlationId: 'cid-freight-flw7',  message: 'Booking WF-BOOKING-4512 entered awaiting_carrier_confirm step', ts: '2025-07-06T08:22:00Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'log-ext-013', level: 'WARN',  category: 'voltus.workflow.booking',    service: 'WorkflowEngine',        correlationId: 'cid-freight-flw7',  message: 'WF-BOOKING-4512 stuck 2h in awaiting_carrier_confirm — timeout guard firing', ts: '2025-07-06T10:22:00Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'log-ext-014', level: 'DEBUG', category: 'voltus.adapter.payment',     service: 'PaymentGateway',        correlationId: 'cid-freight-1a6b3c', message: 'Charging INV-88721 via Stripe — amount AED 12,400',            ts: '2025-07-06T06:55:10Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
  { id: 'log-ext-015', level: 'ERROR', category: 'voltus.adapter.payment',     service: 'PaymentGateway',        correlationId: 'cid-freight-1a6b3c', message: 'Stripe declined INV-88721: insufficient_funds — non-retriable', ts: '2025-07-06T06:55:18Z', tenantId: 'tnt-004', tenant: 'Triton Freight' },
]

// ─── Business Exception routing (PRD §4.3 · §17.1 `actions` affordance) ───────
// A Business error is a domain decision, not a crash: it must name the owning
// Service Role, resolve the concrete approver via a Pairing Rule, carry a
// next-step action (so the UI renders a path, not a dead end), and — where a
// side-effect committed upstream — name its compensating Task (FR-E9).

export interface BusinessAction {
  key:         string
  label:       string
  serviceRole: string
}

export interface BusinessDecision {
  rule:             string          // the domain rule that blocked the outcome
  serviceRole:      string          // owning Service Role (who resolves it)
  approver:         string          // concrete person resolved via Pairing Rule
  approverInitials: string
  backup:           string          // backup assignee (Pairing Rule fallback)
  actions:          BusinessAction[] // §17.1 — rendered as buttons
  compensation:     string | null   // named compensating Task, or null
  decision:         'pending' | 'approved' | 'rejected'
}

// domain → owning Service Role, resolved approver (Pairing Rule), rule phrasing,
// and compensating Task. Keyed by the business domain token in the error code.
const BUSINESS_ROLE_MAP: Record<string, {
  role: string; approver: string; initials: string; backup: string; rule: string; compensation: string | null
}> = {
  FIN:        { role: 'Credit Controller',  approver: 'Carol D',  initials: 'CD', backup: 'Indaka P', rule: 'Credit / finance rule blocked the outcome',      compensation: 'Reverse provisional ledger posting' },
  INVOICE:    { role: 'Finance Approver',   approver: 'Arjun K',  initials: 'AK', backup: 'Carol D',  rule: 'Invoicing rule requires human review',           compensation: null },
  CUSTOMS:    { role: 'Customs Specialist', approver: 'Meera S',  initials: 'MS', backup: 'Jhansi M', rule: 'Customs / tariff rule held the shipment',        compensation: 'Release customs hold on re-submission' },
  COMPLIANCE: { role: 'Compliance Officer', approver: 'Jhansi M', initials: 'JM', backup: 'Ravi P',   rule: 'Compliance rule blocked the operation',          compensation: 'Lift compliance block after re-declaration' },
  SLA:        { role: 'SLA Manager',        approver: 'Ravi P',   initials: 'RP', backup: 'Arjun K',  rule: 'SLA threshold breached — escalation required',   compensation: null },
  FRT:        { role: 'Freight Ops Lead',   approver: 'Vishnu R', initials: 'VR', backup: 'Meera S',  rule: 'Freight capacity / routing rule triggered',      compensation: 'Re-route to alternate lane' },
}

export function resolveBusinessDecision(evt: {
  errorClass: ErrorClass; domain: string; status: LifecycleStatus
}): BusinessDecision | null {
  if (evt.errorClass !== 'Business') return null
  const m = BUSINESS_ROLE_MAP[evt.domain] ?? {
    role: 'Domain Owner', approver: 'Ops Lead', initials: 'OL', backup: 'On-Call', rule: 'Domain rule blocked the outcome', compensation: null,
  }
  return {
    rule: m.rule,
    serviceRole: m.role,
    approver: m.approver,
    approverInitials: m.initials,
    backup: m.backup,
    actions: [
      { key: 'request_approval', label: `Request approval from ${m.role}`, serviceRole: m.role },
      { key: 'reassign_backup',  label: `Reassign to backup (${m.backup})`, serviceRole: m.role },
    ],
    compensation: m.compensation,
    decision: evt.status === 'resolved' ? 'approved' : evt.status === 'discarded' ? 'rejected' : 'pending',
  }
}

// ─── Class-driven retry policy (PRD Principle 4 · §15.1 — one policy table) ────
// Policy is a function of the error CLASS, not hand-written per call-site.
// A code MAY override the class default; the UI marks overrides explicitly.

export interface RetryPolicy {
  retryable:       boolean
  maxRetries:      number
  backoffStrategy: 'exponential' | 'fixed' | 'none'
  circuitBreaker:  boolean
}

export const CLASS_POLICY: Record<ErrorClass, RetryPolicy> = {
  Technical:  { retryable: true,  maxRetries: 5, backoffStrategy: 'exponential', circuitBreaker: true  },
  Functional: { retryable: false, maxRetries: 0, backoffStrategy: 'none',        circuitBreaker: false },
  Business:   { retryable: false, maxRetries: 0, backoffStrategy: 'none',        circuitBreaker: false },
}

export interface EffectivePolicy extends RetryPolicy {
  source:    'class-default' | 'code-override'
  overrides: string[]   // which fields diverge from the class default
}

export function effectivePolicy(entry: {
  errorClass: ErrorClass; isRetriable: boolean; maxRetries: number
  backoffStrategy: 'exponential' | 'fixed' | 'none'; circuitBreaker: boolean
}): EffectivePolicy {
  const base = CLASS_POLICY[entry.errorClass]
  const overrides: string[] = []
  if (entry.isRetriable     !== base.retryable)       overrides.push('retryable')
  if (entry.maxRetries      !== base.maxRetries)      overrides.push('maxRetries')
  if (entry.backoffStrategy !== base.backoffStrategy) overrides.push('backoff')
  if (entry.circuitBreaker  !== base.circuitBreaker)  overrides.push('circuitBreaker')
  return {
    retryable: entry.isRetriable, maxRetries: entry.maxRetries,
    backoffStrategy: entry.backoffStrategy, circuitBreaker: entry.circuitBreaker,
    source: overrides.length ? 'code-override' : 'class-default',
    overrides,
  }
}

// ─── Convenience re-exports (backward compat with existing pages) ─────────────

export { errors as errorEvents }

export type { ErrorClass as ErrorClassType }
