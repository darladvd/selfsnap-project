# 🎪 Event Booth Deployment Setup

This branch (`event/awscd-booth`) is for kiosk/event deployments with print support.

**Target domain:** `booth.darladavid.com`

---

## AWS Resources Needed

### 1. S3 Bucket

```bash
aws s3 mb s3://selfsnap-booth-dd --region ap-southeast-1
```

Enable static website hosting:

```bash
aws s3 website s3://selfsnap-booth-dd --index-document index.html --error-document index.html
```

### 2. CloudFront Distribution

Create a distribution pointing to the S3 bucket with:
- Origin: `selfsnap-booth-dd.s3.ap-southeast-1.amazonaws.com`
- Alternate domain: `booth.darladavid.com`
- SSL certificate from ACM (must be in `us-east-1` for CloudFront)
- Default root object: `index.html`
- Custom error response: 403/404 → `/index.html` (for SPA routing)

### 3. DNS (Route 53 or your DNS provider)

Add a CNAME or alias record:
```
booth.darladavid.com → <cloudfront-distribution-domain>.cloudfront.net
```

### 4. Set Environment Variable

After creating the CloudFront distribution, export the distribution ID:

```bash
export BOOTH_CF_DIST_ID=<your-distribution-id>
```

Or hardcode it in `package.json` once you have it.

---

## Deploy

```bash
cd selfsnap-web
npm run build
npm run deploy
```

---

## Kiosk Mode Tips

- Run Chrome in kiosk mode: `open -a "Google Chrome" --args --kiosk --app=https://booth.darladavid.com`
- Disable sleep/screensaver on the kiosk machine
- Consider a shorter timer (1-2s) for event throughput
