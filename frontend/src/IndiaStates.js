
import * as Cesium from 'cesium'

export async function loadIndiaStates() {
  const dataSource =
    await Cesium.GeoJsonDataSource.load(
      '/world_states.geojson'
    )

  // Hide all geometry.
  // We only use the Admin-1 entities as geographic data.
  dataSource.entities.values.forEach(entity => {
    if (entity.polygon) {
      entity.polygon.show = false
    }

    if (entity.polyline) {
      entity.polyline.show = false
    }
  })

  console.log(
    '🌍 World Admin-1 GeoJSON loaded:',
    dataSource.entities.values.length,
    'regions'
  )

  return dataSource
}

