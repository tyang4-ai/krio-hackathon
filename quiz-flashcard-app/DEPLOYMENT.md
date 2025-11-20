# Scholarly Deployment Quickstart Guide

This guide will help you deploy Scholarly to production in minutes.

## 🚀 Quick Deploy to Vercel (Recommended)

**Time: 10 minutes | Cost: FREE**

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Groq API key (free at console.groq.com)

### Steps

1. **Get Groq API Key (2 minutes)**
   ```
   1. Visit https://console.groq.com/
   2. Sign up (free)
   3. Click "API Keys" → "Create API Key"
   4. Copy the key
   ```

2. **Push to GitHub (if not already)**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy to Vercel**
   ```bash
   # Option A: Use Vercel Website (Easiest)
   1. Go to vercel.com
   2. Click "Import Project"
   3. Select your GitHub repository
   4. Add environment variables:
      - AI_PROVIDER = groq
      - GROQ_API_KEY = your_key_here
      - NODE_ENV = production
   5. Click "Deploy"

   # Option B: Use Vercel CLI
   npm install -g vercel
   cd quiz-flashcard-app
   vercel
   # Follow prompts and add environment variables
   ```

4. **Done!** Your app is live at `https://your-app.vercel.app`

**Estimated Costs:**
- Vercel: FREE (hobby plan)
- Groq API: FREE tier (generous limits)
- Total: $0/month for low-moderate traffic

---

## 🌐 Deploy to AWS

**Best for: Enterprise needs, existing AWS infrastructure**

### Option A: AWS Elastic Beanstalk (Easiest AWS Option)

**Time: 20 minutes | Cost: ~$20-50/month**

```bash
# 1. Install AWS CLI tools
pip install awscli awsebcli
aws configure  # Enter your AWS credentials

# 2. Initialize application
cd quiz-flashcard-app
eb init -p node.js scholarly-app
eb create scholarly-production

# 3. Set environment variables
eb setenv AI_PROVIDER=groq \
  GROQ_API_KEY=your_groq_key \
  NODE_ENV=production

# 4. Deploy
eb deploy

# 5. Open in browser
eb open
```

### Option B: AWS with Bedrock (Enterprise AI)

**Best for:** Maximum AWS integration, enterprise compliance

```bash
# 1. Enable Bedrock in AWS Console
# Go to AWS Bedrock → Model access → Enable models

# 2. Deploy with Bedrock
eb setenv AI_PROVIDER=bedrock \
  AWS_ACCESS_KEY_ID=your_key \
  AWS_SECRET_ACCESS_KEY=your_secret \
  AWS_REGION=us-east-1 \
  NODE_ENV=production

# 3. Deploy
eb deploy
```

**Estimated Costs:**
- EC2 instance: ~$15-30/month
- Bedrock API: ~$10-50/month (depends on usage)
- Total: $25-80/month

---

## 💻 Deploy to VPS (DigitalOcean, Linode, etc.)

**Best for: Full control, custom infrastructure**

**Time: 30 minutes | Cost: $5-20/month + AI costs**

```bash
# 1. Create Ubuntu 22.04 droplet on your VPS provider

# 2. SSH into server
ssh root@your-server-ip

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 4. Clone repository
git clone your-repository-url
cd quiz-flashcard-app/backend

# 5. Install dependencies
npm install --production

# 6. Configure environment
cp .env.example .env
nano .env
# Set: AI_PROVIDER=groq, GROQ_API_KEY=your_key, etc.

# 7. Install PM2 for process management
sudo npm install -g pm2
pm2 start src/index.js --name scholarly
pm2 save
pm2 startup

# 8. Configure firewall
sudo ufw allow 3001
sudo ufw enable

# 9. (Optional) Setup nginx reverse proxy for port 80/443
sudo apt install nginx
# Configure nginx to proxy to localhost:3001
```

**Estimated Costs:**
- VPS: $5-20/month
- Groq API: FREE tier
- Total: $5-20/month

---

## 🏠 Local Development Setup

**Cost: FREE | Perfect for testing**

### With Ollama (No API Costs)

