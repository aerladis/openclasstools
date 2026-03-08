# OpenClassTools (BerkAI Game Hub) - Agent Guide

## Project Overview

OpenClassTools is a modern, interactive web-based party games platform designed for groups, classrooms, and social gatherings. It features a collection of classic party games with AI-powered content generation and real-time multiplayer capabilities via Socket.IO.

**Key Characteristics:**
- Zero database required - uses flat-file storage (`list.txt`)
- AI-powered content generation via Google Gemini API
- Glassmorphism UI design with particle backgrounds
- Real-time host-admin synchronization for remote game management
- Fully modular architecture - each game is self-contained

## Included Games

1. **Who Am I?** (`who.html`, `game.js`, `style.css`) - Character guessing game with countdown timer
2. **Taboo** (`taboo.html`, `taboo.js`, `taboo.css`) - Word description game with forbidden words, teams, and scoring
3. **Hangman** (`hangman.html`, `hangman.js`, `hangman.css`) - Classic word guessing with SVG gallows
4. **Spin the Bottle** (`bottle.html`, `bottle.js`, `bottle.css`) - Physics-based bottle spinner
5. **Wheel of Names** (`wheel.html`, `wheel.js`, `wheel.css`) - Customizable spinning wheel selector
6. **Who Wants to Be a Millionaire** (`millionaire.html`, `millionaire.js`, `millionaire.css`) - Quiz show with 15 questions, lifelines, and progressive difficulty
7. **Kelime Oyunu** (`kelime.html`, `kelime.js`, `kelime.css`) - Turkish word game with letter reveal, timer, scoring, and AI question generation
8. **Flappy Crocodile** (`FlappyCrocodile/`) - Canvas-based arcade game (self-contained subdirectory)

## Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+), Canvas API
- **Backend**: Node.js, Express.js (v4.21.2), Socket.IO (v4.8.3)
- **AI Integration**: Google Gemini API (`gemini-2.5-flash` model)
- **Dependencies**: `dotenv` for environment variables
- **Deployment**: Node.js server with optional nginx reverse proxy

## Project Structure

```
project-root/
├── server.js              # Express server + Socket.IO + Gemini API routes
├── package.json           # Node.js dependencies and scripts
├── .env                   # Environment variables (GEMINI_API_KEY, PORT)
├── .env.example           # Template for environment variables
├── list.txt               # Default character list for "Who Am I?"
├── nginx-play.conf        # Nginx reverse proxy configuration
├── uploads/               # Temporary file upload directory
│
├── index.html             # Game hub / main menu
├── hub.css                # Hub styling with glassmorphism design
│
├── who.html               # "Who Am I?" game page
├── game.js                # "Who Am I?" game logic + particle background
├── style.css              # Shared styles for "Who Am I?" (base glassmorphism)
│
├── taboo.html             # Taboo game page
├── taboo.js               # Taboo game logic
├── taboo.css              # Taboo-specific styles
│
├── hangman.html           # Hangman game page
├── hangman.js             # Hangman game logic
├── hangman.css            # Hangman-specific styles
│
├── millionaire.html       # Millionaire game page
├── millionaire.js         # Millionaire game logic
├── millionaire.css        # Millionaire-specific styles
│
├── bottle.html            # Spin the Bottle game page
├── bottle.js              # Bottle spinner logic
├── bottle.css             # Bottle-specific styles
│
├── wheel.html             # Wheel of Names game page
├── wheel.js               # Wheel spinner logic
├── wheel.css              # Wheel-specific styles
│
├── book-upload.js         # Shared book upload component
├── book-upload.css        # Book upload component styles
│
├── admin.html             # Admin panel for remote monitoring
├── admin.js               # Admin panel logic (Socket.IO client)
├── admin.css              # Admin panel styles
│
└── FlappyCrocodile/       # Self-contained arcade game
    ├── index.html
    ├── script.js
    └── style.css
```

## Build and Run Commands

```bash
# Install dependencies
npm install

# Start the server (production)
npm start
# or
node server.js

# Development mode (same as start)
npm run dev
```

The server runs on `http://localhost:8090` by default (configurable via PORT env var).

