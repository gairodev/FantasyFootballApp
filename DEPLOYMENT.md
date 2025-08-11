# Railway Deployment Guide

This guide will help you deploy your Fantasy Football app to Railway, which will host both your Python FastAPI backend and Next.js frontend.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: You'll need to configure these in Railway

## Deployment Steps

### 1. Connect Your Repository

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your Fantasy Football app repository
5. Railway will automatically detect your project structure

### 2. Configure Environment Variables

In your Railway project dashboard, go to the "Variables" tab and add these environment variables:

#### For API Service:
```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app,http://localhost:3000
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
```

#### For Web Service:
```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NODE_ENV=production
```

### 3. Deploy Both Services

Railway will automatically detect and deploy both services:

#### API Service (Python FastAPI)
- **Build Command**: `pip install -r app/api/requirements.txt`
- **Start Command**: `cd app/api && python main.py`
- **Port**: 8000

#### Web Service (Next.js)
- **Build Command**: `cd app/web && npm install && npm run build`
- **Start Command**: `cd app/web && npm start`
- **Port**: 3000

### 4. Configure Domains

1. In Railway, go to each service's "Settings" tab
2. Click "Generate Domain" or add a custom domain
3. Update your environment variables with the new domains

### 5. Update CORS Settings

Make sure your API's `ALLOWED_ORIGINS` includes your frontend domain:

```python
# In app/api/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Backend   │
│   (Next.js)     │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘
```

## Monitoring & Debugging

### Health Checks
- API: `/health` endpoint
- Web: `/` endpoint

### Logs
- View logs in Railway dashboard for each service
- API logs will show FastAPI startup and request logs
- Web logs will show Next.js build and runtime logs

### Common Issues

1. **Build Failures**: Check that all dependencies are in requirements.txt/package.json
2. **Port Conflicts**: Railway automatically assigns ports, don't hardcode them
3. **Environment Variables**: Ensure all required variables are set in Railway
4. **CORS Errors**: Verify ALLOWED_ORIGINS includes your frontend domain

## Scaling

Railway automatically scales your services based on traffic. You can also:
- Set manual scaling limits in the service settings
- Configure auto-scaling rules
- Monitor resource usage in the dashboard

## Updates

To update your deployment:
1. Push changes to your GitHub repository
2. Railway will automatically detect and deploy updates
3. Monitor the deployment logs for any issues

## Cost Optimization

- Use Railway's free tier for development
- Monitor resource usage to optimize costs
- Consider using Railway's sleep mode for non-production environments

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check Railway status: [status.railway.app](https://status.railway.app)
