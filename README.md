# MCA Portal API

Node.js backend for **MCA (Ministry of Corporate Affairs)** fee enquiry and **stamp duty calculation** for company incorporation. All APIs are grouped under **`/api/v1`**.

---

## Table of Contents

- [Video: MCA issue in action](#video-mca-issue-in-action)
- [Server setup (your machine)](#server-setup-your-machine)
- [API endpoints](#api-endpoints)
- [Stamp duty: two approaches we tried](#stamp-duty-two-approaches-we-tried)
- [Recommended: rule-based stamp duty API](#recommended-rule-based-stamp-duty-api)
- [Project structure](#project-structure)
- [Postman collection](#postman-collection)
- [Environment variables](#environment-variables)
- [Disclaimer](#disclaimer)

---

## Server setup (your machine)

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (comes with Node)

### Steps

1. **Clone or download** the project and open a terminal in the project folder.

2. **Install dependencies**
   ```bash
   npm install
   ```
   (Puppeteer may take a few minutes on first install.)

3. **Environment (optional)**  
   Copy `.env.example` to `.env` and set if needed:
   ```bash
   copy .env.example .env
   ```
   Default: `PORT=3000`, `NODE_ENV=development`.

4. **Start the server**
   - **Production:** `npm start`
   - **Development (auto-restart on file change):** `npm run dev`

5. **Verify**  
   Open in browser or Postman:
   - `http://localhost:3000/` → `{ "app": "MCA Portal", "status": "running" }`
   - `http://localhost:3000/api/v1/health` → health check with uptime, env.

Base URL for all v1 APIs: **`http://localhost:3000/api/v1`** (use `http://127.0.0.1:3000` if you prefer).

---

## Video: MCA issue in action

A short screen recording shows **exactly what happens** when we try to use the MCA fee page and the direct API. **Watch the video here:**

**[▶ Watch on Google Drive](https://drive.google.com/file/d/1mP5ucIb3r7x4-JKzMgMzwpBl9jHvRJwm/view?usp=sharing)**

Anyone can open the link above to view the video. It shows: MCA’s antibot behaviour, the debugger blocking inspection, and why the `/api/v1/fees/enquire` call returns **403 Access Denied**. This is why we use the **rule-based** stamp duty API instead.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | App status |
| GET | `/api/v1/health` | Health check (uptime, env) |
| POST | `/api/v1/fees/scrape` | Scrape MCA fee page (Puppeteer); optional form fill + click |
| POST | `/api/v1/fees/enquire` | Direct GET to MCA fee API (often 403) |
| POST | `/api/v1/fees/stamp-duty` | **Rule-based stamp duty** (LMA rules); use this for fees |

All fee APIs are under **`/api/v1`**.

---

## Stamp duty: two approaches we tried

We needed **stamp duty fee for company incorporation**. Two approaches were tried.

### Approach 1: Scraping + direct MCA API call

**Idea:** Use Puppeteer to open the MCA fee enquiry page, fill the form, click “Calculate Fee”, and either scrape the result or capture the network call and call that API from our server.

**What we did:**

- **Scraping:** Puppeteer loads the MCA fee page, can fill form and click “Calculate Fee”. We added debugger auto-resume so the page doesn’t freeze when DevTools/open-inspect behaviour is detected.
- **Problems:**
  - **Antibot:** MCA site uses antibot measures; in many cases the page redirects to Home when accessed headless or when inspecting. So we couldn’t reliably stay on the fee form or inspect which network call is made.
  - **Debugger:** The site injects a `debugger` when it detects inspection, so we couldn’t easily use browser DevTools to see the exact “Calculate Fee” network request.
- **Direct API call:** We found the fee endpoint: `GET https://www.mca.gov.in/bin/mca/foserviceEnquirefee`. We added **`POST /api/v1/fees/enquire`** so the user can pass query params and our server calls this URL.

**What happens when you call `/api/v1/fees/enquire`:**

MCA blocks direct server-to-server requests. The response looks like:

```json
{
  "success": false,
  "data": "<HTML>...Access Denied...</HTML>",
  "statusCode": 403,
  "error": "...",
  "note": "MCA blocks direct server access (403). Use POST /api/v1/fees/stamp-duty for rule-based fee, or run \"npm run scrape:capture-fee\" locally when scrape does not redirect."
}
```

So **inspecting the real network call is difficult** (antibot + debugger), and **the direct call returns 403** — therefore this approach is not production-ready.

### Approach 2: Rule-based stamp duty (current solution)

**Idea:** Don’t depend on MCA’s live site or API. Use **published stamp duty rules** (state-wise) and compute fees in our backend.

**What we did:**

- **Source:** [LMA – Rates of Stamp Duty](https://lma.co.in/resources/Utilities/Rates_of_stamp_duty/Rates_of_stamp_duty.aspx) (INC-2/INC-7/INC-29, MoA, AoA, state-wise).
- **Rules in code:** State-wise rules are defined in **`src/rules/`**:
  - **`stateRules.js`** – state-wise stamp duty (INC, MoA, AoA; Section 8, no-share-capital cases where applicable).
  - **`feeConstants.js`** – PANTAN fee, defaults, etc.
- **API:** **`POST /api/v1/fees/stamp-duty`** accepts the same 8 inputs as the MCA form (all optional with defaults), and returns registration fees + stamp duty breakdown.

**Why this works:** No MCA call, no captcha, no 403. Fees are indicative and based on LMA rules; for official figures users should still refer to MCA portal / state notifications.

---

## Recommended: rule-based stamp duty API

Use **`POST /api/v1/fees/stamp-duty`** for stamp duty and registration fee calculation.

### Request

- **URL:** `POST http://localhost:3000/api/v1/fees/stamp-duty`
- **Headers:** `Content-Type: application/json`
- **Body (all fields optional; defaults applied if omitted):**

```json
{
  "enquireFeeFor": "Company",
  "natureOfService": "Name reservation and Company Incorporation",
  "subService": "Incorporation of a company (SPICe+ Part B)",
  "opcSmallCompany": "No",
  "authCapital": "Yes",
  "authorisedCapitalINR": 1000000,
  "whetherSec8Company": "No",
  "state": "Maharashtra"
}
```

### Response (example)

```json
{
  "success": true,
  "data": {
    "natureOfService": "Name reservation and Company Incorporation",
    "subService": "Incorporation of a company (SPICe+ Part B)",
    "inputs": {
      "enquireFeeFor": "Company",
      "natureOfService": "Name reservation and Company Incorporation",
      "subService": "Incorporation of a company (SPICe+ Part B)",
      "opcSmallCompany": "No",
      "authCapital": "Yes",
      "authorisedCapitalINR": 1000000,
      "whetherSec8Company": "No",
      "state": "Maharashtra"
    },
    "registrationFees": [
      { "type": "Normal Fee", "amountINR": 0 },
      { "type": "Additional Fee", "amountINR": 0 },
      { "type": "MoA registration fees", "amountINR": 0 },
      { "type": "AoA registration fees", "amountINR": 0 },
      { "type": "PANTAN fees", "amountINR": 143 },
      { "type": "Total", "amountINR": 143 }
    ],
    "stampDutyFees": [
      { "type": "Stamp Duty MOA", "amountINR": 200 },
      { "type": "Stamp Duty AOA", "amountINR": 2000 },
      { "type": "Stamp Duty SPICE+ Part B", "amountINR": 100 },
      { "type": "Stamp Duty", "amountINR": 2300 }
    ],
    "feeDetailsTable": [
      { "sNo": 1, "typeOfFee": "Normal Fee", "amountINR": 0 },
      …
      { "sNo": 10, "typeOfFee": "Stamp Duty", "amountINR": 2300 }
    ],
    "totals": {
      "totalRegistrationFees": 143,
      "totalStampDuty": 2300,
      "grandTotalINR": 2443
    },
    "currency": "INR"
  },
  "disclaimer": "Based on LMA Rates of Stamp Duty. Indicative only; refer to MCA portal and state notifications for official fees."
}
```

State list and logic are in **`src/rules/stateRules.js`** (LMA-based). Adding or updating a state is done there (and in constants if needed).

---

## Project structure

```
mcaportal/
├── src/
│   ├── server.js           # Entry; starts server on PORT
│   ├── app.js               # Express app, middleware, /api/v1 mount
│   ├── config/              # Env (port, NODE_ENV)
│   ├── constants/           # MCA URL, error codes/messages
│   ├── rules/               # Stamp duty rules (LMA-based)
│   │   ├── stateRules.js    # State-wise INC, MoA, AoA
│   │   ├── feeConstants.js  # PANTAN, defaults
│   │   └── index.js
│   ├── routes/              # /health, /fees
│   ├── handlers/            # Request handlers
│   ├── services/            # stampDuty, mcaScraper, mcaFeeApi
│   ├── middleware/          # 404, error handler (uses error constants)
│   └── ...
├── scripts/
│   ├── run-scraper.js       # npm run scrape
│   └── run-capture-fee-call.js  # npm run scrape:capture-fee
├── .env.example
├── MCA-Portal.postman_collection.json
├── package.json
└── README.md
```

- **Routes:** All under **`/api/v1`** (health, fees/scrape, fees/enquire, fees/stamp-duty).
- **Stamp duty logic:** `src/services/stampDuty.service.js` uses `src/rules/` (state + fee constants).
- **Errors:** Centralised in `src/constants/errors.js`; used in middleware and handlers.

---

## Postman collection

Import **`MCA-Portal.postman_collection.json`** into Postman.

- **Variable:** `baseUrl` = `http://localhost:3000` (do not include `/api/v1` in baseUrl).
- Requests use **`{{baseUrl}}/api/v1/health`**, **`{{baseUrl}}/api/v1/fees/stamp-duty`**, etc.

---

## Environment variables

| Variable    | Default       | Description        |
|------------|---------------|--------------------|
| `PORT`     | `3000`        | Server port        |
| `NODE_ENV` | `development` | Environment        |

See `.env.example`. Copy to `.env` and change if needed.

---

## Scripts

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| `npm start`          | Start server (production)                        |
| `npm run dev`        | Start with `--watch` (auto-restart on changes)  |
| `npm run scrape`     | Run MCA fee page scraper once (no server)        |
| `npm run scrape:capture-fee` | Scrape + form fill + “Calculate Fee” click (local) |

---

## Disclaimer

- **Stamp duty API** is based on [LMA Rates of Stamp Duty](https://lma.co.in/resources/Utilities/Rates_of_stamp_duty/Rates_of_stamp_duty.aspx). Output is **indicative**; for official fees always refer to MCA portal and state stamp duty notifications.
- **Scrape / enquire** endpoints depend on MCA’s site and API; they may be blocked (403) or change. Use **`/api/v1/fees/stamp-duty`** for a stable, rule-based response.
