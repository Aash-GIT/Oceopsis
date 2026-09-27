import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'


export default function ProfileChart({
  profile,
  floatId,
  onClose,
  tempKey = 'thetao',
  salKey = 'so',
  label = 'Float'
}) {

  if (!profile) return null


  const data = profile.depth.map(
    (d, i) => ({

      depth: d,

      temp:
        profile[tempKey]?.[i] ?? null,

      sal:
        profile[salKey]?.[i] ?? null,

    })
  )


  return (

    <div className="profile-panel">

      <button
        onClick={onClose}
        className="close-btn"
      >
        ✕
      </button>


      <h3>
        {label} {floatId}
      </h3>


      <LineChart
        width={260}
        height={220}
        data={data}
        layout="vertical"
      >

        <CartesianGrid
          strokeDasharray="3 3"
          opacity={0.2}
        />


        <XAxis
          type="number"
          dataKey="temp"
          stroke="#ccc"
          label={{
            value: '°C',
            position: 'insideBottom',
            fill: '#ccc'
          }}
        />


        <YAxis
          type="number"
          dataKey="depth"
          reversed
          stroke="#ccc"
          label={{
            value: 'Depth (m)',
            angle: -90,
            fill: '#ccc'
          }}
        />


        <Tooltip />


        <Line
          dataKey="temp"
          stroke="#1ae4b6"
          dot={false}
        />

      </LineChart>

    </div>

  )
}