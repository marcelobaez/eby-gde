# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a document tracking system for the Argentine government called "eby-gde" (Eby - Gobierno Digital de Expedientes). It consists of a full-stack application with:

- **Backend**: Strapi v4 CMS/API (Node.js) on port 1337
- **Frontend**: Next.js application (React/TypeScript) on port 3000  
- **Database**: PostgreSQL with Oracle client integration
- **Deployment**: Docker Compose with Nginx reverse proxy

## Development Commands

### Backend (Strapi)
```bash
cd backend
npm run develop    # Development server with auto-reload
npm run build      # Build for production
npm run start      # Start production server
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev        # Development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Docker Deployment
```bash
# From root directory
docker-compose up --build    # Build and start all services
```

## Architecture

### Backend Structure (Strapi)
- **Content Types**: Core entities defined in `/src/api/*/content-types/`
  - `expediente`: Main document tracking entity
  - `lista`: Categories/lists for organizing documents
  - `expediente-doc`: Document attachments
  - `expediente-tipo`: Document types
  - `expedientes-relacion`: Relationships between documents
- **Custom Controllers**: Business logic in `/src/api/*/controllers/`
- **Custom Services**: Data layer in `/src/api/*/services/`
- **Middlewares**: Authentication and authorization in `/src/api/*/middlewares/`
- **Database**: PostgreSQL with migrations in `/database/migrations/`

### Frontend Structure (Next.js)
- **Pages**: Route components in `/src/pages/`
  - `/api/`: API routes for Oracle/GDE integration
  - `/busqueda`: Search functionality
  - `/asociaciones`: Document associations
  - `/seguimiento`: Document tracking
- **Components**: Reusable UI components in `/src/components/`
- **State Management**: Zustand store in `/src/stores/`
- **Types**: TypeScript definitions in `/src/types/`
- **Hooks**: Custom React hooks in `/src/hooks/`

### Key Integrations
- **Oracle Database**: For GDE (Government Document Management) system integration
- **Authentication**: NextAuth.js with custom user management
- **UI Library**: Ant Design with custom theming
- **Data Fetching**: TanStack Query (React Query) for API calls

### Database Schema
The system tracks government documents with these main relationships:
- Users can create Lists (categories)
- Lists contain multiple Expedientes (documents)
- Expedientes can have document attachments and relationships with other documents
- Integration with external GDE system via Oracle database

## Environment Setup

### Prerequisites
- Node.js 18-20 (specified in .nvmrc)
- PostgreSQL database
- Oracle Instant Client (for GDE integration)

### Local Development
1. Set up PostgreSQL database with credentials from `backend/config/database.js`
2. Install Oracle Instant Client at `C:\oracle\instantclient_xx_xx`
3. Configure environment variables using `.env.example` files in both directories
4. Run backend and frontend separately for development

### Docker Development
Use the provided `docker-compose.yml` with:
- Environment variables in root `.env` file
- SSL certificates in `/certs/` directory for HTTPS
- Host entries for `expedientes.eby.org.ar` and `gdeapi.eby.org.ar`