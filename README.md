# UniChat

**An experimental real-time communication platform prototype.**

> **Project status: Experimental / Pre-UniSphere.** UniChat was built before UniSphere as a standalone learning and experimentation project. Its purpose was to explore communication-platform concepts, test implementation approaches, and understand the engineering behind real-time messaging and community features. It is not a production-ready service and is not the official communication module of UniSphere.

## Project background

UniChat served as a practical environment for experimenting with ideas such as direct messaging, server-based communities, channels, live presence, message delivery, and voice-call signaling. The lessons and technical understanding gained from this prototype helped inform the broader product thinking behind UniSphere.

The repository is retained as an experimental project and learning reference. Its existence does not imply that every feature is complete, secure, deployed, or actively maintained.

## Technical architecture

The repository is organized as a separate frontend and backend:

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Socket.IO Client |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Real-time communication | Socket.IO |
| Background processing | BullMQ, Redis / ioredis |
| Authentication | JWT, bcrypt |
| Supporting services | Nodemailer, file storage, rate limiting |

## Experimental areas

The codebase explores the following areas. Their presence in the repository should not be interpreted as production qualification.

- **Direct messaging:** one-to-one conversations and message history.
- **Servers and channels:** community-style spaces, membership, roles, invitations, and text/voice channel concepts.
- **Real-time events:** message delivery, online presence, typing indicators, and Socket.IO event handling.
- **Calls:** call signaling and call-related UI components.
- **Message experience:** attachments, reactions, stickers, editing/deletion-related structures, and notifications.
- **Administration and moderation:** roles, permissions, member management, moderation routes, and audit-log structures.
- **Frontend architecture:** modular React components, contexts, and API service organization.

## Repository structure

```text
UniChat/
├── UniChat-Backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
├── UniChat-Frontend/
│   └── src/
├── UniChat-DOCUMENTATION.md
└── README.md
```

## Local development

Requirements depend on the current implementation and may change. A typical development setup uses Node.js, npm, and a reachable MongoDB instance. Redis may be needed for the background-processing and presence-related components.

### Backend

```bash
cd UniChat-Backend
npm install
npm run dev
```

### Frontend

Open a second terminal:

```bash
cd UniChat-Frontend
npm install
npm run dev
```

Configure local environment variables using the configuration expected by the backend and frontend source. Never commit real credentials, tokens, database URLs, or private keys.

## Testing and verification

The backend package currently does not define an automated test suite; its `npm test` script is a placeholder that exits with an error. The repository includes a manual testing guide at [UniChat-Backend/TESTING.md](UniChat-Backend/TESTING.md) and additional architecture notes in [UniChat-DOCUMENTATION.md](UniChat-DOCUMENTATION.md).

Treat all features as experimental until they have been independently tested in the intended environment. In particular, verify authentication, authorization, message privacy, file handling, call signaling, rate limits, and cleanup behavior before exposing any instance to real users.

## Relationship to UniSphere

UniChat predates UniSphere. It was created to experiment with and understand communication features and the engineering concepts behind them. UniSphere is a separate, broader platform with its own architecture, requirements, and implementation. UniChat is not a dependency or a production subsystem of UniSphere unless a future integration is explicitly designed and verified.

## Disclaimer

This repository is provided for educational, prototyping, and engineering-reference purposes. It is not presented as a secure, reliable, or production-ready messaging service. Use only in controlled development environments and do not place sensitive or real user data in an unverified deployment.

## License

No license is asserted by this README. Refer to the repository's license file, if one is added, for applicable permissions.
