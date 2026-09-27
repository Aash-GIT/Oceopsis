import * as Cesium from 'cesium'

const API_URL =
  import.meta.env.VITE_API_URL

const CATEGORY_COLORS = {
  depression: Cesium.Color.YELLOW,
  storm: Cesium.Color.ORANGE,
  cyclone: Cesium.Color.RED,
  severe: Cesium.Color.MAGENTA,
  unknown: Cesium.Color.GRAY,
}

export async function loadCycloneTrack(viewer, entitiesRef, sid) {
  const res = await fetch(`${API_URL}/cyclones/${sid}/track`)
  const { points } = await res.json()
  if (!points.length) return

  const positions = points.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat))

  const line = viewer.entities.add({
    polyline: { positions, width: 3, material: Cesium.Color.WHITE.withAlpha(0.6) },
  })
  entitiesRef.current.push(line)

  points.forEach(p => {
    const dot = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
      point: { pixelSize: 8, color: CATEGORY_COLORS[p.category] ?? Cesium.Color.GRAY },
      description: `${p.time} — ${p.wind ?? '?'} kt`,
    })
    entitiesRef.current.push(dot)
  })

  viewer.flyTo(entitiesRef.current, { duration: 2 })
}