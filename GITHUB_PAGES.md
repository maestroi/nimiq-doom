# GitHub Pages Deployment

This project can be easily deployed to GitHub Pages! Here's how:

## Setup

1. **Enable GitHub Pages in your repository:**
   - Go to Settings → Pages
   - Source: GitHub Actions

2. **The workflow will automatically:**
   - Build the Vue app on every push to `main`
   - Copy manifests to the dist folder
   - Deploy to GitHub Pages

## Manual Deployment

If you want to deploy manually:

```bash
cd web
npm install
npm run build
# Copy manifests
cp -r ../manifests dist/manifests
# Then upload dist/ folder to GitHub Pages
```

## Repository Name

If your repository is named something other than `nimiq-doom`, update the `base` path in `web/vite.config.js`:

```js
base: process.env.GITHUB_PAGES ? '/your-repo-name/' : '/',
```

## Custom Domain

If you want to use a custom domain:
1. Add a `CNAME` file to `web/public/` with your domain
2. Configure DNS settings as per GitHub Pages instructions

## Notes

- The app connects directly to public Nimiq RPC endpoints (no backend needed)
- Manifests are served as static JSON files
- All file reconstruction happens in the browser
- No server-side code required!
