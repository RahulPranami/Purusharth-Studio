# Purusharth Studio

> **"Your Moments. Your Memories."**  
> Luxury Event Photography & Cinematography Platform  
> Unified Web & Mobile Application built with React Native (Expo SDK 57), Supabase, and Cloudflare R2.

---

## 🌟 Key Features

### 1. Client & Director Portal (Mobile & Web)
- **Private Event Vault Access:** Unlock exclusive wedding & gala collections using event passcodes (e.g. `UDAIPUR-24`, `OBEROI-GL`).
- **Biometric Selfie Onboarding:** Camera and photo library reference capture uploaded directly to Cloudflare R2 for automated AI facial matching.
- **High-Resolution Gallery & Lightbox:** Responsive grid displaying high-res photographs with pinch-to-zoom, metadata, and full-screen preview.
- **Shared Collections & 4K Cinema Reels:** Master editorial lookbooks featuring ProRes 4444 teaser previews.
- **Universal Authentication:** One-Time Password (OTP) sign-in via Email or Mobile, plus Super Admin clearance.

### 2. Super Admin Operations Console (Web Dashboard)
- **Operational Telemetry Dashboard:** 4 KPI telemetry cards, live ingestion activity graphs, recent production roster, and storage capacity gauges.
- **Bulk Media Ingestion:** Multi-file drag-and-drop zone with direct-to-R2 upload pipeline, per-file upload speed, SHA verification, and automatic database registration.
- **Events Directory:** Filterable catalog with Table and Grid view modes, status pills, and interactive Create Event modal.
- **Admins & Referral Network:** Team permissions directory with clearance badges and time-expiring Admin Invite Key generator (`INVITE-2025`).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Expo SDK 57](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction/) |
| **Web Runtime** | [React Native Web 0.21](https://necolas.github.io/react-native-web/) |
| **Database & Auth** | [Supabase](https://supabase.com) (PostgreSQL 15, RLS, Stored Procedures, OTP Auth) |
| **Media Storage & CDN** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (APAC region) + Managed Public CDN |
| **UI Design System** | Stitch Luxury Ivory/Gold Theme (Client) + Linear/Stripe Console (Super Admin) |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Storage & Backend Pipeline
Run the automated end-to-end verification script testing Cloudflare R2 uploads, public CDN reads, and Supabase media registration:
```bash
npm run verify:r2
```

### 3. Start Development Server
```bash
# Launch Admin Dashboard & Client on Web Browser
npx expo start --web

# Launch Universal Dev Server (iOS, Android, Web)
npx expo start
```

---

## 🗺️ Application Routes

- `/`: Client Lookbook, Event Vault Access, Active Passes, Curated Collections
- `/login`: Universal OTP Login (Email / Mobile) & Super Admin clearance
- `/profile`: Biometric Selfie Onboarding & User Profile Settings
- `/event/[id]`: Event Photo Gallery & High-Res Lightbox Modal
- `/admin`: Super Admin Telemetry Dashboard Overview
- `/admin/events`: Events Directory & Create Event Modal
- `/admin/uploads`: Photo Uploads & Multi-File Drag-and-Drop Bulk Ingest
- `/admin/admins`: Admins Roster & Generate Invite Code Modal
- `/admin/login`: Dedicated Super Admin Console Login

---

## 📚 Complete Documentation

For the comprehensive system architecture, database schema diagrams, Row-Level Security policies, Cloudflare R2 API specifications, and operational runbook, please see:

👉 **[docs/SYSTEM_DOCUMENTATION.md](file:///C:/Users/rahul/Projects/Purusharth-Studio/docs/SYSTEM_DOCUMENTATION.md)**
