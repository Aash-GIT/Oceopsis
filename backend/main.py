from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import xarray as xr
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import io
import os
from functools import lru_cache
import pyarrow.parquet as pq
import fsspec

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://oceopsis.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# R2 STORAGE CONFIGURATION
# ============================================================

R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET = os.getenv("R2_BUCKET", "oceopsis-data")

USE_R2 = all([
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
])

R2_STORAGE_OPTIONS = {
    "key": R2_ACCESS_KEY_ID,
    "secret": R2_SECRET_ACCESS_KEY,
    "endpoint_url": R2_ENDPOINT,
}

# ============================================================
# COPERNICUS OCEAN DATA
# ============================================================

if USE_R2:
    ds = xr.open_zarr(
        f"s3://{R2_BUCKET}/copernicuz_final.zarr",
        storage_options=R2_STORAGE_OPTIONS,
        consolidated=False,
    )
else:
    ds = xr.open_zarr("Data/copernicuz_final.zarr")

VALUE_RANGES = {
    "thetao": (15, 32),
    "so": (30, 37),
    "uo": (-1.5, 1.5),
    "vo": (-1.5, 1.5),
    "current_speed": (0, 2.0),
    "current_dir": (0, 360),
}

# ============================================================
# DATA LOADERS
# ============================================================

argo_df = None
glider_df = None
cyclone_df = None


def load_argo_data():
    global argo_df

    if argo_df is not None:
        return argo_df

    if USE_R2:
        argo_df = pd.read_parquet(
            f"s3://{R2_BUCKET}/Copy of cleaned_argo_common.parquet",
            storage_options=R2_STORAGE_OPTIONS,
        )
    else:
        argo_df = pd.read_parquet(
            "Data/Copy of cleaned_argo_common.parquet"
        )

    return argo_df


def load_glider_data():
    global glider_df

    if glider_df is not None:
        return glider_df

    if USE_R2:
        glider_df = pd.read_parquet(
            f"s3://{R2_BUCKET}/glider_data.parquet",
            storage_options=R2_STORAGE_OPTIONS,
        )
    else:
        glider_df = pd.read_parquet("Data/glider_data.parquet")

    glider_df["PLATFORM_NUMBER"] = glider_df["PLATFORM_NUMBER"].apply(
        lambda x: x.decode().strip() if isinstance(x, bytes) else str(x).strip()
    )

    glider_df = glider_df.sort_values(["PLATFORM_NUMBER", "TIME"])

    return glider_df


def load_cyclone_data():
    global cyclone_df

    if cyclone_df is not None:
        return cyclone_df

    if USE_R2:
        cyclone_df = pd.read_parquet(
            f"s3://{R2_BUCKET}/cyclone_data_2010_2025_final.parquet",
            storage_options=R2_STORAGE_OPTIONS,
        )
    else:
        cyclone_df = pd.read_parquet(
            "Data/cyclone_data_2010_2025_final.parquet"
        )

    cyclone_df["wind"] = cyclone_df["WMO_WIND"].fillna(
        cyclone_df["NEWDELHI_WIND"]
    )

    return cyclone_df


def get_argo_parquet():
    if USE_R2:
        return fsspec.open(
            f"s3://{R2_BUCKET}/Copy of cleaned_argo_common.parquet",
            mode="rb",
            **R2_STORAGE_OPTIONS,
        )
    else:
        return open(
            "Data/Copy of cleaned_argo_common.parquet",
            "rb",
        )


def iter_argo_batches(columns, batch_size=10000):
    """
    Read the Argo Parquet file in small batches so the entire
    dataset never has to be loaded into Render's memory.
    """
    with get_argo_parquet() as file_obj:
        parquet_file = pq.ParquetFile(file_obj)

        for batch in parquet_file.iter_batches(
            batch_size=batch_size,
            columns=columns,
        ):
            yield batch.to_pandas()


