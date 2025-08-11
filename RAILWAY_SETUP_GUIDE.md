# 🚂 Railway Setup Guide - Get Your App Running!

This guide will help you get both your frontend URL and API backend connection working in Railway.

## 🌐 **Step 1: Get Your Frontend URL**

### **Check Railway Dashboard:**
1. **Go to [railway.app](https://railway.app)** and open your project
2. **Click on "Settings" tab**
3. **Look for "Domains" section**
4. **Click "Generate Domain"** or "Add Domain"
5. **Copy the URL** (e.g., `https://your-app.railway.app`)

### **If No Domains Section:**
- **Go to "Deployments" tab**
- **Click on your latest deployment**
- **Look for "Domains" or "URLs"**
- **Generate a domain if none exists**

## 🔗 **Step 2: Get Your API URL**

### **Check API Service:**
1. **In Railway dashboard**, look for your API service
2. **It should have its own domain** (e.g., `https://your-api.railway.app`)
3. **Copy the API URL**

### **If API Service Not Showing:**
- **Check "Services" tab** in your project
- **Look for Python/FastAPI service**
- **Generate domain for it**

## ⚙️ **Step 3: Configure Environment Variables**

### **For Frontend Service:**
Add this environment variable:
```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
```

### **For API Service:**
Add these environment variables:
```
OPENAI_API_KEY=your_openai_key_here
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
```

## 🔧 **Step 4: Test Your Setup**

### **Test Frontend:**
1. **Visit your frontend URL** (e.g., `https://your-app.railway.app`)
2. **You should see** the Fantasy Football app interface
3. **Try entering a username** to test API connection

### **Test API:**
1. **Visit your API health endpoint** (e.g., `https://your-api.railway.app/health`)
2. **You should see** a health status response
3. **Test API docs** at `/docs` endpoint

## 🚫 **Common Issues & Solutions**

### **Frontend Not Loading:**
- **Check domain generation** in Railway settings
- **Verify build completed** successfully
- **Check deployment logs** for errors

### **API Connection Failing:**
- **Verify `NEXT_PUBLIC_API_URL`** is set correctly
- **Check CORS settings** in your API
- **Ensure API service** has a domain
- **Test API directly** before testing frontend

### **CORS Errors:**
- **Update `ALLOWED_ORIGINS`** to include your frontend domain
- **Redeploy API service** after changing CORS
- **Check browser console** for CORS error details

## 📱 **Step 5: Test Full App Flow**

1. **Open frontend** in browser
2. **Enter a Sleeper username** (e.g., "testuser")
3. **Click "Discover"** button
4. **Check browser console** for any errors
5. **Verify API calls** are going to correct backend URL

## 🔍 **Debugging Tips**

### **Check Browser Console:**
- **Network tab** to see API calls
- **Console tab** for JavaScript errors
- **Verify API calls** are going to correct URL

### **Check Railway Logs:**
- **API service logs** for backend errors
- **Frontend service logs** for build issues
- **Deployment logs** for setup problems

### **Test API Endpoints:**
```bash
# Test health endpoint
curl https://your-api.railway.app/health

# Test discover endpoint
curl "https://your-api.railway.app/discover?username=testuser&season=2024"
```

## 🎯 **Expected Result:**

✅ **Frontend loads** at your Railway domain  
✅ **API responds** at your API domain  
✅ **Frontend can call API** successfully  
✅ **No CORS errors** in browser console  
✅ **Full app functionality** working  

## 📞 **Need Help?**

- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Check deployment logs** for specific errors
- **Verify environment variables** are set correctly
- **Test each service independently** first

---

**Once working**: Your Fantasy Football app will be fully functional with AI-powered draft recommendations! 🚀
