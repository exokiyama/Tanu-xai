# 🩷 TANU XAI - WhatsApp Bot V1

A production-ready, stable, and modular WhatsApp bot built with Node.js, TypeScript, and Baileys.

## ✨ Features

- **Stable WhatsApp Connection** - Automatic reconnection with exponential backoff
- **Session Management** - Secure session handling via environment variables
- **Plugin Architecture** - Extensible command system
- **Database Integration** - Supabase/PostgreSQL for persistence
- **Permission System** - Owner, Sudo, Group Admin, and User levels
- **Group Management** - Promote, demote, kick, add members
- **Lightweight** - Optimized for low-resource deployments

## 📋 Requirements

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- WhatsApp session token

## 🚀 Installation

```bash
git clone <repository-url>
cd tanu-xai
npm install
```

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
NODE_ENV=production

SESSION_ID=Tanu-XAI~eyJub2lzZUtleSI...

OWNER_NUMBER=923xxxxxxxxx

PREFIX=.

BOT_NAME=Tanu XAI

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

LOG_LEVEL=info
```

## 🔐 Getting Session Token

1. Open the [Tanu XAI Session Generator](https://tanu-xai-gen-production.up.railway.app/)
2. Generate a WhatsApp session by scanning the QR code
3. Copy the complete session token (starts with `Tanu-XAI~`)
4. Paste it in your `.env` file as `SESSION_ID`

**⚠️ SECURITY WARNING:** Never share your session token or commit it to version control!

## 🗄️ Database Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Get your project URL and service role key from Settings → API
3. Run the migration SQL file in Supabase SQL Editor:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# and paste into Supabase SQL Editor
```

## 💻 Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Start production build
npm start
```

## 📜 Available Commands (V1)

### System Commands
- `.menu` - Show bot menu
- `.help` - Show help information
- `.alive` - Check bot status
- `.ping` - Check response latency
- `.runtime` - Show bot uptime

### Tools
- `.jid` - Get current chat JID
- `.gjid` - Get group JID (in groups)
- `.whois @user` - Get user information

### Owner Commands
- `.setprefix <symbol>` - Change command prefix
- `.setmode public|private` - Toggle bot mode
- `.setname <name>` - Change bot name
- `.setsudo @user` - Add sudo user
- `.delsudo @user` - Remove sudo user
- `.getsudo` - List sudo users

### Group Commands (Bot must be admin)
- `.promote @user` - Promote to admin
- `.demote @user` - Demote from admin
- `.kick @user` - Remove from group
- `.add 923xxxxxxxxx` - Add member to group

## 🏗️ Project Structure

```
tanu-xai/
├── src/
│   ├── core/
│   │   ├── connection/    # WhatsApp connection manager
│   │   ├── database/      # Supabase integration
│   │   ├── logger/        # Structured logging
│   │   ├── cache/         # In-memory caching
│   │   ├── permissions/   # Permission middleware
│   │   └── config/        # Configuration management
│   ├── handlers/
│   │   ├── messages.ts    # Message processing pipeline
│   │   └── commands.ts    # Command parsing & execution
│   ├── plugins/
│   │   ├── owner/         # Owner-specific commands
│   │   ├── group/         # Group management commands
│   │   ├── system/        # System commands
│   │   └── tools/         # Utility commands
│   ├── utils/             # Helper utilities
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Application entry point
├── supabase/
│   └── migrations/        # Database schema migrations
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 Connection Reliability

The bot implements a robust connection strategy:

- **Automatic Reconnection** - Handles network failures gracefully
- **Exponential Backoff** - Prevents rapid reconnection loops (1s → 60s max)
- **Duplicate Socket Protection** - Ensures only one active connection
- **Graceful Shutdown** - Proper cleanup on SIGINT/SIGTERM
- **Session Persistence** - Maintains authentication state

### Connection States

```
IDLE → INITIALIZING → CONNECTING → CONNECTED
                              ↓
                        DISCONNECTED → RECONNECTING → CONNECTED
                              ↓
                         LOGGED_OUT (requires new session)
```

## 🛡️ Permission Levels

1. **OWNER** - Full access (from `OWNER_NUMBER` env)
2. **SUDO** - Near-full access (database-managed)
3. **GROUP_ADMIN** - Group management in their groups
4. **USER** - Basic command access (public mode only)

## 🌐 Deployment

### Render/Railway (Low-resource friendly)

1. Set environment variables in your platform dashboard
2. Build command: `npm run build`
3. Start command: `npm start`
4. Ensure `SESSION_ID` is set correctly

### Health Check

If running with HTTP server:
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "bot": "Tanu XAI",
  "whatsapp": "connected",
  "uptime": 12345
}
```

## 🐛 Troubleshooting

### WhatsApp Connection Issues

**Problem:** Bot won't connect
- Verify `SESSION_ID` is correct and complete
- Check if session has expired (generate new one)
- Ensure network connectivity

**Problem:** Frequent disconnections
- Check internet stability
- Verify session hasn't been logged out elsewhere
- Review logs for specific error messages

**Problem:** "Logged out" message
- Session is invalid/expired
- Generate new session token
- Update `SESSION_ID` in environment

### Database Issues

**Problem:** Database errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check if migrations were run successfully
- Ensure network access to Supabase

### Permission Issues

**Problem:** Commands not responding
- Check bot mode (public/private)
- Verify user has required permission level
- Ensure command prefix is correct

## 📝 Logging

The bot uses structured logging with levels:

- `debug` - Detailed internal information
- `info` - General operational messages
- `warn` - Warning conditions
- `error` - Error conditions

Set `LOG_LEVEL` in `.env` to control verbosity.

Example log output:
```
[BOOT] Tanu XAI starting...
[DB] Connected to Supabase
[WA] Initializing WhatsApp socket...
[WA] Connected ✓
[CMD] .ping | user=923xxx | chat=120xxx@g.us
```

## 🔌 Adding Plugins

Create a new plugin file in `src/plugins/<category>/`:

```typescript
import { CommandPlugin } from '../../types/plugin.js';

const plugin: CommandPlugin = {
  name: 'example',
  category: 'tools',
  description: 'Example command',
  usage: '.example',
  aliases: ['ex'],
  execute: async (ctx) => {
    await ctx.sock.sendMessage(ctx.chat, { text: 'Hello!' });
  }
};

export default plugin;
```

The plugin loader automatically discovers and registers plugins.

## 📄 License

ISC

## 👨‍💻 Author

Tanu XAI Development Team

---

**🩷 Made with love for the WhatsApp automation community**
