# 🏨 HotelPro — Enterprise Hotel Management Solution

**HotelPro** is a modern, single-service hotel management platform engineered for **Vercel** and **MongoDB Atlas**, built with **React (JSX)**, **Node.js/Express**, and **JWT Authentication**.

---

## 🌟 Architecture & Highlights

- **Single-Service Vercel Deployment**:
  The Express API (`server/app.cjs`) is served in production via Vercel serverless function (`api/index.js`), while Vite builds the React client into `dist`. Zero CORS friction.
- **Embedded Local Dev Server**:
  Running `npm run dev` starts Vite with the Express server mounted directly via Vite middlewares on `http://localhost:3000`. No separate background processes or ports needed.
- **MongoDB Atlas Integration**:
  Engineered with native MongoDB connection pooling and automatic index initialization (`hp2_*` collections).
- **Double-Booking Prevention**:
  Transactional reservation engine with optimistic room locking and conflict-free date queries.
- **Role-Based Access Control (RBAC)**:
  - **Guests**: Browse suites, check live date availability, reserve rooms, view digital folios / statements, cancel eligible stays, and submit housekeeping/service requests.
  - **Staff**: Front desk check-in / check-out, record payments received, manage room housekeeping readiness (`available`, `cleaning`, `maintenance`), and resolve service tickets.
  - **Admin**: Full executive operations, room inventory management (add, edit, archive), staff account provisioning, audit log, and property settings.
- **Clean Production UI**:
  Warm, luxury hospitality design with full responsiveness, print-ready digital guest folios, and zero mock/demo gimmicks.

---

## 🚀 Getting Started

### 1. Environment Setup
Configure `.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/hotelpro?retryWrites=true&w=majority
JWT_SECRET=hotelpro_super_secure_jwt_secret_key_2026_at_least_32_chars
```

### 2. Seed Hotel Inventory & Accounts
Populate your database with authentic luxury suites, hotel property settings, and initial accounts:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Change an existing hotel's display currency to INR
Run `npm run currency:inr` once against the configured MongoDB database. This updates hotel settings, existing reservations, payments, and dollar signs in activity descriptions to INR/₹. It keeps every numeric amount unchanged, so use it only when those existing numbers should now be treated as rupee amounts. The command is safe to rerun and does not reset hotel data.

### 4. Run Automated Test Suite
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Deploy to Vercel

1. Push your code to your GitHub repository.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `JWT_SECRET`: A secure string (at least 32 characters).
4. Click **Deploy**. Vercel will build the frontend and serve both the static assets and the `/api` serverless handler automatically under a single domain.
