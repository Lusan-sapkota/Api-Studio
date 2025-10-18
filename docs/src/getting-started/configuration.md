# Configuration

This guide covers how to configure API Studio for your specific needs, including environment variables, database settings, and customization options.

## Backend Configuration

### Environment Variables

The backend configuration is managed through environment variables in the `.env` file:

```bash
# Database Configuration
DATABASE_URL=sqlite:///./api_studio.db

# Security Settings
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings
FRONTEND_URL=http://localhost:56173

# Server Settings
HOST=0.0.0.0
PORT=58123
RELOAD=true

# Optional Admin Credentials
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=admin123
```

### Configuration Options

=== "Database"

    **SQLite (Default)**
    ```bash
    DATABASE_URL=sqlite:///./api_studio.db
    ```
    
    **PostgreSQL (Coming Soon)**
    ```bash
    DATABASE_URL=postgresql://user:password@localhost/api_studio
    ```
    
    !!! note "Database Location"
        For SQLite, the database file will be created in the backend directory. You can specify an absolute path if needed.

=== "Security"

    **Secret Key**
    ```bash
    SECRET_KEY=your-secret-key-here
    ```
    
    Generate a secure key:
    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```
    
    **JWT Settings**
    ```bash
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

=== "Server"

    **Host and Port**
    ```bash
    HOST=0.0.0.0  # Listen on all interfaces
    PORT=58123    # Default port
    ```
    
    **Development Mode**
    ```bash
    RELOAD=true   # Auto-reload on code changes
    ```

=== "CORS"

    **Frontend URL**
    ```bash
    FRONTEND_URL=http://localhost:56173
    ```
    
    For production, update this to your actual frontend URL.

## Frontend Configuration

### Vite Configuration

The frontend uses Vite for development and building. Configuration is in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 56173,
    proxy: {
      '/api': {
        target: 'http://localhost:58123',
        changeOrigin: true,
      },
    },
  },
})
```

### Environment Variables

Frontend environment variables can be set in `.env` files:

```bash
# .env.local (for local development)
VITE_API_BASE_URL=http://localhost:58123
VITE_WS_BASE_URL=ws://localhost:58123
```

## Application Settings

### User Preferences

Configure user preferences through the Settings page in the application:

#### General Settings

- **Theme**: Light, Dark, or System
- **Language**: Interface language (English default)
- **Timezone**: For timestamps and scheduling

#### Editor Settings

- **Font Size**: Code editor font size (10-24px)
- **Tab Size**: Indentation size (2, 4, or 8 spaces)
- **Word Wrap**: Enable/disable word wrapping
- **Line Numbers**: Show/hide line numbers

#### API Settings

- **Request Timeout**: Default timeout in milliseconds
- **Max Retries**: Number of retry attempts for failed requests
- **Follow Redirects**: Automatically follow HTTP redirects

#### Notification Settings

- **Email Notifications**: Enable/disable email alerts
- **Desktop Notifications**: Browser notification permissions
- **Sound Notifications**: Audio alerts for events

### Workspace Configuration

#### Collections

- **Default Organization**: How new collections are organized
- **Auto-save**: Automatically save changes to requests
- **History Retention**: How long to keep request history

#### Environments

- **Default Environment**: Which environment to activate on startup
- **Variable Encryption**: Encrypt sensitive environment variables
- **Sync Settings**: Synchronization preferences for team environments

## Advanced Configuration

### Custom Themes

You can customize the application theme by modifying CSS variables:

```css
:root {
  --primary-color: #4f46e5;
  --secondary-color: #6b7280;
  --background-color: #ffffff;
  --text-color: #111827;
}

[data-theme="dark"] {
  --background-color: #111827;
  --text-color: #f9fafb;
}
```

### Plugin Configuration (Coming Soon)

API Studio will support plugins for extending functionality:

```json
{
  "plugins": {
    "enabled": ["auth-plugin", "custom-headers"],
    "config": {
      "auth-plugin": {
        "providers": ["oauth2", "saml"]
      }
    }
  }
}
```

### Logging Configuration

Configure logging levels and outputs:

```bash
# Environment variables for logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=api_studio.log
```

Available log levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

## Production Configuration

### Security Hardening

For production deployments:

1. **Change Default Secrets**
   ```bash
   SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
   ```

2. **Use Strong Database Passwords**
   ```bash
   DATABASE_URL=postgresql://user:strong_password@localhost/api_studio
   ```

3. **Enable HTTPS**
   ```bash
   FRONTEND_URL=https://your-domain.com
   ```

4. **Restrict CORS Origins**
   ```bash
   ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com
   ```

### Performance Optimization

1. **Database Connection Pooling**
   ```bash
   DB_POOL_SIZE=20
   DB_MAX_OVERFLOW=30
   ```

2. **Caching Configuration**
   ```bash
   REDIS_URL=redis://localhost:6379/0
   CACHE_TTL=3600
   ```

3. **Rate Limiting**
   ```bash
   RATE_LIMIT_REQUESTS=100
   RATE_LIMIT_WINDOW=60
   ```

### Monitoring and Observability

1. **Health Check Endpoints**
   ```bash
   HEALTH_CHECK_ENABLED=true
   METRICS_ENABLED=true
   ```

2. **Logging Integration**
   ```bash
   SENTRY_DSN=your-sentry-dsn
   LOG_AGGREGATION_URL=your-log-service
   ```

## Docker Configuration

### Docker Compose

For containerized deployment:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/api_studio
      - SECRET_KEY=${SECRET_KEY}
      - FRONTEND_URL=http://localhost:56173
    ports:
      - "58123:58123"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "56173:56173"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=api_studio
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Environment Files

Create separate environment files for different stages:

```bash
# .env.development
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=sqlite:///./dev.db

# .env.production
DEBUG=false
LOG_LEVEL=INFO
DATABASE_URL=postgresql://user:pass@prod-db:5432/api_studio
```

## Backup and Recovery

### Database Backup

**SQLite**
```bash
# Backup
cp api_studio.db api_studio_backup_$(date +%Y%m%d).db

# Restore
cp api_studio_backup_20241201.db api_studio.db
```

**PostgreSQL**
```bash
# Backup
pg_dump api_studio > backup.sql

# Restore
psql api_studio < backup.sql
```

### Configuration Backup

Backup your configuration files:

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup configuration
cp .env backups/$(date +%Y%m%d)/
cp -r docs/ backups/$(date +%Y%m%d)/
```

## Troubleshooting Configuration

### Common Issues

=== "Database Connection"

    **Error**: `Database connection failed`
    
    **Solutions**:
    - Check DATABASE_URL format
    - Verify database server is running
    - Check network connectivity
    - Validate credentials

=== "CORS Errors"

    **Error**: `CORS policy blocked`
    
    **Solutions**:
    - Update FRONTEND_URL in .env
    - Restart backend after changes
    - Check browser developer tools

=== "Port Conflicts"

    **Error**: `Port already in use`
    
    **Solutions**:
    - Change PORT in .env
    - Kill existing processes
    - Use different ports for dev/prod

### Configuration Validation

Validate your configuration:

```bash
# Backend configuration check
cd backend
python -c "from core.config import settings; print('Config loaded successfully')"

# Frontend build check
cd frontend
npm run build
```

## Next Steps

- [Quick Start Guide](quick-start.md) - Start using API Studio
- [API Clients Overview](../api-clients/overview.md) - Explore the different clients
- [Features Guide](../features/collections.md) - Learn about advanced features