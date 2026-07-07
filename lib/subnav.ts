export interface ParsedSubNavHref {
  path: string
  query: URLSearchParams
  hash: string
}

export function parseSubNavHref(href: string): ParsedSubNavHref {
  const hashIdx = href.indexOf('#')
  const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href
  const hash = hashIdx >= 0 ? href.slice(hashIdx + 1) : ''
  const queryIdx = withoutHash.indexOf('?')
  const path = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash
  const queryStr = queryIdx >= 0 ? withoutHash.slice(queryIdx + 1) : ''
  return { path, query: new URLSearchParams(queryStr), hash }
}

export function isSubNavActive(
  pathname: string,
  currentSearch: URLSearchParams,
  currentHash: string,
  itemHref: string,
): boolean {
  const { path, query: itemQuery, hash: itemHash } = parseSubNavHref(itemHref)
  const normHash = currentHash.replace(/^#/, '')

  if (pathname !== path && !pathname.startsWith(path + '/')) return false

  if (itemHash) {
    if (path === '/overview' && itemHash === 'dashboard' && !normHash) return true
    if (itemQuery.toString() === '') return normHash === itemHash
  }

  if (itemQuery.toString() !== '') {
    for (const [key, val] of itemQuery.entries()) {
      if (currentSearch.get(key) !== val) return false
    }
    return true
  }

  if (path === '/overview') return !normHash || normHash === 'dashboard'
  if (path === '/registry') return pathname === '/registry' && currentSearch.toString() === ''

  return pathname === path && currentSearch.toString() === ''
}
