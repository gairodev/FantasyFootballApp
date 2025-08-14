# 🗄️ Railway PostgreSQL Setup Guide

This guide will help you set up PostgreSQL on Railway for your Fantasy Football Draft Assistant API.

## 🚀 **Step 1: Create PostgreSQL Service on Railway**

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo" or "Start from scratch"

3. **Add PostgreSQL Service**
   - Click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL database

4. **Get Database Connection Details**
   - Click on your PostgreSQL service
   - Go to "Connect" tab
   - Copy the `DATABASE_URL` (this is what you'll use)

## 🔧 **Step 2: Configure Environment Variables**

In your **API service** (not the database service), set these environment variables:

### **Required Variables:**
```
DATABASE_URL=postgresql://username:password@host:port/database_name
```

### **Optional Variables (if you want to customize):**
```
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### **Other Required Variables:**
```
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app,http://localhost:3000
SLEEPER_BASE_URL=https://api.sleeper.app
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

## 📁 **Step 3: Update Railway Configuration**

Make sure your `railway.toml` has the correct start command:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python main_simple.py"
healthcheckPath = "/health"
healthcheckTimeout = 300

[env]
HOST = "0.0.0.0"
PORT = "8000"
```

## 🗃️ **Step 4: Database Schema**

The API will automatically create the required tables on startup:

### **Tables Created:**
- `users` - User information from Sleeper
- `leagues` - League details and settings
- `user_leagues` - User-league relationships
- `drafts` - Draft information
- `picks` - Individual draft picks
- `players` - NFL player data
- `recommendations` - AI-generated recommendations

### **Key Features:**
- ✅ **Automatic table creation** on startup
- ✅ **JSONB fields** for flexible data storage
- ✅ **Proper indexing** for performance
- ✅ **Foreign key relationships** for data integrity

## 🔍 **Step 5: Test Database Connection**

1. **Deploy your API service**
2. **Check the logs** for database connection status
3. **Visit the health endpoint** `/health` to verify everything is working

### **Expected Log Output:**
```
✅ Database connection successful
✅ Database tables initialized successfully
```

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Database connection failed"**
   - Check `DATABASE_URL` is correct
   - Ensure PostgreSQL service is running
   - Verify network access between services

2. **"Database initialization failed"**
   - Check database permissions
   - Verify PostgreSQL version compatibility
   - Check logs for specific error messages

3. **"Module not found: asyncpg"**
   - Ensure `requirements.txt` includes `asyncpg>=0.29.0`
   - Redeploy after updating requirements

### **Debug Commands:**
```bash
# Check database connection
railway logs

# Test database directly
railway connect postgresql
```

## 📊 **Database Performance**

### **Connection Pooling:**
- **Min connections**: 1
- **Max connections**: 10
- **Automatic scaling** based on load

### **Caching Strategy:**
- **API responses**: In-memory cache (3 seconds)
- **Player data**: Database storage + cache
- **Recommendations**: Database storage for analytics

## 🔐 **Security Considerations**

1. **Environment Variables**: Never commit secrets to Git
2. **Database Access**: Railway handles network security
3. **CORS**: Configure `ALLOWED_ORIGINS` properly
4. **Input Validation**: All inputs are validated via Pydantic models

## 📈 **Monitoring & Scaling**

### **Railway Dashboard:**
- Monitor database connections
- Track API response times
- View error rates and logs

### **Health Endpoints:**
- `/health` - Basic health check
- `/` - API status and version

## 🎯 **Next Steps**

After setting up PostgreSQL:

1. **Deploy your API service** to Railway
2. **Set the `NEXT_PUBLIC_API_URL`** in your frontend service
3. **Test the full application** end-to-end
4. **Monitor performance** and adjust as needed

## 📞 **Support**

If you encounter issues:
1. Check Railway logs first
2. Verify environment variables
3. Test database connection manually
4. Check the health endpoint for status

---

**🎉 You're now ready to deploy your Fantasy Football Draft Assistant with PostgreSQL on Railway!**
