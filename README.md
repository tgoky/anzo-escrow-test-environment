
# Full Stack Exchange Application

A modern web application built with React, Express, and TypeScript, featuring real-time updates, a clean UI using Tailwind CSS, and financial institution connectivity.

## Features

- Real-time price updates
- Responsive design with Tailwind CSS
- Solana wallet integration
- Bank account connectivity with Plaid
- Modern UI components with Radix UI
- TypeScript support
- Server-side session management

## Architecture

### Frontend (React + TypeScript)

The client application follows a component-based architecture with TypeScript for type safety:

- **Pages**: Main application views (Exchange, Maker Dashboard, Financial Account Details)
- **Components**: Reusable UI elements
- **Lib**: Core business logic and services
  - **Bank Connection System**: Uses the Strategy and Registry design patterns
    - `BaseBankConnectionStrategy`: Abstract base class for different bank connection methods
    - `PlaidConnectionStrategy`: Implementation for Plaid connections
    - `BankConnectionRegistry`: Registry that manages all strategies and selects the appropriate one
- **Stores**: State management with local storage persistence

### Backend (Express + TypeScript)

- **API Routes**: RESTful endpoints for data operations
- **Storage Service**: Data persistence layer
- **Integration Services**: Connectors to external services like Plaid

### Shared (TypeScript)

- **Types**: Shared type definitions used by both frontend and backend
- **Services**: Common service interfaces

## Design Patterns

The application uses several key design patterns:

1. **Strategy Pattern**: Allows for different bank connection implementations (Plaid, etc.)
2. **Registry Pattern**: Manages and selects the appropriate strategies based on requirements
3. **Singleton Pattern**: Ensures single instances for services like the connection registry
4. **Factory Pattern**: Creates appropriate objects based on runtime conditions

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query
- **Authentication**: Passport.js
- **Routing**: Wouter

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5000`

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Update database schema

## Project Structure

```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/         # Core logic, strategies and services
│   │   ├── pages/       # Page components
│   │   └── types/       # Frontend-specific types
├── server/           # Express backend
│   ├── routes/       # API routes
│   └── services/     # Server-side services
├── shared/           # Shared TypeScript types and utilities
└── theme.json        # UI theme configuration
```

## License

MIT
