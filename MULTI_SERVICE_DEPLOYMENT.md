# 🚂 Multi-Service Railway Deployment Guide

This guide explains how Railway will automatically detect and deploy your **3 separate services** as one unified project.

## 🏗️ **Service Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project                         │
├─────────────────────────────────────────────────────────────┤
│  📡 API Service (Python/FastAPI)                          │
│  • Source: app/api/                                        │
│  • Port: 8000 (auto-assigned)                             │
│  • Health: /health                                         │
│  • Endpoints: /discover, /drafts, /recommend, etc.        │
├─────────────────────────────────────────────────────────────┤
│  🌐 Web Service (Next.js/React)                           │
│  • Source: app/web/                                        │
│  • Port: 3000 (auto-assigned)                             │
│  • Health: /                                               │
│  • Frontend: Draft board, league selector, etc.           │
├─────────────────────────────────────────────────────────────┤
│  🗄️  Database Service (Future)                            │
│  • Will be auto-detected when added                        │
│  • PostgreSQL/MySQL support                                │
│  • Auto-scaling and backups                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **How Auto-Deployment Works**

### 1. **Service Detection**
Railway automatically detects multiple services based on:
- **`railway.json`** - Defines service structure
- **`app/api/nixpacks.toml`** - Python API configuration
- **`app/web/nixpacks.toml`** - Next.js web configuration
- **Directory structure** - `app/api/` and `app/web/`

### 2. **Automatic Build Process**
```
Railway scans repo
    ↓
Detects 3 services
    ↓
Builds each service independently
    ↓
Deploys all services
    ↓
Generates URLs for each
    ↓
Sets up inter-service communication
```

### 3. **Service Communication**
- **Web → API**: Frontend calls backend via environment variables
- **Auto-discovery**: Railway provides service URLs automatically
- **Health checks**: Each service has independent monitoring

## 🔧 **Deployment Steps**

### **Step 1: Deploy to Railway**
1. **Push code** to GitHub
2. **Go to [railway.app](https://railway.app)**
3. **New Project** → "Deploy from GitHub repo"
4. **Select your repository**
5. **Railway auto-detects all services**

### **Step 2: Configure Environment Variables**
Railway will create a project with multiple services. Set these variables:

#### **API Service Variables:**
```
OPENAI_API_KEY=your_key_here
ALLOWED_ORIGINS=https://your-web-domain.railway.app
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
```

#### **Web Service Variables:**
```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NODE_ENV=production
```

### **Step 3: Get Service URLs**
After deployment, Railway will provide:
- **API URL**: `https://your-api.railway.app`
- **Web URL**: `https://your-web.railway.app`
- **Health endpoints**: `/health` (API) and `/` (Web)

## 🔄 **Service Updates**

### **Automatic Updates**
- **Push to GitHub** → All services auto-update
- **Independent scaling** → Each service scales based on its own traffic
- **Health monitoring** → Each service has independent health checks

### **Manual Updates**
- **Individual service redeploy** → Update just one service
- **Rollback** → Revert specific service to previous version
- **Environment variables** → Update per service

## 📊 **Monitoring & Scaling**

### **Per-Service Monitoring**
- **API Service**: Request logs, response times, error rates
- **Web Service**: Build logs, frontend errors, performance
- **Database Service**: Query performance, connection pools

### **Auto-Scaling**
- **API**: Scales based on HTTP request volume
- **Web**: Scales based on frontend traffic
- **Database**: Scales based on query load

## 🚫 **Common Issues & Solutions**

### **Service Not Detected**
- Check `railway.json` syntax
- Verify directory structure
- Ensure `nixpacks.toml` files exist

### **Build Failures**
- **API**: Check `requirements.txt` and Python version
- **Web**: Check `package.json` and Node.js version
- **Database**: Check connection strings and credentials

### **Service Communication**
- Verify environment variables are set
- Check CORS settings in API
- Ensure service URLs are correct

## 🎯 **What Happens After Deployment**

1. **Railway creates 3 services** automatically
2. **Each service gets its own URL** and monitoring
3. **Services can communicate** via environment variables
4. **Auto-scaling** based on individual service traffic
5. **Unified project dashboard** for managing all services

## 🔮 **Future Database Service**

When you add a database:
1. **Create `app/database/`** directory
2. **Add database configuration** to `railway.json`
3. **Railway auto-detects** and deploys it
4. **Auto-provisions** database resources
5. **Sets up connections** between services

## 📞 **Support**

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Multi-service Guide**: [railway.app/docs/deploy/deployments/multi-service](https://railway.app/docs/deploy/deployments/multi-service)
- **Discord**: [discord.gg/railway](https://discord.gg/railway)

---

**Result**: 3 separate services, 1 deployment, full automation! 🚀
