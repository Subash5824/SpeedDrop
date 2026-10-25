# SpeedDrop Public Discovery Service

Lightweight, zero-configuration matchmaking microservice for **SpeedDrop**. It allows SpeedDrop PC backends and mobile clients to find each other automatically without requiring users to type or update IP addresses or tunnel URLs.

---

## ⚡ Deployment to Free Cloud Hosts

You can host this discovery service permanently on any free cloud provider in under 2 minutes:

### Option 1: Render (Recommended - 100% Free)
1. Fork or push this repository to GitHub.
2. Sign up / Log in to [Render](https://render.com).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Select your repository and specify:
   - **Root Directory**: `discovery-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Click **Create Web Service**. Render gives you a public URL like:
   `https://speeddrop-discovery.onrender.com`
6. Copy that URL and set it in your environment:
   - PC Backend (`mobile-app/backend/.env`): `DISCOVERY_SERVER_URL=https://speeddrop-discovery.onrender.com`
   - Mobile App (`mobile-app/.env`): `EXPO_PUBLIC_DISCOVERY_URL=https://speeddrop-discovery.onrender.com`

---

### Option 2: Railway
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Set the root directory to `discovery-server`. Railway detects `package.json` and starts it automatically.
4. Generate a public domain from the project settings.

---

### Option 3: Local / LAN Testing
To run the discovery service locally:
```bash
cd discovery-server
npm install
node server.js
```
The discovery service will start on port `4000` (`http://localhost:4000`).

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Register or heartbeat active backend address and Sharer ID |
| `GET` | `/api/resolve/:sharerId` | Look up the active address by Sharer ID (`SD-XXXXXX`) |
| `GET` | `/api/active` | Get the latest active backend session |
| `GET` | `/api/list` | List all active non-expired sessions |
| `POST` | `/api/unregister` | Deregister on shutdown |
| `GET` | `/health` | Health check for uptime monitors |
