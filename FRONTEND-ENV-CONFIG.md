# Frontend Environment Configuration

## Development (.env.development)
Located in `frontend/.env.development` - used by `npm run dev`

```env
VITE_API_URL=http://localhost:5239
VITE_APP_URL=http://localhost:5173
```

## Production (.env.production)
Located in `frontend/.env.production` - used by `npm run build`

```env
VITE_API_URL=https://api.justsku.com
VITE_APP_URL=https://app.justsku.com
```

## Using in Frontend Code

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
// In development: http://localhost:5239
// In production: https://api.justsku.com
```

## Update Vite Config

In `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  }
})
```
