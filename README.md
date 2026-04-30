# Focusly Backend API

The backend for Focusly is built with **NestJS**, serving a **GraphQL API** and managing authentication/data via **Firebase Admin SDK**.

## 🛠 Tech Stack

-   **Framework**: [NestJS](https://nestjs.com/)
-   **API Language**: GraphQL (Code-First approach)
-   **Database/Auth**: Firebase Admin SDK
-   **Authentication Strategies**: Passport (JWT)
-   **Language**: TypeScript

## 🚀 Getting Started

### 1. Prerequisites
-   Node.js (v18+)
-   Yarn package manager
-   A Firebase Service Account Key (JSON)

### 2. Installation

```bash
# Install dependencies
$ yarn install
```

### 3. Environment Configuration

Create a `.env` file in the root directory. You can use `.env.example` as a template.

```bash
cp .env.example .env
```

**Required Variables:**
The application requires Firebase Admin credentials to interact with your Firebase project.

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@...
# logic for handling private key with newlines might be needed depending on your implementation
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour...\nKey\n-----END PRIVATE KEY-----\n"
```

### 4. Running the Application

```bash
# development mode (watch)
$ yarn start:dev

# production mode
$ yarn start:prod
```

The server will start on port **3000** by default.
-   **GraphQL Playground**: `http://localhost:3000/graphql`

## 🧪 Testing

```bash
# unit tests
$ yarn test

# e2e tests
$ yarn test:e2e

# test coverage
$ yarn test:cov
```

## 📂 Project Structure

-   `src/app.module.ts`: Root module.
-   `src/modules/`: Feature modules (Users, Tasks, etc.).
-   `src/auth/`: Authentication logic (Guards, Strategies).
-   `test/`: End-to-end tests.
# Focusly-back
# Focusly-back
# focusly-back
# focusly-back
