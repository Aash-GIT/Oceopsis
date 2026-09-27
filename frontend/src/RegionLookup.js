// Loads world_states.geojson once and does point-in-polygon lookups
// entirely in plain JS. Never touches Cesium — no entities, no rendering.

let regions = null
let loadingPromise = null

function pointInRing(lon, lat, ring) {
  // standard ray-casting point-in-polygon test
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygonFeature(lon, lat, geometry) {
  if (geometry.type === 'Polygon') {
    // first ring = outer boundary, rest = holes
    if (!pointInRing(lon, lat, geometry.coordinates[0])) return false
    for (let k = 1; k < geometry.coordinates.length; k++) {
      if (pointInRing(lon, lat, geometry.coordinates[k])) return false // inside a hole
    }
    return true
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => {
      if (!pointInRing(lon, lat, poly[0])) return false
      for (let k = 1; k < poly.length; k++) {
        if (pointInRing(lon, lat, poly[k])) return false
      }
      return true
    })
  }
  return false
}

export async function loadRegions() {
  if (regions) return regions
  if (loadingPromise) return loadingPromise

  loadingPromise = fetch('/world_states.geojson')
    .then(res => res.json())
    .then(geojson => {
      regions = geojson.features.map(f => ({
        name: f.properties.name,
        admin: f.properties.admin,
        geometry: f.geometry,
      }))
      console.log(`Loaded ${regions.length} regions for hover lookup`)
      return regions
    })

  return loadingPromise
}

export function findRegion(lon, lat) {
  if (!regions) return null
  for (const r of regions) {
    if (pointInPolygonFeature(lon, lat, r.geometry)) {
      return { name: r.name, admin: r.admin }
    }
  }
  return null
}