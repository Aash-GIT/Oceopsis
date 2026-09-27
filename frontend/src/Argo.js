import * as Cesium from 'cesium'

const API_URL =
  import.meta.env.VITE_API_URL

export async function loadArgoPoints(viewer, entitiesRef, onSelect) {
  const res = await fetch(`${API_URL}/argo`)
  const floats = await res.json()

  floats.forEach(f => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat),
      point: {
        pixelSize: 10,
        color: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      },
      properties: { floatId: f.id },
    })
    entitiesRef.current.push(entity)
  })

  viewer.screenSpaceEventHandler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position)
    if (Cesium.defined(picked) && picked.id?.properties?.floatId) {
      onSelect(picked.id.properties.floatId.getValue())
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}