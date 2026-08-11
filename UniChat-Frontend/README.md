# UniChat Frontend

A React-based chat application frontend with login and registration functionality.

## Features

- User authentication (Login/Register)
- Responsive design
- Environment-based API configuration
- Modern UI with gradient styling

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (for backend)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env` (if available)
   - Or create a `.env` file in the root directory with:
```
VITE_API_URL=http://localhost:3000/api
```

**Important**: The `VITE_API_URL` should point to your backend server. Change this value when deploying to different environments.

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/api` |

## Changing the Server IP

To change the backend server IP, simply update the `VITE_API_URL` in the `.env` file:

```env
# For local development
VITE_API_URL=http://localhost:3000/api

# For production
VITE_API_URL=https://your-backend-domain.com/api

# For custom IP
VITE_API_URL=http://192.168.1.100:3000/api
```

After changing the `.env` file, restart the development server.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
UniChat-Frontend/
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   └── Login.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## Backend Integration

This frontend is designed to work with the UniChat backend API. Make sure the backend server is running and accessible at the URL specified in `VITE_API_URL`.

### API Endpoints Used

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/health` - Health check endpoint

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 19
- Vite
- Axios
- React Hook Form
- Zod
- React Router DOM