import { registryFull, type RegistryEntryFull } from '@/mock'

const STORAGE_KEY = 'voltus-registry-overrides'

interface RegistryOverrides {
  added: RegistryEntryFull[]
  updated: Record<string, Partial<RegistryEntryFull>>
  deprecated: string[]
}

function emptyOverrides(): RegistryOverrides {
  return { added: [], updated: {}, deprecated: [] }
}

function loadOverrides(): RegistryOverrides {
  if (typeof window === 'undefined') return emptyOverrides()
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyOverrides(), ...JSON.parse(raw) } : emptyOverrides()
  } catch {
    return emptyOverrides()
  }
}

function saveOverrides(o: RegistryOverrides) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(o))
}

export function getRegistryEntries(): RegistryEntryFull[] {
  const o = loadOverrides()
  const base = registryFull.map(e => {
    let entry = { ...e }
    if (o.updated[e.errorCode]) entry = { ...entry, ...o.updated[e.errorCode] }
    if (o.deprecated.includes(e.errorCode) && !entry.deprecatedIn) {
      entry = { ...entry, deprecatedIn: 'v2025-Q4' }
    }
    return entry
  })
  return [...base, ...o.added]
}

export function addRegistryEntry(entry: RegistryEntryFull) {
  const o = loadOverrides()
  o.added.push(entry)
  saveOverrides(o)
}

export function updateRegistryEntry(code: string, data: Partial<RegistryEntryFull>) {
  const o = loadOverrides()
  const idx = o.added.findIndex(e => e.errorCode === code)
  if (idx >= 0) {
    o.added[idx] = { ...o.added[idx], ...data }
  } else {
    o.updated[code] = { ...o.updated[code], ...data }
  }
  saveOverrides(o)
}

export function deprecateRegistryEntry(code: string) {
  const o = loadOverrides()
  if (!o.deprecated.includes(code)) o.deprecated.push(code)
  const added = o.added.find(e => e.errorCode === code)
  if (added) added.deprecatedIn = 'v2025-Q4'
  saveOverrides(o)
}

export function buildRegistryEntry(
  data: Partial<RegistryEntryFull>,
  allEntries: RegistryEntryFull[],
): RegistryEntryFull {
  const classPrefix = data.errorClass === 'Technical' ? 'TEC' : data.errorClass === 'Functional' ? 'FUN' : 'BUS'
  const existing = allEntries
    .filter(r => r.domain === data.domain && r.errorClass === data.errorClass)
    .map(r => parseInt(r.errorCode.split('-').pop() ?? '0', 10))
  const next = String((existing.length > 0 ? Math.max(...existing) : 0) + 1).padStart(4, '0')

  return {
    errorCode: `VLT-${classPrefix}-${data.domain}-${next}`,
    errorClass: data.errorClass!,
    domain: data.domain!,
    defaultSeverity: data.defaultSeverity ?? 'ERROR',
    description: data.description ?? '',
    isRetriable: data.isRetriable ?? false,
    circuitBreaker: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    escalationPath: '—',
    owner: data.ownerTeam ?? '',
    ownerTeam: data.ownerTeam ?? '',
    ownerInitials: (data.ownerTeam ?? 'XX').slice(0, 2).toUpperCase(),
    introducedIn: data.introducedIn ?? 'v2025-Q3',
    userMessageKey: data.userMessageKey ?? '',
    usage30d: 0,
    eventCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
