[README (1).md](https://github.com/user-attachments/files/33002764/README.1.md)
<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&size=38&duration=3000&pause=1000&color=4285F4&center=true&vCenter=true&width=600&lines=OCEOPSIS;4D+Ocean+Intelligence+Platform;See+the+Ocean+Like+Never+Before" alt="Typing SVG" />

### 🌊 A web-based 3D visualization platform that brings ocean model data, Argo floats, gliders, and cyclone tracks into one living, breathing globe.

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![CesiumJS](https://img.shields.io/badge/CesiumJS-3D%20Globe-00C8FF?style=for-the-badge&logo=cesium&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare%20R2-Storage-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)
![Render](https://img.shields.io/badge/API%20on-Render-46E3B7?style=flat-square&logo=render)
![License](https://img.shields.io/badge/license-MIT-informational?style=flat-square)
![Status](https://img.shields.io/badge/status-active%20development-success?style=flat-square)

<br/>

<img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/aur-badge.webp" width="0" height="0" alt="" />

</div>

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A1128,100:4285F4&height=120&section=header&text=&fontSize=0" width="100%"/>
</p>

## 🧭 What is Oceopsis?

Oceopsis is a **browser-native, 3D ocean data visualization system** built around a real CesiumJS globe. It merges numerical ocean model outputs with real in-situ observations — Argo floats, ocean gliders, and historical cyclone tracks — into one interactive, geospatially accurate experience.

Instead of toggling between desktop GIS tools and 2D plan views, Oceopsis lets you **fly down to the Indian Ocean, slice through 34 depth levels, animate 92 days of model data, click a float to see its profile, and watch a cyclone's exact path and intensity** — all in a browser tab.

> Built for the kind of people who think "ocean forecasting dashboard" should look like something out of a sci-fi bridge console, not a spreadsheet.

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🌐 The Globe
- Google Earth–style splash intro with slow rotation + fly-in
- Real Cesium World Bathymetry terrain (actual seafloor shape)
- Live mouse-hover readout: **lat/lon + state/country**, anywhere on Earth
- Smooth mode switching — zero reloads, zero ghost layers

### 🌡️ Ocean Model Layer
- 6 variables: temperature, salinity, u/v currents, current speed & direction
- Depth slider across **34 real depth levels** (1.5m → 902m)
- Time slider across **92 daily steps**
- Fixed, scientifically consistent colorbar per variable
- Auto-generated plain-language explanation of what you're looking at

</td>
<td width="50%" valign="top">

### 🛰️ Argo & Glider
- Click any float or glider marker for an instant depth-profile chart
- Full raw-reading data table alongside the chart
- Glider tracks rendered as real flight paths, not just points

### 🌀 Cyclone Intelligence
- Historical storm tracks (IBTrACS-based), colored by intensity
- Pick any named storm from a searchable dropdown
- Auto-generated peak-intensity summary per storm

### 🧠 Explainable by Design
- Every layer narrates itself in plain English — no PhD required

</td>
</tr>
</table>

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## 🏗️ Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌────────────────────┐
│   React + Vite       │  HTTP   │   FastAPI Backend     │  S3 API │   Cloudflare R2     │
│   CesiumJS Globe      │◄──────►│   xarray / Zarr        │◄──────►│   Zarr + Parquet     │
│   (Vercel)            │         │   pandas / pyarrow     │         │   data lake          │
└─────────────────────┘         └──────────────────────┘         └────────────────────┘
```

| Layer | Tech |
|---|---|
| **Globe & UI** | React, Vite, CesiumJS, Recharts |
| **API** | FastAPI, Uvicorn |
| **Ocean Model Engine** | xarray, Zarr, Dask, Matplotlib (server-side imagery rendering) |
| **Observational Data** | Pandas, PyArrow (batched Parquet streaming) |
| **Storage** | Cloudflare R2 (S3-compatible) with local-disk fallback |
| **Hosting** | Vercel (frontend) · Render (backend) |

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+ (via Anaconda or venv)
- A free [Cesium ion](https://cesium.com/ion/) account + access token

### 1. Clone it
```bash
git clone https://github.com/<your-username>/oceopsis.git
cd oceopsis
```

### 2. Backend setup
```bash
cd backend
conda create -n oceopsis python=3.11 -y
conda activate oceopsis
pip install -r requirements.txt
```

Create `backend/.env` (or set these in your shell / Render dashboard):
```env
R2_ENDPOINT=your_r2_endpoint
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=oceopsis-data
```
> No R2 credentials? The backend automatically falls back to reading from a local `Data/` folder.

Run it:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_CESIUM_TOKEN=your_cesium_ion_token
VITE_API_URL=http://localhost:8000
```

Run it:
```bash
npm run dev
```

Open **http://localhost:5173** — you should see Earth spinning in space within a few seconds. 🌍

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## 🕹️ How to Use the App

<table>
<tr><td width="70px" align="center">🌍</td><td><b>Intro</b> — Wait for the splash to fade; the camera glides in over the Indian Ocean automatically.</td></tr>
<tr><td align="center">🧭</td><td><b>Mode Panel (top-left)</b> — Switch between <code>Ocean</code>, <code>Argo</code>, <code>Glider</code>, and <code>Cyclone</code>. Each is fully independent — no reload needed.</td></tr>
<tr><td align="center">🌡️</td><td><b>Ocean mode</b> — Pick a variable from the dropdown, drag the <b>Depth</b> and <b>Time</b> sliders. The colorbar and the plain-English caption update live.</td></tr>
<tr><td align="center">📍</td><td><b>Argo / Glider mode</b> — Click any marker on the globe. A depth-profile chart and a full data table pop up — click ✕ to dismiss.</td></tr>
<tr><td align="center">🌀</td><td><b>Cyclone mode</b> — Choose a storm by name from the dropdown. Its full track draws in, colored by intensity, with a summary caption.</td></tr>
<tr><td align="center">🖱️</td><td><b>Anywhere</b> — Move your mouse over the globe to see live coordinates and the state/country beneath your cursor.</td></tr>
</table>

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## 📡 API Reference

<details>
<summary><b>Click to expand full endpoint list</b></summary>

<br/>

| Endpoint | Description |
|---|---|
| `GET /metadata` | Dataset dimensions, variable list, time/lat/lon ranges |
| `GET /depths` | Real depth levels (meters) |
| `GET /times` | Real date for each time index |
| `GET /slice` | Rendered PNG imagery layer for a variable/depth/time |
| `GET /slice_range` | Fixed color scale min/max for a variable |
| `GET /slice/explain` | Plain-language caption for the current ocean view |
| `GET /argo` | All Argo observation points |
| `GET /argo/{id}/profile` | Depth profile for one Argo observation |
| `GET /gliders` | All glider tracks |
| `GET /gliders/{id}/profile` | Depth profile for one glider |
| `GET /cyclones` | List of all named storms |
| `GET /cyclones/{sid}/track` | Full track + intensity for one storm |
| `GET /cyclones/{sid}/explain` | Auto-generated storm summary |

</details>

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:4285F4,100:0A1128&height=3&width=100%"/>
</p>

## 🗺️ Data Sources

| Dataset | Source | Role |
|---|---|---|
| Ocean model | Copernicus Marine Service | Temperature, salinity, currents (34 depths × 92 days) |
| Argo floats | Argo network | In-situ depth profiles |
| Gliders | Autonomous underwater vehicles | Mobile profile tracks |
| Cyclones | IBTrACS best-track archive | Historical storm paths & intensity |
| Bathymetry | Cesium World Bathymetry | Real seafloor terrain |
| Boundaries | Natural Earth (Admin-1) | State/country hover lookup |

<br/>

## 🛣️ Roadmap

- [ ] Role-based access (public explorer view vs. technical/forecaster view)
- [ ] True volumetric isosurface rendering
- [ ] Current-shear / turbulence overlay
- [ ] OGC WMS/WCS-compliant endpoints
- [ ] Vertical cross-section "curtain" tool

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:4285F4,100:0A1128&height=100&section=footer"/>
</p>

<div align="center">

**Built with 🌊 and way too much matplotlib.**

</div>
