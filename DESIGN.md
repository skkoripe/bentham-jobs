# MCA Portal API — Design Document

## 1. Overview

### 1.1 Purpose

The **MCA Portal API** is a Node.js backend that provides:

- **Fee enquiry** for company incorporation (Ministry of Corporate Affairs, India).
- **Stamp duty calculation** for SPICe+ Part B, MoA, and AoA, using published LMA (state-wise) rules.
- **Optional scraping** of the MCA fee enquiry page and **direct MCA API probe** (the latter typically returns 403 when called from a server).

The system is designed so that the **rule-based stamp duty API** is the stable, production-ready path; scraping and direct MCA calls are documented but unreliable due to MCA’s antibot and access restrictions.

### 1.2 Goals

- Expose a clear REST API under `/api/v1` for health, fee scrape, fee enquire, and stamp duty.
- Centralise stamp duty logic in rules (state-wise + constants) for maintainability.
- Use a single error model and consistent HTTP status codes across the API.
- Keep the app modular (routes → handlers → services → rules) for testing and future features.

---

## 2. Architecture

### 2.1 High-Level Layout

```
                    HTTP Request
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express App (app.js)                                            │
│  • Helmet, CORS, JSON/urlencoded, Morgan                         │
│  • Mount: /api/v1 → routes                                       │
│  • / → app status                                                │
│  • notFound → errorHandler                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Routes (routes/index.js)                                         │
│  • /health → healthRoutes                                        │
│  • /fees  → feesRoutes (scrape, enquire, stamp-duty)            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Handlers                                                        │
│  • health.handler  → getHealth                                   │
│  • fees.handler    → scrapeFeePage, enquireFee, stampDuty        │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ mcaScraper   │ │ mcaFeeApi    │ │ stampDuty.service    │
│ .service     │ │ .service     │ │                      │
│ (Puppeteer)  │ │ (HTTPS GET)  │ │ (rules-based calc)   │
└──────────────┘ └──────────────┘ └──────────────────────┘
                                              │
                                              ▼
                          ┌───────────────────────────────────────┐
                          │  Rules                                 │
                          │  • stateRules.js (state-wise stamp)    │
                          │  • feeConstants.js (PANTAN, defaults)  │
                          │  • index.js (re-exports)                │
                          └───────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer        | Role                                                                 |
|-------------|----------------------------------------------------------------------|
| **Server**  | Starts HTTP server, graceful shutdown (SIGTERM/SIGINT).              |
| **App**     | Middleware (security, body parsing, logging), route mount, 404/error.|
| **Routes**  | Map HTTP method + path to handler.                                  |
| **Handlers**| Parse request, call service, format response, pass errors to `next`. |
| **Services**| Business logic: scrape, MCA API call, stamp duty calculation.      |
| **Rules**   | Data and constants: state-wise stamp duty, PANTAN, defaults.         |
| **Config**  | Port, NODE_ENV (from env).                                           |
| **Constants**| MCA URL, error codes/messages/status, `createError`, response body. |
| **Middleware**| 404 handler, central error handler (uses constants).               |

---

## 3. Technology Stack

| Concern       | Choice                | Notes                                      |
|---------------|-----------------------|--------------------------------------------|
| Runtime       | Node.js 18+           | LTS recommended                            |
| Framework     | Express 4.x           | Routing, middleware, JSON                 |
| Security      | Helmet, CORS          | Headers, cross-origin                      |
| Logging       | Morgan                | Combined log format                        |
| Env           | dotenv                | `.env` for PORT, NODE_ENV                  |
| Browser automation | Puppeteer        | Scraping MCA fee page (optional)           |
| HTTP client   | Built-in `https`      | Direct MCA fee API call                    |

No database: the app is stateless; stamp duty is computed from rules.

---

## 4. Component Design

### 4.1 Entry and Config

- **`src/server.js`**  
  - Requires `app` and `config`.  
  - Listens on `config.port`.  
  - On SIGTERM/SIGINT: close server and exit.

- **`src/config/index.js`**  
  - `env`: `process.env.NODE_ENV` or `'development'`.  
  - `port`: `process.env.PORT` or `3000`.  
  - `isDev`: `NODE_ENV !== 'production'`.  
  - Uses `dotenv` so `.env` is loaded.

### 4.2 App and Middleware

- **`src/app.js`**  
  - Express app: `helmet()`, `cors()`, `express.json()`, `express.urlencoded({ extended: true })`, `morgan('combined')`.  
  - `app.use('/api/v1', routes)`.  
  - `GET /` → `{ app: 'MCA Portal', status: 'running' }`.  
  - `app.use(notFound)`, `app.use(errorHandler)`.

- **`src/middleware/index.js`**  
  - **notFound**: 404 with `errorResponseBody(CODES.NOT_FOUND, ...)` and `path: req.originalUrl`.  
  - **errorHandler**: Uses `err.statusCode`, `err.code`, `err.message`, `err.details`; responds with `errorResponseBody` and correct status. If headers already sent, forwards to `next(err)`.

### 4.3 Routes

- **`src/routes/index.js`**  
  - Router with:  
    - `router.use('/health', healthRoutes)`  
    - `router.use('/fees', feesRoutes)`  
  - So effective paths: `/api/v1/health`, `/api/v1/fees/*`.

- **`src/routes/health.routes.js`**  
  - `GET /` → `healthHandler.getHealth`.

- **`src/routes/fees.routes.js`**  
  - `POST /scrape` → `feesHandler.scrapeFeePage`  
  - `POST /enquire` → `feesHandler.enquireFee`  
  - `POST /stamp-duty` → `feesHandler.stampDuty`

### 4.4 Handlers

- **`src/handlers/health.handler.js`**  
  - Returns JSON: `status: 'ok'`, `timestamp`, `env`, `uptime`.

- **`src/handlers/fees.handler.js`**  
  - **scrapeFeePage**: Reads body options (targetUrl, captureNetwork, autoResumeDebugger, extractContent, fillAndClickCalculateFee). Calls `mcaScraper.scrapeFeePage(options)`. Responds with success, data (url, title, capturedRequests, formFields, pageContent, feeApiCapture), optional error, disclaimer. Catches errors and passes to `next` (uses `createError(CODES.SCRAPE_FAILED)` if not already typed).  
  - **enquireFee**: Body as query params for MCA. Calls `mcaFeeApi.enquireFee(params)`. Responds with success, data, statusCode, error, and a note (e.g. 403 → use stamp-duty). Uses `createError(CODES.MCA_REQUEST_FAILED)` on unexpected errors.  
  - **stampDuty**: Body as input for rule-based calc. Calls `stampDutyService.calculateStampDuty(params)`. Responds with success, data, disclaimer. Uses `createError(CODES.INTERNAL_SERVER_ERROR)` on failure.

### 4.5 Services

- **`src/services/stampDuty.service.js`**  
  - **Input**: Same 8 fields as MCA form (enquireFeeFor, natureOfService, subService, opcSmallCompany, authCapital, authorisedCapitalINR, whetherSec8Company, state).  
  - **Normalisation**: `parseInput()` with defaults from `feeConstants`; state via `normalizeState()` against `STATE_RULES`.  
  - **Calculation**: Uses `getStateRule(state)`, then:  
    - INC/SPICe+ Part B: `computeInc(stateKey, isSection8, hasAuthCapital)`.  
    - MoA: from state rule or `DEFAULT_MOA_STAMP_INR`.  
    - AoA: `computeAoa(stateKey, capital, isSection8, hasAuthCapital)` (slabs, percent, per-lakh, flat, section8, no-share-capital).  
  - **Output**: registrationFees (Normal, Additional, MoA, AoA, PANTAN, Total), stampDutyFees (MOA, AOA, SPICe+ Part B, Total), feeDetailsTable (1–10), totals (totalRegistrationFees, totalStampDuty, grandTotalINR), disclaimer.

- **`src/services/mcaFeeApi.service.js`**  
  - Builds GET URL: `MCA_FEE_API_BASE + '?' + query` from params.  
  - Uses `https.get()` with Accept and User-Agent.  
  - Returns `{ success, statusCode, data, error }`. MCA often returns 403 for server-origin requests.

- **`src/services/mcaScraper.service.js`**  
  - **Puppeteer**: Launches browser (headless, no automation flags), one page.  
  - **Debugger**: CDP `Debugger.enable` + auto-resume on `Debugger.paused` so MCA’s debugger doesn’t freeze.  
  - **Network**: Captures requests/responses; detects fee API by URL (foserviceEnquirefee / Enquirefee).  
  - **Flow**: Tries configured fee page URLs; checks final URL/title to see if still on fee page (redirect = antibot). Extracts form fields (selects, inputs). Optional `fillAndClickCalculateFee`: fill form, click “Calculate Fee”, wait; feeApiCapture holds request/response.  
  - **Return**: success, url, title, capturedRequests, formFields, pageContent, redirectedToNonFeePage, feeApiCapture, error.

### 4.6 Rules

- **`src/rules/stateRules.js`**  
  - **STATE_RULES**: One key per state (and `default`). Each rule: inc, moa, aoa* (percent, slabs, flat, per-lakh, etc.), noShareCapital, section8, section8NoCapital where applicable.  
  - **getStateRule(stateKey)**: Returns rule or `STATE_RULES.default`.  
  - **listStates()**: All keys except `default`.  
  - Source of truth: LMA “Rates of Stamp Duty”.

- **`src/rules/feeConstants.js`**  
  - Defaults: DEFAULT_STATE, DEFAULT_CAPITAL, PANTAN_FEE_INR, STAMP_DUTY_SPICE_PART_B_INR, DEFAULT_MOA_STAMP_INR.  
  - Allowed values: ENQUIRE_FEE_FOR, NATURE_OF_SERVICE, SUB_SERVICE, YES_NO.

- **`src/rules/index.js`**  
  - Re-exports state rules and fee constants for services.

### 4.7 Constants and Errors

- **`src/constants/index.js`**  
  - Exports `MCA_FEE_API_BASE`, and all from `errors.js`.

- **`src/constants/errors.js`**  
  - **CODES**: NOT_FOUND, BAD_REQUEST, VALIDATION_ERROR, INTERNAL_SERVER_ERROR, MCA_REQUEST_FAILED, MCA_ACCESS_DENIED, SCRAPE_FAILED, TIMEOUT.  
  - **MESSAGES**, **HTTP_STATUS** per code.  
  - **createError(code, overrides)**: Builds Error with statusCode, code, optional details.  
  - **errorResponseBody(code, message, statusCode, details)**: Standard `{ success: false, code, message[, details] }` for API responses.

---

## 5. API Design

### 5.1 Base and Conventions

- Base URL: `http://localhost:3000` (or `PORT` from env).  
- All v1 APIs: `http://localhost:3000/api/v1/...`.  
- JSON request/response.  
- Success: `{ success: true, data: ... }`.  
- Error: `{ success: false, code, message[, details] }` with appropriate HTTP status.

### 5.2 Endpoints

| Method | Path                    | Description |
|--------|-------------------------|-------------|
| GET    | `/`                     | App status: `{ app, status }`. |
| GET    | `/api/v1/health`        | Health: status, timestamp, env, uptime. |
| POST   | `/api/v1/fees/scrape`   | Scrape MCA fee page (options in body). |
| POST   | `/api/v1/fees/enquire`  | Direct GET to MCA fee API (often 403). |
| POST   | `/api/v1/fees/stamp-duty` | Rule-based stamp duty and registration fee. |

### 5.3 Stamp Duty Request/Response (Recommended API)

- **Request body (all optional)**:  
  `enquireFeeFor`, `natureOfService`, `subService`, `opcSmallCompany`, `authCapital`, `authorisedCapitalINR`, `whetherSec8Company`, `state`.  
  Defaults applied when omitted (e.g. state = Maharashtra, capital = 100000).

- **Response**:  
  `success`, `data.inputs`, `data.registrationFees`, `data.stampDutyFees`, `data.feeDetailsTable`, `data.totals`, `data.currency`, `disclaimer`.

### 5.4 Scrape and Enquire

- **Scrape**: Body can include `targetUrl`, `captureNetwork`, `autoResumeDebugger`, `extractContent`, `fillAndClickCalculateFee`. Response includes url, title, capturedRequests, formFields, pageContent, feeApiCapture, and flags like `redirectedToNonFeePage`.  
- **Enquire**: Body fields sent as GET query params to MCA. Response includes MCA’s statusCode and body; when 403, note suggests using stamp-duty or local capture script.

---

## 6. Data Flow

### 6.1 Stamp Duty (Primary Path)

1. Client sends `POST /api/v1/fees/stamp-duty` with optional body.  
2. **fees.handler** passes body to **stampDuty.service.calculateStampDuty**.  
3. **parseInput** normalises and applies defaults using **rules** (state, capital, PANTAN, etc.).  
4. **getStateRule(state)** selects state rule (or default).  
5. **computeInc**, MoA logic, **computeAoa** produce stamp components; registration fees (PANTAN, etc.) from constants.  
6. Service returns `{ success, data, disclaimer }`.  
7. Handler returns JSON with same shape.

No external calls; all data from `stateRules.js` and `feeConstants.js`.

### 6.2 Scrape Path

1. Client sends `POST /api/v1/fees/scrape` with options.  
2. Handler calls **mcaScraper.scrapeFeePage(options)**.  
3. Puppeteer launches, enables debugger auto-resume, opens fee page URL(s).  
4. If MCA redirects (antibot), `redirectedToNonFeePage` is set.  
5. Network listener records requests/responses; fee API calls stored in feeApiCapture.  
6. Optional form fill + “Calculate Fee” click; captcha may block.  
7. Result (url, title, formFields, pageContent, capturedRequests, feeApiCapture) returned to handler and then to client.

### 6.3 Enquire Path (Direct MCA)

1. Client sends `POST /api/v1/fees/enquire` with param object.  
2. Handler forwards body to **mcaFeeApi.enquireFee(params)**.  
3. Service builds GET URL with query string and calls MCA with `https.get`.  
4. MCA often returns 403 (Access Denied) for server requests.  
5. Response (success, statusCode, data/error) and note returned to client.

---

## 7. Error Handling

- Handlers catch errors; if `err.statusCode` and `err.code` exist, they call `next(err)`.  
- Otherwise they call `next(createError(CODES.*, { message }))` (e.g. SCRAPE_FAILED, MCA_REQUEST_FAILED, INTERNAL_SERVER_ERROR).  
- **errorHandler** middleware sets status from `err.statusCode`, builds body with **errorResponseBody**, and sends JSON.  
- 404 for unknown paths via **notFound** using CODES.NOT_FOUND.

---

## 8. Security

- **Helmet**: Secure headers.  
- **CORS**: Enabled (configurable via cors options if needed).  
- No auth in current design (API is open; add auth middleware if required).  
- No secrets in rules or constants; only MCA public URL.  
- Puppeteer runs with reduced flags (no-sandbox, disable automation flags) for scraping only.

---

## 9. Configuration and Environment

- **.env** (optional): `PORT`, `NODE_ENV`.  
- **.env.example**: Documents PORT and NODE_ENV.  
- Config is read in `config/index.js` after `dotenv` in app entry.

---

## 10. Scripts and Standalone Usage

- **npm start**: `node src/server.js` (production).  
- **npm run dev**: `node --watch src/server.js` (development with auto-restart).  
- **npm run scrape**: Runs `mcaScraper.scrapeFeePage` once (no server); prints JSON.  
- **npm run scrape:capture-fee**: Same scraper with form fill and “Calculate Fee” click to capture internal fee API call; useful when scrape does not redirect.

---

## 11. Future Considerations

- **Validation**: Request body validation (e.g. Joi/Zod) for stamp-duty and enquire.  
- **Caching**: Optional short TTL cache for stamp-duty by (state, capital, section8, etc.).  
- **Rate limiting**: For scrape/enquire to avoid overloading MCA.  
- **Auth**: API key or JWT if the API is exposed to untrusted clients.  
- **More states/rules**: Add or update entries in `stateRules.js` and constants as LMA or MCA updates.  
- **Tests**: Unit tests for stamp duty rules and service; integration tests for routes.  
- **OpenAPI**: Document `/api/v1` with Swagger/OpenAPI for clients.

---

## 12. References

- [LMA – Rates of Stamp Duty](https://lma.co.in/resources/Utilities/Rates_of_stamp_duty/Rates_of_stamp_duty.aspx)  
- MCA Fee Enquiry (content): `https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/enquire-fees.html`  
- MCA internal fee API (discovered): `https://www.mca.gov.in/bin/mca/foserviceEnquirefee` (GET; often 403 from servers)
