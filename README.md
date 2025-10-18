# API Studio

**Status:** In Active Development

A self-hosted, local-first alternative to Postman built for speed, privacy, and real-time collaboration. Test APIs across multiple protocols with a modern, intuitive interface.

## Overview

API Studio is a comprehensive developer tool for API exploration, testing, and documentation. Built with privacy and performance in mind - no cloud dependency, no data collection, no paywalls.

**Key Features:**

- **Lightning Fast** - Built with modern web technologies, no Electron bloat
- **Privacy First** - Local-first architecture, your data stays on your machine
- **Multi-Protocol Support** - REST, GraphQL, WebSocket, gRPC, and SMTP
- **Smart Documentation** - Auto-generated docs with real-time updates
- **Real-time Collaboration** - Work together with your team seamlessly
- **Organized Workflow** - Collections, environments, notes, and tasks integrated

## Architecture

```
api-studio/
├── frontend/          # React + TypeScript + Tailwind CSS
├── backend/           # FastAPI + SQLModel + WebSockets
├── setup.sh          # Automated setup script
└── README.md
```

**Tech Stack:**

- **Backend:** FastAPI, SQLModel, WebSockets, JWT Authentication
- **Frontend:** React 18, TypeScript, TailwindCSS, Vite
- **Database:** SQLite (with PostgreSQL support planned)
- **Real-time:** WebSockets for live collaboration

## Quick Start

### Prerequisites

- **Python 3.11+** (3.13 supported with latest packages)
- **Node.js 18+**
- **Git**

### Automated Setup

```bash
# Clone the repository
git clone https://github.com/Lusan-sapkota/Api-Studio.git
cd api-studio

# Run the setup script
chmod +x setup.sh
./setup.sh
```

### Manual Setup

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python start.py
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Access Points

- **Frontend:** http://localhost:56173
- **Backend API:** http://localhost:58123
- **API Documentation:** http://localhost:58123/docs

## Features

### Multi-Protocol API Clients

- **REST Client** - Full HTTP method support with authentication and environment variables
- **GraphQL Studio** - Schema introspection, query builder, and real-time error detection
- **WebSocket Playground** - Real-time connections with message history and auto-reconnection
- **gRPC Explorer** - Service discovery, proto file support, and streaming capabilities
- **SMTP Tester** - Email composition with HTML/text content and template management

### Organization & Workflow

- **Collections Management** - 70-30 rule interface with hierarchical folder organization
- **Environment Variables** - Multiple environment support with secret variable masking
- **Notes & Tasks System** - Context-aware notes and task management with priorities
- **Settings & Collaboration** - User preferences, team management, and role-based access

### Advanced Features

- **Smart Sidebar Navigation** - Collapsible dropdown with single/double-click actions
- **Real-time Collaboration** - Live editing and presence indicators
- **Documentation Engine** - Auto-generated API docs with custom sections

## Roadmap

### Completed

- [x] Multi-protocol API clients (REST, GraphQL, WebSocket, gRPC, SMTP)
- [x] Collections with 70-30 rule interface
- [x] Environment variables with secret management
- [x] Notes and tasks system
- [x] Settings and collaboration features
- [x] Smart sidebar navigation
- [x] Backend API architecture

### In Progress

- [ ] Authentication & authorization system
- [ ] Real-time collaborative editing
- [ ] Advanced documentation engine

### Planned

- [ ] Plugin system for extensibility
- [ ] Docker deployment
- [ ] PostgreSQL support
- [ ] API mocking capabilities
- [ ] Import/export (Postman, Insomnia, OpenAPI)
- [ ] CLI tool for automation
- [ ] Desktop app

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Philosophy

> "Developer tools shouldn't spy, stall, or sell you your own data."

**Core Principles:**

1. **Local-first** — Your data stays on your machine
2. **Fast-by-default** — Built for speed and efficiency
3. **Open and extensible** — Customizable and hackable
4. **Privacy-focused** — No tracking, no data collection
5. **Developer-centric** — Built by developers, for developers

---

**API Studio** - _"If Postman was built like VS Code — lightweight, local, and lightning-fast."_

## Author

**Lusan Sapkota**

- Email: sapkotalusan@gmail.com
- Contact: contact@lusansapkota.com.np
- GitHub: [@Lusan-sapkota](https://github.com/Lusan-sapkota)

## Support

- **Repository:** https://github.com/Lusan-sapkota/Api-Studio
- **Issues:** https://github.com/Lusan-sapkota/Api-Studio/issues
- **Email:** sapkotalusan@gmail.com
