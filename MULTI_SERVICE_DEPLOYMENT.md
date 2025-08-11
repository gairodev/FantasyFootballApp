# 🚂 Railway Deployment Guide (Unified Service)

This guide explains how to deploy your Fantasy Football app to Railway as a unified service that includes both the API backend and web frontend.

## 🏗️ **Service Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project                         │
├─────────────────────────────────────────────────────────────┤
│  🚀 Unified Service (Python API + Next.js Frontend)       │
│  • Backend: FastAPI with Sleeper integration               │
│  • Frontend: Next.js React app                             │
│  • Port: Auto-assigned by Railway                          │
│  • Health: /health (API) and / (Frontend)                 │
│  • Single URL for entire application                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **How Auto-Deployment Works**

### 1. **Service Detection**
Railway automatically detects your project based on:
- **`railway.json`** - Main configuration
- **`nixpacks.toml`** - Build and runtime configuration
- **Directory structure** - `app/api/` and `app/web/`

### 2. **Automatic Build Process**
```
Railway scans repo
    ↓
Detects unified service
    ↓
Installs Python + Node.js dependencies
    ↓
Builds Next.js frontend
    ↓
Deploys unified service
    ↓
Generates single URL
    ↓
API and frontend accessible from same domain
```

### 3. **Service Communication**
- **Frontend → Backend**: Both served from same domain
- **API endpoints**: `/api/*` routes
- **Frontend routes**: All other routes
- **Unified deployment**: Single service, single URL

## 🔧 **Deployment Steps**

### **Step 1: Deploy to Railway**
1. **Push code** to GitHub
2. **Go to [railway.app](https://railway.app)**
3. **New Project** → "Deploy from GitHub repo"
4. **Select your repository**
5. **Railway auto-detects and deploys**

### **Step 2: Configure Environment Variables**
In Railway project → Variables tab:

```
OPENAI_API_KEY=your_key_here
ALLOWED_ORIGINS=https://your-domain.railway.app
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=production
```

### **Step 3: Get Your URL**
After deployment, Railway will provide:
- **Single URL**: `https://your-app.railway.app`
- **API endpoints**: `https://your-app.railway.app/health`, `/discover`, etc.
- **Frontend**: `https://your-app.railway.app/` (main app)

## 🔄 **Service Updates**

### **Automatic Updates**
- **Push to GitHub** → Service auto-updates
- **Unified scaling** → Single service scales based on total traffic
- **Health monitoring** → Combined health checks

### **Manual Updates**
- **Redeploy** → Update entire service
- **Rollback** → Revert to previous version
- **Environment variables** → Update as needed

## 📊 **Monitoring & Scaling**

### **Unified Monitoring**
- **API requests**: Backend performance and errors
- **Frontend**: Build logs and runtime errors
- **Overall service**: Combined metrics and scaling

### **Auto-Scaling**
- **Unified scaling** → Scales based on total traffic
- **Resource optimization** → Shared resources between frontend/backend
- **Cost efficiency** → Single service pricing

## 🚫 **Common Issues & Solutions**

### **Build Failures**
- **Python dependencies**: Check `app/api/requirements.txt`
- **Node.js build**: Check `app/web/package.json`
- **Port conflicts**: Railway auto-assigns ports

### **Service Communication**
- **API routes**: Ensure they start with `/api/` or are properly configured
- **Frontend routing**: Check Next.js configuration
- **CORS**: Verify ALLOWED_ORIGINS includes your domain

## 🎯 **What Happens After Deployment**

1. **Railway creates 1 unified service** automatically
2. **Service includes both API and frontend** from single URL
3. **API endpoints work** at `/health`, `/discover`, etc.
4. **Frontend accessible** at the root domain
5. **Unified monitoring** and scaling

## 🔮 **Future Database Service**

When you add a database:
1. **Create database configuration** in Railway
2. **Add connection variables** to environment
3. **Database runs separately** but connects to your unified service
4. **Auto-provisions** database resources

## 📞 **Support**

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Nixpacks Docs**: [nixpacks.com](https://nixpacks.com)
- **Discord**: [discord.gg/railway](https://discord.gg/railway)

---

**Result**: 1 unified service, 1 deployment, full automation! 🚀
