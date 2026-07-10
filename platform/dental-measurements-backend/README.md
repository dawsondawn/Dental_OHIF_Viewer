# Dental Measurements Backend

Small isolated backend service to persist dental measurements from the panel.

## Run

From the repository root:

```bash
pnpm --filter @ohif/dental-measurements-backend run dev
```

Or from this folder:

```bash
pnpm run dev
```

## Environment

- `DENTAL_BACKEND_HOST` (default: `127.0.0.1`)
- `DENTAL_BACKEND_PORT` (default: `4010`)

## API

- `GET /health`
- `GET /api/dental-measurements`
- `GET /api/dental-measurements/latest`
- `POST /api/dental-measurements`

### POST payload

```json
{
  "source": "dental-panel",
  "measurements": [
    {
      "uid": "...",
      "label": "PA length"
    }
  ]
}
```

Data is persisted to `data/measurements.json`.