```bash
# 1. Install Ollama
# macOS: brew install ollama
# Windows: Download from ollama.com
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# 2. Start Ollama and download model
ollama serve
ollama pull mistral

# 3. Configure app
cd quiz-flashcard-app/backend
cp .env.example .env
# Edit .env:
# AI_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1

# 4. Run backend
npm install
npm start

# 5. Run frontend (new terminal)
cd ../frontend
npm install
npm run dev

# 6. Open http://localhost:3000
```

---

## 🔄 Switching Providers After Deployment

You can switch AI providers anytime without code changes:

### Vercel
```bash
# Update environment variables in Vercel dashboard
# Or via CLI:
vercel env rm AI_PROVIDER
vercel env add AI_PROVIDER
# Enter: together (or groq, ollama, etc.)

vercel env add TOGETHER_API_KEY
# Enter your key

vercel --prod
```

### AWS Elastic Beanstalk
```bash
eb setenv AI_PROVIDER=together TOGETHER_API_KEY=your_key
```

### VPS
```bash
ssh your-server
cd quiz-flashcard-app/backend
nano .env  # Update AI_PROVIDER and keys
pm2 restart scholarly
```

---

## 📊 Provider Recommendations by Deployment

| Deployment Target | Recommended Provider | Why |
|-------------------|---------------------|-----|
| **Vercel** | Groq | Fastest, serverless-friendly, free tier |
| **AWS** | Bedrock | AWS integration, enterprise features |
| **VPS** | Together.ai or Groq | Good balance, affordable |
| **Local Dev** | Ollama | Free, fast iteration |
| **Budget Production** | Groq | Best free tier, great performance |
| **Enterprise** | AWS Bedrock | Compliance, provisioned throughput |

---

## 🐛 Troubleshooting

### "NVIDIA_API_KEY is required" error
**Fix:** Set `AI_PROVIDER` environment variable to your chosen provider (e.g., `groq`)

### "Failed to generate questions" error
**Check:**
1. API key is correct
2. Provider name is spelled correctly
3. You have credits/quota available
4. Network allows outbound HTTPS

### Vercel deployment times out
**Fix:**
- Use Groq (fastest inference)
- Or increase Vercel timeout in `vercel.json`

### Local Ollama not connecting
**Check:**
1. Ollama is running: `ollama list`
2. Base URL is correct: `http://localhost:11434/v1`
3. Model is downloaded: `ollama pull mistral`

---

## 📈 Scaling Considerations

### Up to 100 users
- **Vercel + Groq**: FREE or <$5/month
- No special configuration needed

### 100-1,000 users
- **Vercel + Groq**: ~$10-50/month
- Consider upgrading Vercel plan
- Monitor API quotas

### 1,000+ users
- **AWS + Bedrock**: $50-200/month
- Use provisioned throughput for cost savings
- Consider database migration to PostgreSQL
- Add Redis caching layer
- Implement rate limiting

---

## 🔐 Security Checklist for Production

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique API keys
- [ ] Enable HTTPS (automatic on Vercel/AWS)
- [ ] Set up CORS properly (limit origins)
- [ ] Add rate limiting middleware
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Don't commit `.env` file to git
- [ ] Use environment variables for all secrets
- [ ] Enable monitoring/logging
- [ ] Set up automated backups

---

## 📞 Next Steps After Deployment

1. **Test the deployment:**
   - Upload a document
   - Generate questions
   - Take a quiz
   - Check all features work

2. **Monitor costs:**
   - Check AI provider dashboard weekly
   - Set up billing alerts
   - Monitor usage logs

3. **Performance optimization:**
   - Add database indexes (see README)
   - Implement caching if needed
   - Monitor response times

4. **Backup setup:**
   - Export database regularly
   - Set up automated backups
   - Test restore procedure

---

## 💡 Pro Tips

1. **Start with Groq** - Easiest to set up, great free tier
2. **Test locally with Ollama** - Save API costs during development
3. **Use environment-specific configs** - Different providers for dev/staging/prod
4. **Monitor usage** - Set up alerts before hitting limits
5. **Keep provider flexibility** - The multi-provider setup lets you switch anytime

---

## 🆘 Need Help?

- GitHub Issues: [Your repo]/issues
- Check logs: `vercel logs` or `pm2 logs scholarly`
- AI Provider docs:
  - Groq: console.groq.com/docs
  - Together: docs.together.ai
  - AWS Bedrock: docs.aws.amazon.com/bedrock

---

**Ready to deploy? Pick your platform above and follow the steps!** 🚀
