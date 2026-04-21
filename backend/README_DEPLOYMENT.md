Deployment & Integration Notes
=============================

1) S3 File Storage
- To enable S3-backed uploads set the following environment variables in your deployment:
  - `USE_S3=true`
  - `S3_BUCKET` - your bucket name
  - `S3_REGION` - region (optional)

The backend will fall back to local `uploads/` when `USE_S3` is not set.

2) Hyperledger Fabric
- To enable Fabric integration, set:
  - `USE_FABRIC=true`
  - `FABRIC_CONNECTION_PROFILE` - path to connection profile JSON
  - `FABRIC_WALLET_PATH` - path to wallet directory
  - `FABRIC_GATEWAY_ID` - identity name to use from wallet

See `backend/services/fabricService.js` for a scaffold of how to implement Fabric SDK calls.

3) Security
- Install dependencies: `helmet`, `express-rate-limit`.
- The server uses basic helmet headers and a rate limiter by default.

4) Running tests
- In the `backend/` folder run:

```bash
npm install
npm test
```
