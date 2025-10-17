# Local API Workspace

**Status:** In Active Development

A self-hosted, local-first alternative to Postman built for speed, privacy, and real-time documentation.

## Overview

Local API Workspace is a developer tool for API exploration, testing, and documentation. No cloud lock-in, no paywalls.

**Key Features:**
- Instant performance (no Electron or heavy UI)
- Local-first architecture (data stays on your machine)
- Real-time auto-generated documentation
- Self-hosted control panel
- Multi-protocol support (REST, GraphQL, WebSocket, gRPC)

## Project Structure

```
project-root/
├── frontend/     # React + Tailwind
├── backend/      # FastAPI + SQLModel
└── .gitignore
```

**Tech Stack:**
- **Backend:** FastAPI, SQLModel, WebSockets, JWT  
- **Frontend:** React, TypeScript, TailwindCSS, Vite

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### Installation

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Local URLs:**
- Backend: http://localhost:8000  
- Frontend: http://localhost:5173

## Roadmap

- [x] Backend architecture setup
- [x] Frontend layout with Tailwind
- [ ] Request collections (In Progress)
- [ ] Workspace management (In Progress)
- [ ] Environment variables
- [ ] Real-time docs engine
- [ ] Auth & admin panel
- [ ] Multi-protocol support
- [ ] Docker deployment

## Philosophy

> "Developer tools shouldn't spy, stall, or sell you your own data."

**Principles:**
1. Local-first — No cloud dependency
2. Fast-by-default — Built for speed
3. Open and extensible — Customizable by anyone

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

---

*"If Postman was built like VS Code — lightweight, local, and lightning-fast."*