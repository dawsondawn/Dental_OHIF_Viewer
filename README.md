# Dental_OHIF_Viewer

Customized OHIF Viewer to be on Dental Mode with Tooth Selector(FDI/Universal Numbering) and a 2x2 Hanging Protocol

Measurements Panel is a preset with 4 measurement options:
Periapical length, Canal Angle, Crown Width, and Root Length

Export JSON button is added to download the measurements added on the study

## Run
```bash
npm run start
```

# Dental Measurements Backend

Small isolated backend service to persist dental measurements from the panel.

## Run
```bash
pnpm --filter @ohif/dental-measurements-backend run dev
```

## Environment

- `DENTAL_BACKEND_HOST` (default: `127.0.0.1`)
- `DENTAL_BACKEND_PORT` (default: `4010`)

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
