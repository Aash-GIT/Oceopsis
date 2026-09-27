export default function ArgoInfoPanel({
  floatId,
  profile,
  onClose,
  tempKey = 'thetao',
  salKey = 'so',
  label = 'Float',
}) {
  if (!profile || !profile.depth) return null

  return (
    <div className="argo-info-panel">
      <button onClick={onClose} className="close-btn">✕</button>
      <h3>{label} {floatId}</h3>
      <div className="argo-table-wrap">
        <table>
          <thead>
            <tr><th>Depth (m)</th><th>Temp</th><th>{salKey === 'psal' ? 'Salinity (PSU)' : 'Salinity'}</th></tr>
          </thead>
          <tbody>
            {profile.depth.map((d, i) => (
              <tr key={i}>
                <td>{d?.toFixed(1)}</td>
                <td>{profile[tempKey]?.[i]?.toFixed(2) ?? '—'}</td>
                <td>{profile[salKey]?.[i]?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}