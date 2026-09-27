import * as Cesium from 'cesium'

const API_URL =
  import.meta.env.VITE_API_URL

export async function loadGliderTracks(viewer, entitiesRef, onSelect) {
  console.log('🚨 GLIDER FUNCTION CALLED')
  const res = await fetch(`${API_URL}/gliders`)
  const gliders = await res.json()

  gliders.forEach(g => {
    
    console.log('🚨 ADDING GLIDER:', g.id, g.last_lat, g.last_lon)
    if (!g.track || g.track.length < 2) return

    const positions = g.track.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat))

    const line = viewer.entities.add({
      polyline: {
        positions,
        width: 2,
        material: Cesium.Color.ORANGE.withAlpha(0.7),
      },
    })
    entitiesRef.current.push(line)

    const marker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(g.last_lon, g.last_lat),
      point: { pixelSize: 10, color: Cesium.Color.ORANGE, outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
      properties: { gliderId: g.id },
    })
    entitiesRef.current.push(marker)
  })

  viewer.screenSpaceEventHandler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position)
    if (Cesium.defined(picked) && picked.id?.properties?.gliderId) {
      onSelect(picked.id.properties.gliderId.getValue())
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    45.35,
    -12.85,
    2000000
  ),
  duration: 2,
})
}