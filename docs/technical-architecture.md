# Technical Architecture: Grey Literature Search App

## System Architecture Overview

The Grey Literature Search App follows a modern web application architecture with a Next.js frontend, Supabase backend, and various integrated services. This document outlines the technical architecture and data flows within the application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Web Browser)                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Next.js App                                │
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │                 │    │                  │    │                │  │
│  │  React Components    │  App Router      │    │  API Routes    │  │
│  │                 │    │                  │    │                │  │
│  └────────┬────────┘    └─────────┬────────┘    └────────┬───────┘  │
│           │                       │                      │          │
│  ┌────────▼────────┐    ┌─────────▼────────┐    ┌────────▼───────┐  │
│  │                 │    │                  │    │                │  │
│  │  UI Components  │    │  Page Components │    │  tRPC Router   │  │
│  │                 │    │                  │    │                │  │
│  └─────────────────┘    └──────────────────┘    └────────┬───────┘  │
│                                                          │          │
└──────────────────────────────────────────────────┬───────┼──────────┘
                                                   │       │
                                                   ▼       ▼
┌─────────────────────────────────────────┐    ┌───────────────────────┐
│              Supabase                    │    │  External Services    │
│                                          │    │                       │
│  ┌─────────────┐    ┌─────────────────┐  │    │  ┌─────────────────┐ │
│  │             │    │                 │  │    │  │                 │ │
│  │  Auth API   │    │  PostgreSQL DB  │  │    │  │  Search APIs    │ │
│  │             │    │                 │  │    │  │                 │ │
│  └──────┬──────┘    └────────┬────────┘  │    │  └────────┬────────┘ │
│         │                    │           │    │           │          │
│  ┌──────▼──────┐    ┌────────▼────────┐  │    │  ┌────────▼────────┐ │
│  │             │    │                 │  │    │  │                 │ │
│  │  User Data  │    │  Application    │  │    │  │  External Data  │ │
│  │             │    │  Data           │  │    │  │  Sources        │ │
│  └─────────────┘    └─────────────────┘  │    │  └─────────────────┘ │
│                                          │    │                       │
└─────────────────────────────────────────┘    └───────────────────────┘
```

## Component Interaction Flow

### Authentication Flow

```
┌──────────┐     ┌───────────┐     ┌───────────────┐     ┌─────────────┐
│          │     │           │     │               │     │             │
│  User    │────▶│  Auth UI  │────▶│  Supabase     │────▶│  Database   │
│          │     │           │     │  Auth API     │     │             │
│          │◀────│           │◀────│               │◀────│             │
└──────────┘     └───────────┘     └───────────────┘     └─────────────┘
```

1. User enters credentials in the Auth UI (LoginForm/RegisterForm)
2. Auth UI sends credentials to Supabase Auth API
3. Supabase Auth API validates credentials and creates/retrieves user
4. User data is synchronized with the application database
5. Session token is returned to the client and stored in cookies
6. UI updates to reflect authenticated state

### Search Builder Flow

```
┌──────────┐     ┌───────────────┐     ┌───────────────┐
│          │     │               │     │               │
│  User    │────▶│  Search       │────▶│  Search       │
│          │     │  Builder UI   │     │  Preview      │
│          │     │               │     │               │
└──────────┘     └───────┬───────┘     └───────┬───────┘
                         │                     │
                         ▼                     ▼
                 ┌───────────────┐     ┌───────────────┐
                 │               │     │               │
                 │  API Router   │────▶│  Search       │
                 │               │     │  Execution    │
                 │               │     │               │
                 └───────┬───────┘     └───────┬───────┘
                         │                     │
                         ▼                     ▼
                 ┌───────────────┐     ┌───────────────┐
                 │               │     │               │
                 │  Database     │◀────│  Results      │
                 │               │     │  Processing   │
                 │               │     │               │
                 └───────────────┘     └───────────────┘
```

1. User creates concept groups and adds keywords in the Search Builder UI
2. Search Builder generates preview queries
3. User configures search options and initiates search
4. Search request is sent to the API Router
5. Search Execution service processes the request and executes searches
6. Results are processed and stored in the database
7. Results are returned to the user for review

## Data Flow

### User Data Flow

```
┌──────────┐     ┌───────────────┐     ┌───────────────┐
│          │     │               │     │               │
│  User    │────▶│  Auth System  │────▶│  User Table   │
│          │     │               │     │               │
└──────────┘     └───────────────┘     └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │               │
                                       │  User Profile │
                                       │               │
                                       └───────────────┘
```

### Search Data Flow

```
┌──────────┐     ┌───────────────┐     ┌───────────────┐
│          │     │               │     │               │
│  User    │────▶│  Search       │────▶│  Searches     │
│          │     │  Builder      │     │  Table        │
└──────────┘     └───────────────┘     └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │               │
                                       │  Concepts     │
                                       │  Table        │
                                       │               │
                                       └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │               │
                                       │  Keywords     │
                                       │  Table        │
                                       │               │
                                       └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │               │
                                       │  Search       │
                                       │  Results      │
                                       │               │
                                       └───────────────┘
```

## Technology Stack Details

### Frontend

- **Next.js**: React framework for server-rendered applications
- **React**: UI library for building component-based interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **tRPC**: End-to-end typesafe API layer
- **Lucide React**: Icon library

### Backend

- **Supabase**: Backend-as-a-Service platform
  - **Authentication**: User management and session handling
  - **PostgreSQL**: Database for storing application data
  - **Row-Level Security**: For data access control

### Development Tools

- **TypeScript**: Typed JavaScript for better developer experience
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Storybook**: UI component development environment

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Security Layers                            │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Authentication (Supabase Auth)                │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Session Management (Cookies)                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Route Protection (Middleware)                 │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Row-Level Security (Database)                 │
└──────────────────────────────────────────────────────────────────┘
```

1. **Authentication**: Supabase Auth handles user authentication
2. **Session Management**: Sessions are stored in secure cookies
3. **Route Protection**: Middleware checks for valid sessions on protected routes
4. **Row-Level Security**: Database policies ensure users can only access their own data

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Development Environment                    │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Production Environment                     │
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│  │                 │    │                  │    │              │ │
│  │  Vercel         │    │  Supabase        │    │  External    │ │
│  │  (Frontend)     │    │  (Backend)       │    │  Services    │ │
│  │                 │    │                  │    │              │ │
│  └─────────────────┘    └──────────────────┘    └──────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **Server-Side Rendering**: Critical pages are server-rendered for better performance
- **Static Generation**: Where possible, pages are statically generated
- **Client-Side Caching**: Search results and user data are cached on the client
- **Database Indexing**: Key fields are indexed for faster queries
- **Pagination**: Large result sets are paginated to improve performance

## Scalability Considerations

- **Stateless Architecture**: The application is designed to be stateless for horizontal scaling
- **Database Scaling**: Supabase provides automatic scaling of the PostgreSQL database
- **CDN Integration**: Static assets are served through a CDN for better performance
- **API Rate Limiting**: API endpoints are rate-limited to prevent abuse

## Monitoring and Logging

- **Error Tracking**: Client and server errors are tracked
- **Performance Monitoring**: Key performance metrics are monitored
- **Usage Analytics**: User behavior and application usage are tracked
- **Audit Logging**: Important actions are logged for security and compliance

## Conclusion

This technical architecture document provides an overview of the Grey Literature Search App's architecture, data flows, and technical considerations. It should be used in conjunction with the Developer Handover document to understand the application's structure and behavior.

For more detailed information on specific components or workflows, refer to the codebase and additional documentation in the `docs` directory.
