# Sleeper Draft Assistant

An intelligent fantasy football draft assistant that combines deterministic VORP-based scoring with AI-powered tie-breaking using OpenAI's GPT models.

## 🎯 Features

- **Live Draft Monitoring**: Real-time polling of Sleeper draft picks
- **Deterministic Scoring**: VORP + roster needs + positional scarcity + ADP analysis
- **AI-Powered Tie-Breaking**: OpenAI GPT integration for nuanced draft decisions
- **Strategy Tuning**: Safe, balanced, and upside drafting strategies
- **Live Recommendations**: Top-N picks with detailed reasoning and edge analysis
- **Responsive UI**: Modern React/Next.js frontend with real-time updates

## 🏗️ Architecture

```
/web   - React/Next.js frontend with real-time draft board
/api   - FastAPI backend with Sleeper API integration
/core  - Shared TypeScript logic for types and ranking algorithms
```

### Key Components

- **Frontend**: React components for league selection, draft board, and recommendations
- **Backend**: FastAPI with endpoints for discovery, drafts, picks, and AI recommendations
- **Core Logic**: Deterministic scoring algorithm with configurable strategy weights
- **AI Integration**: OpenAI GPT for intelligent tie-breaking and reasoning

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- OpenAI API key (optional, for AI recommendations)

### 🚂 Railway Deployment

For quick deployment to Railway (recommended):

1. **Fork/Clone** this repository to your GitHub account
2. **Connect to Railway**: Go to [railway.app](https://railway.app) and deploy from GitHub
3. **Configure Environment Variables** (see [DEPLOYMENT.md](./DEPLOYMENT.md) for details)
4. **Deploy**: Railway will automatically build and deploy both services

**Deployment Time**: ~5-10 minutes
**Cost**: Free tier available for development

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### 1. Clone and Setup

```bash
git clone <repository-url>
cd FantasyFootballApp
```

### 2. Backend Setup

```bash
cd app/api
pip install -r requirements.txt
cp env.example .env
# Edit .env with your OpenAI API key if desired
```

### 3. Frontend Setup

```bash
cd app/web
npm install
```

### 4. Environment Configuration

Create a `.env` file in `app/api/`:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (defaults shown)
HOST=0.0.0.0
PORT=8000
DEBUG=false
ALLOWED_ORIGINS=http://localhost:3000
CACHE_TTL_SECONDS=3
OPENAI_MODEL=gpt-4o-mini
```

### 5. Start the Services

**Backend (Terminal 1):**
```bash
cd app/api
python main.py
```

**Frontend (Terminal 2):**
```bash
cd app/web
npm run dev
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📊 How It Works

### 1. Discovery Phase
- Input Sleeper username → auto-discovers leagues and drafts
- Fetches league settings, scoring, and roster requirements

### 2. Live Draft Monitoring
- Polls `/picks` endpoint every 3 seconds for live updates
- Maintains remaining player pool (drafted players excluded)
- Tracks current pick, round, and team on clock

### 3. Deterministic Scoring
```
score = vorp*w1 + adp_discount*w2 + roster_need*w3 + 
        scarcity*w4 - bye_penalty*w5 - injury*w6 + upside*w7
```

**Strategy Weights:**
- **Safe**: Higher roster completion, lower risk
- **Balanced**: Equal consideration of all factors
- **Upside**: Higher emphasis on potential and scarcity

### 4. AI Tie-Breaking
- Top 8 candidates sent to OpenAI GPT
- Structured JSON output with reasoning
- Fallback to deterministic if AI fails

### 5. Recommendation Display
- Ranked list with detailed scoring breakdown
- Visual indicators for fit type (need, value, upside, safe)
- Edge analysis vs. next best option

## 🔧 API Endpoints

### Core Endpoints

- `GET /discover?username&season` - Discover user leagues
- `GET /drafts?league_id` - Get league drafts
- `GET /picks?draft_id` - Get draft picks (live)
- `GET /players` - Get NFL player database
- `POST /recommend` - Get AI-powered recommendations

### Recommendation Request

```json
{
  "draft_id": "string",
  "team_on_clock": "string",
  "strategy": "safe|balanced|upside"
}
```

### Recommendation Response

```json
{
  "ranked": [
    {
      "player_id": "string",
      "reason": "string",
      "fit": "value|need|stack|upside|safe",
      "edge_vs_next": 0.5,
      "score": 85.2,
      "vorp": 45.0,
      "adp_discount": 12.0,
      "need_boost": 0.8,
      "scarcity_boost": 25.0,
      "bye_penalty": 0.0,
      "injury_penalty": 0.0,
      "upside_bonus": 15.0
    }
  ],
  "generated_at": 1703123456,
  "strategy": "balanced",
  "llm_enabled": true
}
```

## 🧪 Testing

### Backend Testing

```bash
cd app/api
python test_api.py
```

### Manual Testing

1. Start both services
2. Navigate to http://localhost:3000
3. Enter a valid Sleeper username
4. Select a league and draft
5. Verify recommendations appear

## 🔒 Security & Best Practices

- **API Keys**: Never commit OpenAI API keys to version control
- **Rate Limiting**: Built-in caching to respect Sleeper API limits
- **Error Handling**: Graceful fallbacks when external services fail
- **Input Validation**: Pydantic models for request/response validation

## 🚧 Limitations & Future Improvements

### Current Limitations
- Simplified roster need calculation
- Basic bye week conflict detection
- Limited keeper/trade pick handling

### Planned Enhancements
- Advanced roster construction analysis
- Multi-team bye week optimization
- Trade pick value analysis
- Historical draft performance tracking
- Custom strategy creation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review the test output from `test_api.py`
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

## 🎉 Acknowledgments

- Sleeper API for fantasy football data
- OpenAI for AI-powered decision making
- FastAPI for robust backend framework
- Next.js for modern React frontend