## Configuration

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=8090
```

**Required:** Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## API Endpoints

### POST `/api/generate`
Generate character list for "Who Am I?"
- Body: `{ theme: string, count: number }`
- Saves result to `list.txt`

### POST `/api/generate-taboo`
Generate Taboo cards
- Body: `{ theme: string, count: number }`
- Returns: `{ success: true, cards: [{ word, forbidden[] }] }`

### POST `/api/generate-hangman`
Generate Hangman words
- Body: `{ theme: string, count: number }`
- Returns: `{ success: true, words: string[] }`

### POST `/api/generate-millionaire`
Generate Millionaire quiz questions
- Body: `{ theme: string }`
- Returns: `{ success: true, questions: [{ question, options[], correct }] }`

### POST `/api/generate-kelime`
Generate Kelime Oyunu questions (Turkish word game)
- Body: `{ theme: string, count: number }`
- Returns: `{ success: true, questions: [{ question, answer }] }`

### POST `/api/upload-book`
Upload book screenshots/images and extract topics using AI Vision
- Content-Type: `multipart/form-data`
- Body: `{ images: File[], gameType: string }`
- Returns: `{ success: true, extractedText, topicData: { title, description, themes[], keyTerms[], difficulty } }`

### POST `/api/generate-from-book`
Generate game content from extracted book text
- Body: `{ content: string, gameType: 'whoami'|'taboo'|'hangman'|'millionaire', theme?: string, count?: number }`
- Returns: Game-specific data (characters, cards, words, or questions)

### File Upload
The server supports uploading book screenshots (JPG, PNG, WEBP) up to 10MB per file, max 5 files.
Gemini Vision API extracts text from images, then generates game topics automatically.

## Socket.IO Events

### Host Events (Game Pages)
- `hostJoin(gameId, callback)` - Host joins a game room
  - Callback: `{ success: true, gameId }` or `{ success: false, error }`
  - Prevents multiple hosts with same game ID
- `hostUpdate(data)` - Broadcast game state to admins
  - Data: `{ gameId, type, game, ...state }`
  - Millionaire: `{ gameId, type: 'millionaire', level, prize, targetPrize, question, options, lifelines, timeRemaining, state }`
- `syncWordList(data)` - Sync word list to admin panel
  - Data: `{ gameId, type, characters/words/cards }`
- `hostSendState()` - Respond to state request from admin
- `hostLifelineAction(data)` - (Millionaire) Handle lifeline from admin
  - Data: `{ gameId, action: 'useLifeline', lifeline: 'fiftyFifty' | 'phoneFriend' | 'askAudience' }`

### Admin Events
- `adminJoin(gameId, callback)` - Admin joins a game room
  - Callback: `{ success: true, message }` or `{ success: false, error }`
  - Error if game doesn't exist
- `requestState(gameId)` - Request current game state
- `updateWordListAdmin(data)` - Update word list from admin
  - Data: `{ gameId, action, index?, value? }`
- `adminUpdateHost(data)` - Send commands from admin to host (Kelime Oyunu)
  - Data: `{ gameId, action: 'NEXT_QUESTION'|'PREV_QUESTION'|'REVEAL_LETTER'|'TOGGLE_TIMER'|'CORRECT_ANSWER'|... }`
- `adminLifelineAction(data)` - (Millionaire) Trigger lifeline from admin panel
  - Data: `{ gameId, action: 'useLifeline', lifeline }`

### Broadcast Events
- `adminUpdate(data)` - Game state update to admins
  - Kelime Oyunu: `{ game, currentIndex, totalQuestions, currentWord, question, revealedLetters, score, potentialScore, timeRemaining, isTimerRunning }`
- `adminWordListSync(data)` - Word list sync to admins
- `hostWordListUpdate(data)` - Word list update from admin
- `hostLifelineAction(data)` - (Millionaire) Lifeline action to host

## Code Style Guidelines

### JavaScript
- Use ES6+ modules (`type: "module"` in package.json)
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks
- Async/await for asynchronous operations
- Comments use `/* === Section === */` style for major sections

### CSS
- CSS custom properties (variables) for theming
- Glassmorphism pattern: `backdrop-filter: blur()`, semi-transparent backgrounds
- Mobile-first responsive design with `@media` queries
- Color palette: violet (#a855f7), indigo (#6366f1), pink (#ec4899)
- Font: 'Outfit' from Google Fonts

### HTML
- Semantic HTML5 elements
- Viewport meta tag for mobile: `maximum-scale=1.0, user-scalable=no`
- Data URI SVG favicons with emoji
- Preconnect to Google Fonts for performance

## Game Development Conventions

### Adding a New Game

1. Create `{game}.html`, `{game}.js`, `{game}.css` files
2. Include standard structure:
   - Particle canvas background
   - Screen-based UI with `.screen` and `.glass-card` classes
   - Socket.IO client script: `<script src="/socket.io/socket.io.js"></script>`
3. Include `gameId` generation for admin compatibility:
   ```javascript
   const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
   ```
4. Emit `hostJoin` and `hostUpdate` events for admin panel integration
5. Add game card to `index.html` hub
6. Link back to main menu: `<a href="index.html">🏠 Main Menu</a>`

### UI Patterns
- Use `.screen` class for view containers, toggle with `.active` class
- Primary button: `.btn-primary` with gradient and pulse animation
- Secondary button: `.btn-secondary` with glass effect
- Accent button: `.btn-accent` for AI generation actions
- Input fields: `.theme-input` class with glass styling

## Testing

No automated test suite is configured. Testing is manual:

1. Start server: `node server.js`
2. Open `http://localhost:8090` in browser
3. Test each game flow from start to finish
4. Test AI generation features (requires valid GEMINI_API_KEY)
5. Test admin panel by:
   - Opening a game (note the Game ID)
   - Opening `admin.html` in another tab
   - Entering the Game ID to connect
   - Verifying real-time updates