def wind_category(wind):
    if pd.isna(wind):
        return "unknown"
    if wind < 34:
        return "depression"
    if wind < 64:
        return "storm"
    if wind < 96:
        return "cyclone"
    return "severe"


# ============================================================
# BASIC OCEAN ENDPOINTS
# ============================================================

@app.get("/metadata")
def metadata():
    return {
        "variables": list(ds.data_vars),
        "dims": {k: int(v) for k, v in ds.sizes.items()},
        "time": [str(ds.time.values[0]), str(ds.time.values[-1])],
        "lat": [float(ds.latitude.min()), float(ds.latitude.max())],
        "lon": [float(ds.longitude.min()), float(ds.longitude.max())],
    }


@app.get("/depths")
def depths():
    return {"depth": [float(d) for d in ds.depth.values]}


@app.get("/times")
def times():
    return {"time": [str(t)[:10] for t in ds.time.values]}


# ============================================================
# OCEAN SLICE — NOW CACHED
# ============================================================

@lru_cache(maxsize=300)
def _make_slice_png(variable: str, depth_idx: int, time_idx: int) -> bytes:
    da = ds[variable].isel(depth=depth_idx, time=time_idx)
    data = da.values

    if variable in VALUE_RANGES:
        vmin, vmax = VALUE_RANGES[variable]
    else:
        vmin = float(np.nanmin(data))
        vmax = float(np.nanmax(data))

    fig, ax = plt.subplots(
        figsize=(data.shape[1] / 100, data.shape[0] / 100),
        dpi=100,
    )
    ax.axis("off")
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)

    ax.imshow(
        np.flipud(data),
        cmap="turbo",
        vmin=vmin,
        vmax=vmax,
    )

    buf = io.BytesIO()
    plt.savefig(
        buf,
        format="png",
        transparent=True,
    )
    plt.close(fig)

    buf.seek(0)
    return buf.getvalue()


@app.get("/slice")
def slice_data(
    variable: str,
    depth_idx: int = 0,
    time_idx: int = 0,
):
    png_bytes = _make_slice_png(
        variable,
        depth_idx,
        time_idx,
    )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=3600"
        },
    )


@app.get("/slice_range")
def slice_range(
    variable: str,
    depth_idx: int = 0,
    time_idx: int = 0,
):
    if variable in VALUE_RANGES:
        vmin, vmax = VALUE_RANGES[variable]
        return {
            "min": vmin,
            "max": vmax,
        }

    da = ds[variable].isel(
        depth=depth_idx,
        time=time_idx,
    )

    data = da.values

    return {
        "min": float(np.nanmin(data)),
        "max": float(np.nanmax(data)),
    }


# ============================================================
# ARGO OBSERVATION LOCATIONS — MEMORY SAFE
# ============================================================

@app.get("/argo")
def argo_floats():
    columns = [
        "latitude",
        "longitude",
        "time",
    ]

    records = []
    seen = set()
    row_number = 0

    for batch in iter_argo_batches(
        columns,
        batch_size=10000,
    ):
        batch = batch.dropna(subset=columns)

        for row in batch.itertuples(index=False):
            key = (
                float(row.latitude),
                float(row.longitude),
                float(row.time),
            )

            if key in seen:
                row_number += 1
                continue

            seen.add(key)

            records.append({
                "id": str(row_number),
                "lat": float(row.latitude),
                "lon": float(row.longitude),
                "time": float(row.time),
            })

            row_number += 1

            if len(records) >= 500:
                return records

    return records


# ============================================================
# ARGO PROFILE — ROW-GROUP BASED
# ============================================================

ARGO_LIGHT_COLUMNS = [
    "latitude",
    "longitude",
    "time",
]

ARGO_FULL_COLUMNS = [
    "latitude",
    "longitude",
    "time",
    "depth",
    "thetao",
    "so",
]


