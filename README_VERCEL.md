Vercel Deployment Instructions

1. Create a Vercel token:
   - Log into Vercel, go to Settings → Tokens, and create a new token.

2. Add the token as a GitHub Actions secret:
   - Go to the repository on GitHub → Settings → Secrets and variables → Actions → New repository secret.
   - Name it `VERCEL_TOKEN` and paste the token value.

3. Trigger a deploy:
   - Push to the `main` branch. The workflow `.github/workflows/vercel-deploy.yml` will run and deploy the site to Vercel.

Notes:
- The workflow uses the Vercel CLI via `vercel --prod --token` and will create or update a Vercel project tied to this repository.
- If you want me to trigger the deployment for you, add the `VERCEL_TOKEN` secret and tell me; I can then trigger the workflow run.
