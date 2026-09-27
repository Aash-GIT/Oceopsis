import { VALUE_RANGES, VARIABLE_LABELS } from './colorbar'

const DEPTHS = [1.5,2.6,3.8,5.1,6.4,7.9,9.6,11.4,13.5,15.8,18.5,21.6,25.2,29.4,34.4,40.3,47.4,55.8,65.8,77.9,92.3,109.7,130.7,155.9,186.1,222.5,266.0,318.1,380.2,453.9,541.1,643.6,763.3,902.3]

export default function ControlPanel({
  variable, onVariableChange,
  depthIdx, onDepthChange,
  timeIdx, onTimeChange, timeDates,
}) {
  const [vmin, vmax] = VALUE_RANGES[variable] ?? [0, 1]

  return (
    <div className="panel">
      <label>
        Variable
        <select value={variable} onChange={e => onVariableChange(e.target.value)}>
          {Object.keys(VARIABLE_LABELS).map(v => (
            <option key={v} value={v}>{VARIABLE_LABELS[v]}</option>
          ))}
        </select>
      </label>

      <label>
        Depth: {DEPTHS[depthIdx].toFixed(1)} m
        <input
          type="range" min={0} max={DEPTHS.length - 1}
          value={depthIdx}
          onChange={e => onDepthChange(Number(e.target.value))}
        />
      </label>

      <label>
        Time: {timeDates?.[timeIdx] ?? `Day ${timeIdx}`}
        <input
          type="range" min={0} max={91}
          value={timeIdx}
          onChange={e => onTimeChange(Number(e.target.value))}
        />
      </label>

      <div className="colorbar">
        <div className="colorbar-gradient" />
        <div className="colorbar-labels">
          <span>{vmin}</span>
          <span>{vmax}</span>
        </div>
      </div>
    </div>
  )
}