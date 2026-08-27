# Production-Grade Authentication Plan (Redis + JWT)

Since you already have Redis installed, we are going with the **Enterprise Standard** approach! We will use stateless JWTs for blazing-fast API access, and Redis to manage long-lived sessions and enable instant logouts.

## 🧠 How the Redis Auth Flow Works

1. **Login (The Setup)**
   - User submits valid credentials.
   - Server generates an **Access Token (15-minute lifespan)** and a **Refresh Token (7-day lifespan)**.
   - Server saves the Refresh Token into Redis with a strict Time-To-Live (TTL) of 7 days. The key will look like: `session:{refreshToken}` and the value will be the `userId`.
   - Both tokens are sent to the frontend.

2. **API Requests (The Happy Path)**
   - Frontend attaches the Access Token to every API request header (`Authorization: Bearer <token>`).
   - The backend `authMiddleware` verifies the signature. **(Redis is NOT queried here)**. This makes 99% of your API requests incredibly fast and completely stateless.

3. **Token Expiration (The Refresh)**
   - After 15 minutes, the Access Token dies. The frontend detects a `401 Unauthorized`.
   - The frontend silently calls `POST /api/auth/refresh`, sending the long-lived Refresh Token.
   - The server queries Redis: *"Does this Refresh Token exist?"*
   - If yes, the server generates a brand new 15-minute Access Token and sends it back. The user never knows they were "logged out."

4. **Logout (The Kill Switch)**
   - User clicks Logout. Frontend calls `POST /api/auth/logout` with the Refresh Token.
   - Server deletes the key from Redis.
   - The session is instantly destroyed. Even if the user still has the Refresh Token, it is useless because Redis no longer recognizes it.

---

## Action Plan

### 1. Redis Configuration
#### [NEW] `src/config/redis.js`
- Install `redis` npm package.
- Create a Redis client connection pool similar to how we did MySQL.
- Update `app.js` to initialize the connection on boot.

### 2. JWT Configuration Updates
#### [MODIFY] `src/utils/jwt.js`
- Change `JWT_EXPIRES_IN` to `15m` (Access Token).
- Add `generateRefreshToken()` utility.
- Add `JWT_REFRESH_SECRET` and `JWT_REFRESH_EXPIRES_IN=7d` to `.env`.

### 3. Controller & Routing
#### [MODIFY] `src/controllers/authController.js`
- Update `login` to generate both tokens and store the session in Redis (`SETEX session:{token} 604800 {userId}`).
- Create `refresh` endpoint to handle token cycling.
- Create `logout` endpoint to handle session destruction (`DEL session:{token}`).

#### [MODIFY] `src/routes/authRoutes.js`
- Mount the new `/refresh` and `/logout` endpoints.

## Next Steps
Please review this detailed Redis workflow. If the architecture makes sense, click **Proceed** and I will begin the installation and coding!
