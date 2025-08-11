# 🚂 Railway Deployment Checklist

## ✅ Pre-Deployment
- [ ] GitHub repository is public or you have Railway Pro
- [ ] OpenAI API key ready (if using AI features)
- [ ] Railway account created at [railway.app](https://railway.app)

## 🚀 Deployment Steps
1. **Go to Railway**: [railway.app](https://railway.app)
2. **New Project** → "Deploy from GitHub repo"
3. **Select Repository**: Choose your Fantasy Football app repo
4. **Wait for Build**: Railway will auto-detect Python app
5. **Configure Variables**: Add environment variables (see below)

## 🔧 Environment Variables
Add these in Railway project → Variables tab:

```
OPENAI_API_KEY=your_key_here
ALLOWED_ORIGINS=https://your-domain.railway.app
SLEEPER_BASE_URL=https://api.sleeper.app
CACHE_TTL_SECONDS=300
OPENAI_MODEL=gpt-4o-mini
```

## 🌐 Get Your URLs
- **API URL**: Check the generated domain in Railway
- **Health Check**: Visit `/health` endpoint
- **API Docs**: Visit `/docs` endpoint

## 🧪 Test Deployment
1. **Health Check**: `curl https://your-api.railway.app/health`
2. **Frontend**: Deploy web service separately if needed
3. **API Test**: Try the `/discover` endpoint

## 📝 Common Issues
- **Build Fails**: Check requirements.txt has all dependencies
- **Port Errors**: Railway auto-assigns ports
- **CORS Issues**: Update ALLOWED_ORIGINS with your domain
- **API Key**: Ensure OpenAI key is set correctly

## 🎯 Next Steps
- [ ] Test all API endpoints
- [ ] Deploy frontend (if separate)
- [ ] Set up custom domain (optional)
- [ ] Monitor logs and performance

## 📞 Need Help?
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check status: [status.railway.app](https://status.railway.app)

---
**Deployment Time**: ~5-10 minutes  
**Cost**: Free tier available  
**Auto-scaling**: Yes, built-in
