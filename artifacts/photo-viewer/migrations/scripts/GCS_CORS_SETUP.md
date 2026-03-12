# GCS Bucket CORS Setup

The browser uploads photos directly to Google Cloud Storage using a signed URL.
For this to work, the GCS bucket needs CORS configured to allow PUT requests from
your app's domain.

## One-time setup (run from your terminal with gcloud installed)

1. Save this as `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["PUT", "GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

2. Apply it to your bucket:

```bash
gcloud storage buckets update gs://boosterpics2026 --cors-file=cors.json
```

Or using gsutil:

```bash
gsutil cors set cors.json gs://boosterpics2026
```

## Verify

```bash
gcloud storage buckets describe gs://boosterpics2026 --format="json(cors)"
```

## Note

The `"origin": ["*"]` allows uploads from any origin including your Replit dev
domain, your Hostinger production domain, and localhost. You can tighten this
to specific domains once you know your final production URL.