@lru_cache(maxsize=1)
def _argo_row_group_offsets():
    """
    Read only Parquet metadata and calculate the cumulative
    row ranges for each row group.

    No actual Argo data is loaded here.
    """
    with get_argo_parquet() as file_obj:
        parquet_file = pq.ParquetFile(file_obj)

        offsets = []
        cumulative = 0

        for group_idx in range(parquet_file.num_row_groups):
            num_rows = parquet_file.metadata.row_group(
                group_idx
            ).num_rows

            offsets.append((
                cumulative,
                cumulative + num_rows,
                group_idx,
            ))

            cumulative += num_rows

        return tuple(offsets)


def _argo_profile(target_row: int):
    """
    Find an Argo observation and construct its complete
    depth profile without scanning the dataset row-by-row.
    """

    offsets = _argo_row_group_offsets()

    # --------------------------------------------------------
    # PASS 1
    # Use Parquet metadata to jump directly to the row group
    # containing target_row.
    # --------------------------------------------------------

    selected = None

    with get_argo_parquet() as file_obj:
        parquet_file = pq.ParquetFile(file_obj)

        for start, end, group_idx in offsets:
            if start <= target_row < end:

                group_df = parquet_file.read_row_group(
                    group_idx,
                    columns=ARGO_LIGHT_COLUMNS,
                    use_threads=False,
                ).to_pandas()

                local_idx = target_row - start

                if local_idx >= len(group_df):
                    return None

                selected = group_df.iloc[local_idx]

                del group_df

                break

        if selected is None:
            return None

        latitude = selected["latitude"]
        longitude = selected["longitude"]
        time_value = selected["time"]

        # ----------------------------------------------------
        # PASS 2
        # Scan row groups using only the lightweight columns.
        # Only read depth/thetao/so from row groups containing
        # a matching profile.
        # ----------------------------------------------------

        profile_parts = []

        for start, end, group_idx in offsets:

            light_df = parquet_file.read_row_group(
                group_idx,
                columns=ARGO_LIGHT_COLUMNS,
                use_threads=False,
            ).to_pandas()

            mask = (
                (light_df["latitude"] == latitude)
                & (light_df["longitude"] == longitude)
                & (light_df["time"] == time_value)
            )

            if mask.any():

                full_df = parquet_file.read_row_group(
                    group_idx,
                    columns=ARGO_FULL_COLUMNS,
                    use_threads=False,
                ).to_pandas()

                profile_parts.append(
                    full_df.loc[mask.to_numpy()]
                )

                del full_df

            del light_df

    if not profile_parts:
        return None

    sub = pd.concat(
        profile_parts,
        ignore_index=True,
    )

    sub = sub[
        pd.notna(sub["depth"])
        & pd.notna(sub["thetao"])
    ]

    sub = sub.sort_values("depth")

    result = {
        "depth": sub["depth"].astype(float).tolist(),
        "thetao": sub["thetao"].astype(float).tolist(),
        "so": [
            float(v) if pd.notna(v) else None
            for v in sub["so"]
        ],
    }

    del sub
    del profile_parts

    return result


@app.get("/argo/{observation_id}/profile")
def argo_profile(observation_id: str):
    try:
        target_row = int(observation_id)
    except ValueError:
        return {
            "depth": [],
            "thetao": [],
            "so": [],
        }

    if target_row < 0:
        return {
            "depth": [],
            "thetao": [],
            "so": [],
        }

    result = _argo_profile(target_row)

    if result is None:
        return {
            "depth": [],
            "thetao": [],
            "so": [],
        }

    return result


# ============================================================
# GLIDER TRACK LOCATIONS — LAZY LOAD
# ============================================================

