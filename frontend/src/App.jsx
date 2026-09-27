
import {
  useState,
  useRef,
  useEffect
} from 'react'

import * as Cesium from 'cesium'

import Globe from './Globe'
import ControlPanel from './ControlPanel'

import { loadArgoPoints } from './Argo'
import { loadGliderTracks } from './Glider'
import { loadCycloneTrack } from './Cyclone'

import ProfileChart from './ProfileChart'
import ArgoInfoPanel from './ArgoInfoPanel'

import {
  loadRegions,
  findRegion
} from './RegionLookup'

import './landing.css'


const API_URL =
  import.meta.env.VITE_API_URL


// ============================================================
// OCEAN DATA RECTANGLE
// ============================================================

const RECT =
  Cesium.Rectangle.fromDegrees(
    51.17,
    5.75,
    100.33,
    25.42
  )


// ============================================================
// APP
// ============================================================

export default function App() {


  // ============================================================
  // GENERAL STATE
  // ============================================================

  const [loaded, setLoaded] =
    useState(false)

  const [timeDates, setTimeDates] =
    useState(null)

  const [coords, setCoords] =
    useState(null)


  // ============================================================
  // CESIUM REFERENCES
  // ============================================================

  const viewerRef =
    useRef(null)

  const currentLayerRef =
    useRef(null)

  const argoEntitiesRef =
    useRef([])

  const gliderEntitiesRef =
    useRef([])

  const cycloneEntitiesRef =
    useRef([])

  const spinRef =
    useRef(true)

  const lastLookupRef =
    useRef(0)

  // Debounce timer for depth/time slider
  const debounceTimerRef =
    useRef(null)


  // ============================================================
  // VIEW MODE
  // ============================================================

  const [viewMode, setViewMode] =
    useState('ocean')


  // ============================================================
  // OCEAN CONTROLS
  // ============================================================

  const [variable, setVariable] =
    useState('thetao')

  const [depthIdx, setDepthIdx] =
    useState(0)

  const [timeIdx, setTimeIdx] =
    useState(0)

  // Ocean explanation
  const [oceanExplain, setOceanExplain] =
    useState(null)


  // ============================================================
  // ARGO PROFILE STATE
  // ============================================================

  const [selectedFloat, setSelectedFloat] =
    useState(null)

  const [profile, setProfile] =
    useState(null)


  // ============================================================
  // GLIDER PROFILE STATE
  // ============================================================

  const [selectedGlider, setSelectedGlider] =
    useState(null)

  const [gliderProfile, setGliderProfile] =
    useState(null)


  // ============================================================
  // CYCLONE STATE
  // ============================================================

  const [cyclones, setCyclones] =
    useState([])

  const [selectedCyclone, setSelectedCyclone] =
    useState(null)

  const [cycloneExplain, setCycloneExplain] =
    useState(null)


  // ============================================================
  // FETCH REAL DATASET DATES
  // ============================================================

  useEffect(() => {

    fetch(
      `${API_URL}/times`
    )

      .then((response) => {

        if (!response.ok) {

          throw new Error(
            'Failed to fetch time data'
          )

        }

        return response.json()
      })

      .then((data) => {

        setTimeDates(
          data.time
        )

      })

      .catch((error) => {

        console.error(
          'Error fetching time data:',
          error
        )

      })

  }, [])


  // ============================================================
  // FETCH CYCLONE LIST
  // ============================================================

  useEffect(() => {

    fetch(
      `${API_URL}/cyclones`
    )

      .then((response) => {

        if (!response.ok) {

          throw new Error(
            `Failed to fetch cyclones: ${response.status}`
          )

        }

        return response.json()
      })

      .then((data) => {

        console.log(
          'Cyclones loaded:',
          data
        )

        setCyclones(data)

      })

      .catch((error) => {

        console.error(
          'Error loading cyclones:',
          error
        )

      })

  }, [])


  // ============================================================
  // OCEAN LAYER
  // ============================================================

  function updateLayer(
    v = variable,
    d = depthIdx,
    t = timeIdx
  ) {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    // ----------------------------------------------------------
    // Remove previous ocean layer
    // ----------------------------------------------------------

    if (
      currentLayerRef.current
    ) {

      viewer.imageryLayers.remove(
        currentLayerRef.current,
        true
      )

      currentLayerRef.current =
        null

    }


    // ----------------------------------------------------------
    // Build slice URL
    // ----------------------------------------------------------

    const url =
      `${API_URL}/slice` +
      `?variable=${encodeURIComponent(v)}` +
      `&depth_idx=${d}` +
      `&time_idx=${t}`


    console.log(
      `Loading ocean layer: ${v}, depth index: ${d}, time index: ${t}`
    )


    // ----------------------------------------------------------
    // Create imagery provider
    // ----------------------------------------------------------

    const provider =
      new Cesium.SingleTileImageryProvider({

        url,

        rectangle: RECT,

        tileWidth: 256,

        tileHeight: 256,

      })


    // ----------------------------------------------------------
    // Add imagery layer
    // ----------------------------------------------------------

    const layer =
      viewer.imageryLayers
        .addImageryProvider(
          provider
        )

    currentLayerRef.current =
      layer


    // ----------------------------------------------------------
    // Fetch ocean explanation
    // ----------------------------------------------------------

    fetch(
      `${API_URL}/slice/explain?variable=${encodeURIComponent(v)}&depth_idx=${d}&time_idx=${t}`
    )

      .then((response) => {

        if (!response.ok) {

          throw new Error(
            `Explanation request failed: ${response.status}`
          )

        }

        return response.json()

      })

      .then((data) => {

        console.log(
          'Ocean explanation:',
          data
        )

        setOceanExplain(data)

      })

      .catch((error) => {

        console.error(
          'Error fetching ocean explanation:',
          error
        )

      })

  }


  // ============================================================
  // CLEAR ARGO
  // ============================================================

  function clearArgo() {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    argoEntitiesRef.current.forEach(
      (entity) => {

        viewer.entities.remove(
          entity
        )

      }
    )


    argoEntitiesRef.current = []

  }


  // ============================================================
  // CLEAR GLIDER
  // ============================================================

  function clearGlider() {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    gliderEntitiesRef.current.forEach(
      (entity) => {

        viewer.entities.remove(
          entity
        )

      }
    )


    gliderEntitiesRef.current = []

  }


  // ============================================================
  // CLEAR CYCLONE
  // ============================================================

  function clearCyclone() {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    cycloneEntitiesRef.current.forEach(
      (entity) => {

        viewer.entities.remove(
          entity
        )

      }
    )


    cycloneEntitiesRef.current = []


    setSelectedCyclone(null)

    setCycloneExplain(null)

  }


  // ============================================================
  // LOAD ARGO
  // ============================================================

  async function loadArgo() {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    try {

      await loadArgoPoints(
        viewer,
        argoEntitiesRef,

        async (floatId) => {

          console.log(
            `Fetching profile for Argo observation ${floatId}`
          )


          setSelectedFloat(
            floatId
          )


          const response =
            await fetch(
              `${API_URL}/argo/${floatId}/profile`
            )


          if (!response.ok) {

            throw new Error(
              'Failed to fetch Argo profile'
            )

          }


          const data =
            await response.json()


          console.log(
            'Argo profile:',
            data
          )


          setProfile(data)

        }
      )

    }

    catch (error) {

      console.error(
        'Error loading Argo:',
        error
      )

    }

  }


  // ============================================================
  // LOAD GLIDER
  // ============================================================

  async function loadGlider() {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    try {

      await loadGliderTracks(
        viewer,
        gliderEntitiesRef,

        async (gliderId) => {

          console.log(
            `Fetching profile for glider ${gliderId}`
          )


          setSelectedGlider(
            gliderId
          )


          setGliderProfile(
            null
          )


          const response =
            await fetch(
              `${API_URL}/gliders/${gliderId}/profile`
            )


          if (!response.ok) {

            throw new Error(
              `Failed to fetch glider profile: ${response.status}`
            )

          }


          const data =
            await response.json()


          console.log(
            'Glider profile:',
            data
          )


          setGliderProfile(
            data
          )

        }
      )

    }

    catch (error) {

      console.error(
        'Error loading Glider:',
        error
      )

    }

  }


  // ============================================================
  // LOAD / SELECT CYCLONE
  // ============================================================

  async function selectCyclone(
    sid
  ) {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    clearCyclone()


    setSelectedCyclone(
      sid
    )


    try {

      console.log(
        `Loading cyclone: ${sid}`
      )


      await loadCycloneTrack(
        viewer,
        cycloneEntitiesRef,
        sid
      )


      const response =
        await fetch(
          `${API_URL}/cyclones/${sid}/explain`
        )


      if (!response.ok) {

        throw new Error(
          `Failed to load cyclone explanation: ${response.status}`
        )

      }


      const data =
        await response.json()


      console.log(
        'Cyclone explanation:',
        data
      )


      setCycloneExplain(
        data
      )

    }

    catch (error) {

      console.error(
        'Error loading cyclone:',
        error
      )

    }

  }


  // ============================================================
  // VIEW MODE SWITCHING
  // ============================================================

  function setMode(
    mode
  ) {

    const viewer =
      viewerRef.current

    if (!viewer) {
      return
    }


    console.log(
      `Switching view mode to: ${mode}`
    )


    setViewMode(
      mode
    )


    // ----------------------------------------------------------
    // Close Argo profile when leaving Argo
    // ----------------------------------------------------------

    if (mode !== 'argo') {

      setSelectedFloat(
        null
      )

      setProfile(
        null
      )

    }


    // ----------------------------------------------------------
    // Close Glider profile when leaving Glider
    // ----------------------------------------------------------

    if (mode !== 'glider') {

      setSelectedGlider(
        null
      )

      setGliderProfile(
        null
      )

    }


    // ----------------------------------------------------------
    // Close Cyclone when leaving Cyclone
    // ----------------------------------------------------------

    if (mode !== 'cyclone') {

      setSelectedCyclone(
        null
      )

      setCycloneExplain(
        null
      )

    }


    // ----------------------------------------------------------
    // Remove ocean imagery when leaving Ocean
    // ----------------------------------------------------------

    if (mode !== 'ocean') {

      if (
        currentLayerRef.current
      ) {

        viewer.imageryLayers.remove(
          currentLayerRef.current,
          true
        )

        currentLayerRef.current =
          null

      }

      // Clear ocean explanation
      setOceanExplain(
        null
      )

    }


    // ----------------------------------------------------------
    // Remove all overlays
    // ----------------------------------------------------------

    clearArgo()

    clearGlider()

    clearCyclone()


    // ----------------------------------------------------------
    // Load selected mode
    // ----------------------------------------------------------

    if (mode === 'ocean') {

      updateLayer()

    }


    if (mode === 'argo') {

      loadArgo()

    }


    if (mode === 'glider') {

      loadGlider()

    }


    if (mode === 'cyclone') {

      console.log(
        'Cyclone mode selected'
      )

    }

  }


  // ============================================================
  // CESIUM READY
  // ============================================================

  function handleReady(
    viewer
  ) {

    viewerRef.current =
      viewer


    // ----------------------------------------------------------
    // Load world regions in background
    // ----------------------------------------------------------

    loadRegions()
      .catch((error) => {

        console.error(
          'Region lookup loading failed:',
          error
        )

      })


    // ----------------------------------------------------------
    // Mouse coordinate + region handler
    // ----------------------------------------------------------

    const handler =
      new Cesium.ScreenSpaceEventHandler(
        viewer.scene.canvas
      )


    handler.setInputAction(
      (movement) => {

        const cartesian =
          viewer.camera.pickEllipsoid(
            movement.endPosition,
            viewer.scene.globe.ellipsoid
          )


        if (cartesian) {

          const cartographic =
            Cesium.Cartographic
              .fromCartesian(
                cartesian
              )


          const lat =
            Cesium.Math.toDegrees(
              cartographic.latitude
            )


          const lon =
            Cesium.Math.toDegrees(
              cartographic.longitude
            )


          const now =
            Date.now()


          let region =
            null


          // ----------------------------------------------------
          // Throttle region lookup
          // ----------------------------------------------------

          if (
            now -
              lastLookupRef.current >
              100
          ) {

            lastLookupRef.current =
              now

            region =
              findRegion(
                lon,
                lat
              )

          }


          setCoords(
            (previous) => ({

              lat:
                lat.toFixed(3),

              lon:
                lon.toFixed(3),

              region:
                region !== null
                  ? region
                  : previous?.region,

            })
          )

        }

        else {

          setCoords(
            null
          )

        }

      },

      Cesium.ScreenSpaceEventType
        .MOUSE_MOVE
    )


    // ----------------------------------------------------------
    // Scene
    // ----------------------------------------------------------

    const scene =
      viewer.scene


    const start =
      Date.now()


    let done =
      false


    // ----------------------------------------------------------
    // Slow rotation while splash screen is visible
    // ----------------------------------------------------------

    scene.postRender
      .addEventListener(
        () => {

          if (
            spinRef.current
          ) {

            viewer.camera.rotate(
              Cesium.Cartesian3.UNIT_Z,
              -0.0012
            )

          }

        }
      )


    // ----------------------------------------------------------
    // Wait for globe tiles + minimum splash time
    // ----------------------------------------------------------

    const check =
      scene.postRender
        .addEventListener(
          () => {

            if (done) {
              return
            }


            if (
              scene.globe.tilesLoaded &&
              Date.now() -
                start >
                2500
            ) {

              done =
                true


              check()


              setLoaded(
                true
              )


              spinRef.current =
                false


              viewer.camera.flyTo({

                destination:
                  Cesium.Cartesian3
                    .fromDegrees(
                      80,
                      -8,
                      5500000
                    ),

                orientation: {

                  heading:
                    0,

                  pitch:
                    Cesium.Math.toRadians(
                      -55
                    ),

                  roll:
                    0,

                },

                duration:
                  6,

                easingFunction:
                  Cesium.EasingFunction
                    .CUBIC_IN_OUT,

              })

            }

          }
        )

  }


  // ============================================================
  // OCEAN CONTROL HANDLERS
  // ============================================================

  function onVariableChange(
    v
  ) {

    setVariable(
      v
    )


    if (
      viewMode === 'ocean'
    ) {

      updateLayer(
        v,
        depthIdx,
        timeIdx
      )

    }

  }


  // ============================================================
  // DEPTH CHANGE
  // ============================================================

  function onDepthChange(
    d
  ) {

    setDepthIdx(
      d
    )


    clearTimeout(
      debounceTimerRef.current
    )


    debounceTimerRef.current =
      setTimeout(
        () => {

          if (
            viewMode === 'ocean'
          ) {

            updateLayer(
              variable,
              d,
              timeIdx
            )

          }

        },
        200
      )

  }


  // ============================================================
  // TIME CHANGE
  // ============================================================

  function onTimeChange(
    t
  ) {

    setTimeIdx(
      t
    )


    clearTimeout(
      debounceTimerRef.current
    )


    debounceTimerRef.current =
      setTimeout(
        () => {

          if (
            viewMode === 'ocean'
          ) {

            updateLayer(
              variable,
              depthIdx,
              t
            )

          }

        },
        200
      )

  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <>

      {/* ======================================================
          CESIUM GLOBE
          ====================================================== */}

      <Globe
        onReady={
          handleReady
        }
      />


      {/* ======================================================
          MOUSE COORDINATES + REGION
          ====================================================== */}

      {coords && (

        <div
          className="coord-readout"
        >

          {coords.lat}°,
          {' '}
          {coords.lon}°

          {coords.region && (

            <>

              <br />

              {coords.region.name}

              {coords.region.admin
                ? `, ${coords.region.admin}`
                : ''
              }

            </>

          )}

        </div>

      )}


      {/* ======================================================
          SPLASH SCREEN
          ====================================================== */}

      <div
        className={
          `splash ${
            loaded
              ? 'hide'
              : ''
          }`
        }
      >

        <h1 style={{ fontSize: '65px', fontWeight: '700' }}>
          OCEOPSIS
        </h1>
        <p className="splash-subtitle">Welcome to Ocean Visualization</p>

        <div
          className="spinner"
        />

      </div>


      {/* ======================================================
          MAIN UI
          ====================================================== */}

      {loaded && (

        <>

          {/* ==================================================
              VIEW MODE BUTTONS
              ================================================== */}

          <div
            className="mode-panel"
          >

            <button
              className={
                viewMode === 'ocean'
                  ? 'mode-button active'
                  : 'mode-button'
              }

              onClick={() =>
                setMode('ocean')
              }
            >
              Ocean
            </button>


            <button
              className={
                viewMode === 'argo'
                  ? 'mode-button active'
                  : 'mode-button'
              }

              onClick={() =>
                setMode('argo')
              }
            >
              Argo
            </button>


            <button
              className={
                viewMode === 'glider'
                  ? 'mode-button active'
                  : 'mode-button'
              }

              onClick={() =>
                setMode('glider')
              }
            >
              Glider
            </button>


            <button
              className={
                viewMode === 'cyclone'
                  ? 'mode-button active'
                  : 'mode-button'
              }

              onClick={() =>
                setMode('cyclone')
              }
            >
              Cyclone
            </button>

          </div>


          {/* ==================================================
              OCEAN CONTROL PANEL
              ================================================== */}

          {viewMode === 'ocean' && (

            <ControlPanel

              variable={
                variable
              }

              onVariableChange={
                onVariableChange
              }

              depthIdx={
                depthIdx
              }

              onDepthChange={
                onDepthChange
              }

              timeIdx={
                timeIdx
              }

              onTimeChange={
                onTimeChange
              }

              timeDates={
                timeDates
              }

            />

          )}


          {/* ==================================================
              OCEAN EXPLANATION
              ================================================== */}

          {viewMode === 'ocean' &&
            oceanExplain && (

              <div
                className="panel ocean-explain-panel"
              >

                <p
                  className="explain-caption"
                >

                  {oceanExplain.text}

                </p>

              </div>

          )}


          {/* ==================================================
              CYCLONE PANEL
              ================================================== */}

          {viewMode === 'cyclone' && (

            <div
              className="panel"
            >

              <label>

                Storm

                <select
                  value={
                    selectedCyclone ?? ''
                  }

                  onChange={(e) =>
                    selectCyclone(
                      e.target.value
                    )
                  }
                >

                  <option
                    value=""
                    disabled
                  >
                    Choose a storm
                  </option>


                  {cyclones.map(
                    (c) => (

                      <option
                        key={c.sid}
                        value={c.sid}
                      >

                        {c.name}
                        {' '}
                        ({c.year},
                        {' '}
                        {c.subbasin})

                      </option>

                    )
                  )}

                </select>

              </label>


              {cycloneExplain && (

                <p
                  className="explain-caption"
                >

                  {
                    cycloneExplain.text
                  }

                </p>

              )}

            </div>

          )}


          {/* ==================================================
              ARGO PROFILE + INFO TABLE
              ================================================== */}

          {selectedFloat &&
            profile && (

              <>

                <ProfileChart

                  profile={
                    profile
                  }

                  floatId={
                    selectedFloat
                  }

                  onClose={() => {

                    setSelectedFloat(
                      null
                    )

                    setProfile(
                      null
                    )

                  }}

                />


                <ArgoInfoPanel

                  floatId={
                    selectedFloat
                  }

                  profile={
                    profile
                  }

                  onClose={() => {

                    setSelectedFloat(
                      null
                    )

                    setProfile(
                      null
                    )

                  }}

                />

              </>

          )}


          {/* ==================================================
              GLIDER PROFILE + INFO TABLE
              ================================================== */}

          {selectedGlider &&
            gliderProfile && (

              <>

                <ProfileChart

                  profile={
                    gliderProfile
                  }

                  floatId={
                    selectedGlider
                  }

                  tempKey="temp"

                  salKey="psal"

                  label="Glider"

                  onClose={() => {

                    setSelectedGlider(
                      null
                    )

                    setGliderProfile(
                      null
                    )

                  }}

                />


                <ArgoInfoPanel

                  floatId={
                    selectedGlider
                  }

                  profile={
                    gliderProfile
                  }

                  tempKey="temp"

                  salKey="psal"

                  label="Glider"

                  onClose={() => {

                    setSelectedGlider(
                      null
                    )

                    setGliderProfile(
                      null
                    )

                  }}

                />

              </>

          )}

        </>

      )}

    </>

  )

}
