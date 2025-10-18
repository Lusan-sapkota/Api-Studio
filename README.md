# API Studio

**Status:** In Active Development

A self-hosted, local-first alternative to Postman built for speed, privacy, and real-time collaboration. Test APIs across multiple protocols with a modern, intuitive interface.

## 🚀 Overview

API Studio is a comprehensive developer tool for API exploration, testing, and documentation. Built with privacy and performance in mind - no cloud dependency, no data collection, no paywalls.

**Key Features:**

- 🏃‍♂️ **Lightning Fast** - Built with modern web technologies, no Electron bloat
- 🔒 **Privacy First** - Local-first architecture, your data stays on your machine
- 🌐 **Multi-Protocol Support** - REST, GraphQL, WebSocket, gRPC, and SMTP
- 📝 **Smart Documentation** - Auto-generated docs with real-time updates
- 👥 **Real-time Collaboration** - Work together with your team seamlessly
- 🎯 **Organized Workflow** - Collections, environments, notes, and tasks integrated

## 🏗️ Architecture

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

## ⚡ Quick Start

### Prerequisites

- **Python 3.11+** (3.13 supported with latest packages)
- **Node.js 18+**
- **Git**

### Automated Setup

```bash
# Clone the repository
git clone <repository-url>
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

- 🌐 **Frontend:** http://localhost:5173
- 🔧 **Backend API:** http://localhost:8000
- 📚 **API Documentation:** http://localhost:8000/docs

## 🎯 Features

### 🌐 Multi-Protocol API Clients

#### REST Client
- Full HTTP method support (GET, POST, PUT, DELETE, etc.)
- Advanced authentication (Bearer, Basic, API Key)
- Request/response history
- Environment variable support
- File upload capabilities

#### GraphQL Studio
- Schema introspection and exploration
- Query builder with syntax highlighting
- Variables and operation name support
- Real-time error detection
- Query examples and templates

#### WebSocket Playground
- Real-time WebSocket connections
- Message history and filtering
- Auto-reconnection with exponential backoff
- JSON and text message support
- Connection status monitoring

#### gRPC Explorer
- Service discovery and method exploration
- Proto file upload and parsing
- Request template generation
- Streaming support (client/server/bidirectional)
- Server reflection support

#### SMTP Tester
- Email composition with HTML/text content
- Attachment support
- Template management
- SMTP configuration testing
- Delivery status tracking

### 📁 Organization & Workflow

#### Collections Management
- **70-30 Rule Interface**: Click left 70% to expand, right 30% to navigate
- Hierarchical folder organization
- Drag-and-drop request organization
- Bulk operations and search

#### Environment Variables
- Multiple environment support (Local, Staging, Production)
- Secret variable masking
- Environment-specific configurations
- Variable interpolation in requests

#### Notes & Tasks System
- Context-aware notes (workspace, collection, request level)
- Task management with priorities and due dates
- Real-time collaboration on notes
- Markdown support

#### Settings & Collaboration
- User preferences and themes
- Team member management
- Role-based access control (Admin, Editor, Viewer)
- Real-time presence indicators

### 🔧 Advanced Features

#### Smart Sidebar Navigation
- Collapsible API clients dropdown
- Single-click dropdown, double-click navigation
- Badge indicators for active items
- Quick access to recent items

#### Real-time Collaboration
- Live cursor tracking
- Simultaneous editing
- Conflict resolution
- Activity feeds

#### Documentation Engine
- Auto-generated API documentation
- Request/response examples
- Custom markdown sections
- Export capabilities

## 🗺️ Roadmap

### ✅ Completed
- [x] Multi-protocol API clients (REST, GraphQL, WebSocket, gRPC, SMTP)
- [x] Collections with 70-30 rule interface
- [x] Environment variables with secret management
- [x] Notes and tasks system
- [x] Settings and collaboration features
- [x] Smart sidebar navigation
- [x] Backend API architecture
- [x] Real-time WebSocket infrastructure

### 🚧 In Progress
- [ ] Authentication & authorization system
- [ ] Real-time collaborative editing
- [ ] Advanced documentation engine
- [ ] Request history and analytics

### 📋 Planned
- [ ] Plugin system for extensibility
- [ ] Docker deployment
- [ ] PostgreSQL support
- [ ] API mocking capabilities
- [ ] Performance monitoring
- [ ] Import/export (Postman, Insomnia, OpenAPI)
- [ ] CLI tool for automation
- [ ] Desktop app (Tauri)

## 🛠️ Development

### Backend API Endpoints

```
# Core APIs
/api/requests/*          # REST client operations
/api/collections/*       # Collection management
/api/environments/*      # Environment variables
/api/notes/*            # Notes system
/api/tasks/*            # Task management

# Protocol Clients
/api/graphql/*          # GraphQL operations
/api/grpc/*             # gRPC operations
/api/websocket/*        # WebSocket proxy
/api/smtp/*             # SMTP operations

# System
/api/auth/*             # Authentication
/api/workspaces/*       # Workspace management
/docs                   # API documentation
```

### Project Structure

```
backend/
├── api/routes/         # API route handlers
├── core/              # Core configuration
├── db/                # Database models and migrations
├── main.py            # FastAPI application
├── start.py           # Development server
└── requirements.txt   # Python dependencies

frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── layouts/       # Layout components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   └── hooks/         # Custom React hooks
├── package.json       # Node.js dependencies
└── vite.config.ts     # Vite configuration
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🎯 Philosophy

> "Developer tools shouldn't spy, stall, or sell you your own data."

**Core Principles:**

1. **Local-first** — Your data stays on your machine
2. **Fast-by-default** — Built for speed and efficiency  
3. **Open and extensible** — Customizable and hackable
4. **Privacy-focused** — No tracking, no data collection
5. **Developer-centric** — Built by developers, for developers

---

**API Studio** - _"If Postman was built like VS Code — lightweight, local, and lightning-fast."_

## 🆘 Support

- 📖 **Documentation:** [Coming Soon]
- 🐛 **Bug Reports:** [GitHub Issues]
- 💬 **Discussions:** [GitHub Discussions]
- 📧 **Email:** [Contact Info]

---

Made with ❤️ by developers who believe in privacy and performance.