## Deployment

### Direct Node.js
```bash
node server.js
```

### With Nginx (Reverse Proxy)
Use the provided `nginx-play.conf` as a template:
- Sets up WebSocket support for Socket.IO
- Proxies to localhost:8090
- Handles upgrade headers for real-time communication

### Environment Requirements
- Node.js v16+
- Valid GEMINI_API_KEY in environment
- Port 8090 available (or configure via PORT env var)

## VPS Deployment (play.berkaybilge.space)

### Quick Deploy
The repository includes a `deploy.sh` script for automated VPS deployment.

**Prerequisites:**
- Ubuntu 20.04+ VPS with SSH access
- SSH key configured for authentication
- Domain `play.berkaybilge.space` pointing to VPS IP

**Deployment Steps:**

1. **Copy project to VPS:**
   ```bash
   # From local machine
   scp -r . user@vps-ip:/tmp/openclasstools
   
   # Or clone from git
   git clone <repo-url> /tmp/openclasstools
   ```

2. **Run deployment script on VPS:**
   ```bash
   cd /tmp/openclasstools
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script will:
- Install Node.js 18 LTS, Nginx, and PM2
- Copy application files to `/var/www/play.berkaybilge.space`
- Install npm dependencies
- Configure Nginx reverse proxy
- Setup PM2 process manager with auto-restart
- Configure UFW firewall

### Manual VPS Setup

If you prefer manual deployment:

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git

# 2. Setup app directory
sudo mkdir -p /var/www/play.berkaybilge.space
sudo chown $USER:$USER /var/www/play.berkaybilge.space

# 3. Deploy files
cd /var/www/play.berkaybilge.space
git clone <repo-url> . || cp -r /local/path/* .

# 4. Install dependencies
npm install --production

# 5. Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
PORT=8090
EOF

# 6. Install PM2
sudo npm install -g pm2

# 7. Start with PM2
pm2 start server.js --name openclasstools
pm2 save
pm2 startup

# 8. Configure Nginx
sudo tee /etc/nginx/sites-available/play.berkaybilge.space << 'EOF'
server {
    listen 80;
    server_name play.berkaybilge.space;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/play.berkaybilge.space /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 9. Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable
```

### SSL with Let's Encrypt

After initial deployment:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d play.berkaybilge.space
```

### Post-Deployment Management

| Command | Description |
|---------|-------------|
| `pm2 status` | Check application status |
| `pm2 logs openclasstools` | View application logs |
| `pm2 restart openclasstools` | Restart application |
| `pm2 stop openclasstools` | Stop application |
| `sudo systemctl reload nginx` | Reload Nginx config |
| `sudo tail -f /var/log/nginx/access.log` | View Nginx access logs |
| `sudo tail -f /var/log/nginx/error.log` | View Nginx error logs |

### Update Deployment

To update the deployed application:

```bash
cd /var/www/play.berkaybilge.space
git pull origin main  # or rsync new files
npm install
pm2 restart openclasstools
```

## Security Considerations

- **API Key**: Never commit `.env` file with real API keys
- **CORS**: Configured via `ALLOWED_ORIGINS` env variable (defaults to localhost and play.berkaybilge.space)
- **Input Validation**: All API endpoints validate and sanitize inputs
- **Rate Limiting**: 
  - General: 100 requests per minute per IP
  - AI Generation: 10 requests per 15 minutes per IP
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Request Limits**: JSON body limited to 10KB
- **File Storage**: `list.txt` is overwritten on each generation
- **No Authentication**: Admin panel uses only Game ID (4-character code)

## Session Management & Multiple Games

### Game ID Collision Prevention
The server now tracks active games and prevents multiple hosts from using the same game ID:

- Each game ID is unique to one host
- If a host disconnects, the game ID is reserved for 5 minutes (reconnection window)
- After 5 minutes, the game ID becomes available for new hosts
- Games auto-expire after 24 hours of inactivity

### Active Game Tracking
- **Max Concurrent Games**: 1000
- **Auto-cleanup**: Expired games cleaned every hour
- **Health Endpoint**: `GET /api/health` returns active game count

### Environment Variables
```env
GEMINI_API_KEY=your_api_key_here
PORT=8090
ALLOWED_ORIGINS=http://localhost:8090,http://play.berkaybilge.space
```

## Debugging Tips

- Server logs to console on startup and Socket.IO connections
- Check browser console for client-side errors
- Verify Gemini API key if AI generation fails
- Ensure Socket.IO client script loads before game scripts
- Game ID is displayed in corner of each game screen for admin connection
