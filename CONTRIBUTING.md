# Contributing to Local API Workspace

Thank you for your interest in contributing to Local API Workspace! We welcome contributions from everyone.

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Provide detailed information including steps to reproduce
- Include your environment details (OS, Python/Node versions)

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/Api-Studio.git`
3. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   ```
4. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```
5. Run the development servers:
   ```bash
   # Backend (in one terminal)
   cd backend && uvicorn main:app --reload

   # Frontend (in another terminal)
   cd frontend && npm run dev
   ```

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following our coding standards
3. Write tests for new functionality
4. Ensure all tests pass: `pytest` (backend) and `npm test` (frontend)
5. Update documentation as needed

### Coding Standards

- **Backend (Python):**
  - Follow PEP 8 style guide
  - Use type hints
  - Write docstrings for functions and classes
  - Keep functions small and focused

- **Frontend (TypeScript/React):**
  - Use TypeScript for type safety
  - Follow React best practices
  - Use meaningful component and variable names
  - Keep components modular

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add user authentication endpoint
fix: resolve CORS issue with WebSocket connections
docs: update API documentation for collections
```

### Pull Requests

1. Ensure your branch is up-to-date with main
2. Run all tests and linting
3. Write a clear PR description explaining the changes
4. Reference any related issues
5. Request review from maintainers

### Testing

- Write unit tests for backend services
- Write integration tests for API endpoints
- Test frontend components and user interactions
- Ensure cross-browser compatibility

## Project Structure

```
api-studio/
├── backend/          # FastAPI application
│   ├── api/         # API routes and schemas
│   ├── core/        # Configuration and utilities
│   ├── db/          # Database models and session
│   ├── docs/        # Documentation generation
│   └── tests/       # Backend tests
├── frontend/         # React application
│   ├── src/         # Source code
│   └── public/      # Static assets
├── CONTRIBUTING.md   # This file
├── LICENSE           # License information
└── README.md         # Project overview
```

## Getting Help

- Check existing issues and documentation
- Join our discussions on GitHub
- Contact maintainers for guidance

## Recognition

Contributors will be acknowledged in the project README and release notes.

Thank you for contributing to Local API Workspace! 🚀