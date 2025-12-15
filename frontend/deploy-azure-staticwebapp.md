# Deploying Frontend to Azure Static Web Apps (Free Tier) for UAT with Local Backend via ngrok

## Prerequisites
- Azure account (free tier is sufficient)
- Azure CLI installed (`az`)
- Azure Static Web Apps CLI (`npm install -g @azure/static-web-apps-cli`)
- ngrok account and CLI (`npm install -g ngrok` or from https://ngrok.com/)
- Your backend running locally (e.g., `dotnet run` in backend)

## 1. Start your backend and expose it with ngrok (UAT)
```sh
# In your backend directory
dotnet run
# In your backend directory
dotnet run
ngrok http 5239
# Your current UAT ngrok URL: https://riva-nymphean-followingly.ngrok-free.dev
```

## 2. Set the frontend API URL for UAT
Edit or create `frontend/.env.uat`:
```
VITE_API_BASE_URL=https://riva-nymphean-followingly.ngrok-free.dev/
```

## 3. Build the frontend for UAT
```sh
cd frontend
npm install
npm run build
```

## 4. Deploy to Azure Static Web Apps (Free Tier)
- Go to the Azure Portal and create a new **Static Web App** (choose Free tier)
- Set the build output folder to `dist`
- Connect to your GitHub repo (or deploy manually below)

### Manual deploy with Azure SWA CLI (for local testing)
```sh
swa deploy ./dist --env production --app-name whoptix-frontend
```

## 5. Test the deployed frontend
- Visit your Azure Static Web App URL
- All API calls will go to your local backend via your ngrok UAT URL.

---

## Notes
- No need to change your ngrok setup—just keep it running as you do now.
- To update the backend URL, just update `.env.uat` and redeploy.
- For local development, use `VITE_API_BASE_URL=http://localhost:5000/` in `.env` or `.env.development`.

---

## Troubleshooting
- If you see CORS errors, ensure your backend allows the Azure Static Web App domain in CORS settings.
- If the backend is not reachable, make sure ngrok is running and the URL is correct.
