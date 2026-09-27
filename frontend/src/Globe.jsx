
import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

Cesium.Ion.defaultAccessToken =
  import.meta.env.VITE_CESIUM_TOKEN


function Globe({ onReady }) {

  const containerRef = useRef(null)


  useEffect(() => {

    const viewer =
      new Cesium.Viewer(
        containerRef.current,
        {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,

          terrain:
            Cesium.Terrain.fromWorldBathymetry(),
        }
      )


    // ----------------------------------------------------------
    // SCENE SETTINGS
    // ----------------------------------------------------------

    viewer.scene.backgroundColor =
      Cesium.Color.BLACK

    viewer.scene.skyAtmosphere.show =
      true

    viewer.scene.globe.enableLighting =
      true

    viewer.scene.globe.showGroundAtmosphere =
      true


    // ----------------------------------------------------------
    // INITIAL CAMERA
    // ----------------------------------------------------------

    viewer.camera.setView({

      destination:
        Cesium.Cartesian3.fromDegrees(
          80,
          10,
          28000000
        ),

    })


    // ----------------------------------------------------------
    // SEND VIEWER TO APP
    // ----------------------------------------------------------

    onReady?.(viewer)


    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {

      if (!viewer.isDestroyed()) {

        viewer.destroy()

      }

    }

  }, [])


  return (

    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
      }}
    />

  )

}


export default Globe