@app.get("/gliders")
def glider_list():
    glider_df = load_glider_data()

    out = []

    for pid, g in glider_df.groupby("PLATFORM_NUMBER"):
        g = g.dropna(
            subset=[
                "LATITUDE",
                "LONGITUDE",
            ]
        )

        if g.empty:
            continue

        pts = g[
            [
                "LATITUDE",
                "LONGITUDE",
            ]
        ].round(4)

        g = g[
            (pts != pts.shift()).any(axis=1)
        ]

        g = g.iloc[
            ::max(1, len(g) // 200)
        ]

        if g.empty:
            continue

        track = [
            {
                "lat": float(r.LATITUDE),
                "lon": float(r.LONGITUDE),
            }
            for r in g.itertuples()
        ]

        last = g.iloc[-1]

        out.append({
            "id": str(pid),
            "track": track,
            "last_lat": float(last["LATITUDE"]),
            "last_lon": float(last["LONGITUDE"]),
        })

    return out


@app.get("/gliders/{platform_id}/profile")
def glider_profile(platform_id: str):
    glider_df = load_glider_data()

    sub = glider_df[
        glider_df["PLATFORM_NUMBER"] == platform_id
    ].copy()

    if sub.empty:
        return {
            "depth": [],
            "temp": [],
            "psal": [],
            "doxy": [],
            "chla": [],
        }

    sub = sub[
        pd.notna(sub["DEPTH"])
        & pd.notna(sub["TEMP"])
    ]

    sub = sub.sort_values("DEPTH")

    return {
        "depth": sub["DEPTH"].astype(float).tolist(),
        "temp": sub["TEMP"].astype(float).tolist(),
        "psal": [
            float(v) if pd.notna(v) else None
            for v in sub["PSAL"]
        ],
        "doxy": [
            float(v) if pd.notna(v) else 0.0
            for v in sub["DOXY"]
        ],
        "chla": [
            float(v) if pd.notna(v) else 0.0
            for v in sub["CHLA"]
        ],
    }


# ============================================================
# CYCLONES — LAZY LOAD
# ============================================================

@app.get("/cyclones")
def cyclone_list():
    cyclone_df = load_cyclone_data()

    storms = cyclone_df.groupby(
        "SID"
    ).first().reset_index()

    return [
        {
            "sid": str(row.SID),
            "name": str(row.NAME),
            "year": int(row.YEAR),
            "subbasin": str(row.SUBBASIN),
        }
        for row in storms.itertuples()
    ]


@app.get("/cyclones/{sid}/track")
def cyclone_track(sid: str):
    cyclone_df = load_cyclone_data()

    sub = cyclone_df[
        cyclone_df["SID"].astype(str) == str(sid)
    ].sort_values("ISO_TIME")

    if sub.empty:
        return {
            "name": "",
            "points": [],
        }

    return {
        "name": str(sub.iloc[0]["NAME"]),
        "points": [
            {
                "lat": float(r.LAT),
                "lon": float(r.LON),
                "time": str(r.ISO_TIME),
                "wind": (
                    float(r.wind)
                    if pd.notna(r.wind)
                    else None
                ),
                "category": wind_category(r.wind),
            }
            for r in sub.itertuples()
        ],
    }


@app.get("/cyclones/{sid}/explain")
def cyclone_explain(sid: str):
    cyclone_df = load_cyclone_data()

    sub = cyclone_df[
        cyclone_df["SID"].astype(str) == str(sid)
    ].sort_values("ISO_TIME")

    if sub.empty:
        return {
            "text": "Cyclone data not found."
        }

    name = str(sub.iloc[0]["NAME"])
    year = int(sub.iloc[0]["YEAR"])
    subbasin = str(sub.iloc[0]["SUBBASIN"])

    wind_data = sub[
        sub["wind"].notna()
    ]

    if wind_data.empty:
        return {
            "text": (
                f"{name} ({year}, {subbasin}) has no recorded wind "
                "intensity in the available dataset."
            )
        }

    peak = wind_data.loc[
        wind_data["wind"].idxmax()
    ]

    return {
        "text": (
            f"{name} ({year}, {subbasin}) peaked at "
            f"{peak['wind']:.0f} kt "
            f"({wind_category(peak['wind'])}) near "
            f"{peak['LAT']:.1f}°N, "
            f"{peak['LON']:.1f}°E."
        )
    }


# ============================================================
# OCEAN EXPLANATION
# ============================================================

@app.get("/slice/explain")
def slice_explain(
    variable: str,
    depth_idx: int = 0,
    time_idx: int = 0,
):
    if variable not in ds.data_vars:
        return {
            "text": (
                f"Variable '{variable}' is not available."
            )
        }

    # Safety checks
    if depth_idx < 0 or depth_idx >= len(ds.depth):
        return {
            "text": "Invalid depth selection."
        }

    if time_idx < 0 or time_idx >= len(ds.time):
        return {
            "text": "Invalid time selection."
        }

    da = ds[variable].isel(
        depth=depth_idx,
        time=time_idx,
    )

    values = da.values
    valid_values = values[
        np.isfinite(values)
    ]

    if len(valid_values) == 0:
        return {
            "text": (
                "No valid ocean data is available "
                "for this selection."
            ),
            "date": str(
                ds.time.values[time_idx]
            )[:10],
            "depth": float(
                ds.depth.values[depth_idx]
            ),
        }

    val = float(
        np.mean(valid_values)
    )

    depth_m = float(
        ds.depth.values[depth_idx]
    )

    date_str = str(
        ds.time.values[time_idx]
    )[:10]

    # Temperature
    if variable == "thetao":
        if val > 28:
            note = (
                "The selected region has relatively warm "
                "surface-to-upper-ocean temperatures."
            )
        elif val < 20:
            note = (
                "The selected region has relatively cool "
                "temperatures at this depth."
            )
        else:
            note = (
                "The selected region shows moderate "
                "temperatures at this depth."
            )

        text = (
            f"Average sea temperature at {depth_m:.1f} m "
            f"on {date_str} is {val:.1f} °C. {note}"
        )

    # Salinity
    elif variable == "so":
        if val > 35:
            note = (
                "The average salinity is relatively high."
            )
        elif val < 34:
            note = (
                "The average salinity is relatively low."
            )
        else:
            note = (
                "The average salinity is within "
                "a moderate range."
            )

        text = (
            f"Average salinity at {depth_m:.1f} m "
            f"on {date_str} is {val:.2f} PSU. {note}"
        )

    # East-west current
    elif variable == "uo":
        direction = (
            "eastward"
            if val >= 0
            else "westward"
        )

        text = (
            f"Average east-west current component at "
            f"{depth_m:.1f} m on {date_str} is "
            f"{abs(val):.2f} m/s, directed {direction}."
        )

    # North-south current
    elif variable == "vo":
        direction = (
            "northward"
            if val >= 0
            else "southward"
        )

        text = (
            f"Average north-south current component at "
            f"{depth_m:.1f} m on {date_str} is "
            f"{abs(val):.2f} m/s, directed {direction}."
        )

    # Current speed
    elif variable == "current_speed":
        if val > 0.8:
            note = (
                "This indicates relatively strong "
                "current activity."
            )
        elif val > 0.3:
            note = (
                "This indicates moderate "
                "current activity."
            )
        else:
            note = (
                "This indicates relatively calm "
                "current activity."
            )

        text = (
            f"Average current speed at {depth_m:.1f} m "
            f"on {date_str} is {val:.2f} m/s. {note}"
        )

    # Current direction
    elif variable == "current_dir":
        text = (
            f"Average current direction at "
            f"{depth_m:.1f} m on {date_str} "
            f"is {val:.1f}°."
        )

    else:
        text = (
            f"Average {variable} at {depth_m:.1f} m "
            f"on {date_str} is {val:.2f}."
        )

    return {
        "text": text,
        "date": date_str,
        "depth": depth_m,
        "value": val,
    }