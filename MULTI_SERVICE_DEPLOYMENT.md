# 🚂 Multi-Service Railway Deployment Guide

This guide explains how Railway will automatically detect and deploy your **4 separate services** as one unified project.

## 🏗️ **Service Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project                         │
├─────────────────────────────────────────────────────────────┤
│  🌐 Web Service (Next.js/React)                           │
│  • Source: app/web/                                        │
│  • Port: 3000 (auto-assigned)                             │
│  • Health: /                                               │
│  • Frontend: Draft board, league selector, real-time UI   │
├─────────────────────────────────────────────────────────────┤
│  📡 API Service (Python/FastAPI)                          │
│  • Source: app/api/                                        │
│  • Port: 8000 (auto-assigned)                             │
│  • Health: /health                                         │
│  • Endpoints: /discover, /drafts, /recommend, etc.        │
├─────────────────────────────────────────────────────────────┤
│  🗄️ Database Service (PostgreSQL)                          │
│  • Auto-provisioned by Railway                            │
│  • Optimized for fast queries                             │
│  • Purpose: Draft state, player rankings, user data       │
├─────────────────────────────────────────────────────────────┤
│  🤖 AI Service (OpenAI Integration)                       │
│  • Async processing for recommendations                   │
│  • Queue-based system                                     │
│  • Non-blocking during draft decisions                    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **How Auto-Deployment Works**

### 1. **Service Detection**
Railway automatically detects multiple services based on:
- **`railway.json`** - Defines service structure
- **`app/web/nixpacks.toml`** - Next.js web configuration
- **`app/api/nixpacks.toml`** - Python API configuration
- **Directory structure** - `app/web/` and `app/api/`

### 2. **Automatic Build Process**
```
Railway scans repo
    ↓
Detects 4 services
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
- **API → Database**: Direct database connections
- **API → AI**: Async queue-based communication
- **Auto-discovery**: Railway provides service URLs automatically

## 🔧 **Deployment Steps**

### **Step 1: Deploy to Railway**
1. **Push code** to GitHub
2. **Go to [railway.app](https://railway.app)**
3. **New Project** → "Deploy from GitHub repo"
4. **Select your repository**
5. **Railway auto-detects all services**

### **Step 2: Configure Environment Variables**
Railway will create a project with multiple services. Set these variables:

#### **Web Service Variables:**
```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NODE_ENV=production
```

#### **API Service Variables:**
```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-web-domain.railway.app
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string
```

### **Step 3: Get Service URLs**
After deployment, Railway will provide:
- **Web URL**: `https://your-web.railway.app`
- **API URL**: `https://your-api.railway.app`
- **Health endpoints**: `/` (Web) and `/health` (API)

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
- **Web Service**: Build logs, frontend errors, performance
- **API Service**: Request logs, response times, error rates
- **Database Service**: Query performance, connection pools
- **AI Service**: Processing times, queue status

### **Auto-Scaling**
- **Web**: Scales based on frontend traffic
- **API**: Scales based on HTTP request volume
- **Database**: Scales based on query load
- **AI**: Scales based on recommendation queue

## 🚫 **Common Issues & Solutions**

### **Service Not Detected**
- Check `railway.json` syntax
- Verify directory structure
- Ensure `nixpacks.toml` files exist in each service directory

### **Build Failures**
- **Web**: Check `package.json` and Node.js version
- **API**: Check `requirements.txt` and Python version
- **Database**: Check connection strings and credentials

### **Service Communication**
- Verify environment variables are set
- Check CORS settings in API
- Ensure service URLs are correct

## 🎯 **What Happens After Deployment**

1. **Railway creates 4 services** automatically
2. **Each service gets its own URL** and monitoring
3. **Services can communicate** via environment variables
4. **Auto-scaling** based on individual service traffic
5. **Unified project dashboard** for managing all services

## 🔮 **Database & AI Services**

### **Database Service**
- **Auto-provisioned** by Railway
- **PostgreSQL** with connection pooling
- **Optimized indexes** for fast queries
- **Read replicas** for performance

### **AI Service**
- **Async processing** - never blocks drafts
- **Queue system** for recommendations
- **Cached results** for similar situations
- **Fallback logic** if AI is slow

## 📞 **Support**

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Multi-service Guide**: [railway.app/docs/deploy/deployments/multi-service](https://railway.app/docs/deploy/deployments/multi-service)
- **Discord**: [discord.gg/railway](https://discord.gg/railway)

---

**Result**: 4 separate services, 1 deployment, full automation, optimal performance! 🚀
