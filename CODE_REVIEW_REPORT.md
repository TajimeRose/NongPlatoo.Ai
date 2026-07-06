# NongPlatoo.Ai Code Review Report

วันที่ตรวจ: 10 มิถุนายน 2026

## Executive Summary

สถานะรวม: **ยังไม่พร้อม deploy production**

- Critical: 3 ประเด็น
- High: หลายประเด็นที่กระทบ authentication, API และ runtime
- Automated tests: 0 ไฟล์
- Python syntax: ผ่าน 49 ไฟล์
- Git worktree ก่อนสร้างรายงาน: clean
- ไม่มีการแก้ source code ระหว่างการรีวิว

## Findings

| File/Location | Issue | Severity | Reason | Suggested Fix |
|---|---|---|---|---|
| `frontend/src/pages/Chat.tsx:553`, `app.py:706` | ผู้ใช้ทุกคนใช้ `user_id: "web"` | Critical | ผู้ใช้ต่างคนแชร์ conversation memory และ AI อาจได้รับประวัติของผู้ใช้อื่น | ใช้ authenticated identity หรือ random session ID ที่ผูกกับ secure cookie |
| `app.py:456`, `app.py:477` | อ่านหรือลบ history ของ `user_id` ใดก็ได้โดยไม่ตรวจสิทธิ์ | Critical | เปิดเผยและทำลายบทสนทนาของผู้ใช้อื่นได้ | บังคับ authentication และตรวจว่า identity เป็นเจ้าของ history |
| `app.py:1625` | Image proxy มีช่อง SSRF | Critical | ตรวจ URL ด้วย `startswith()` และตาม redirect โดยไม่ตรวจปลายทาง | Parse hostname, ใช้ exact allowlist, resolve IP และตรวจทุก redirect |
| `backend/routes/news.py:7` | Import `session_scope` ที่ไม่มีใน `backend/db.py` | High | ทำให้ import `backend.api` ล้ม และ auth/users/news blueprints ไม่ถูก register | เพิ่ม session helper ที่ถูกต้องหรือใช้ `get_session_factory()` |
| `app.py:135` | กลืนความผิดพลาดระหว่าง API initialization | High | `/health` ยังตอบ healthy แม้ API หลักไม่ถูกเปิดใช้งาน | Fail fast ใน production และเพิ่ม readiness check |
| `backend/routes/news.py:109` | News create/update/delete ไม่มี auth | High | บุคคลทั่วไปสามารถแก้หรือลบข่าวได้เมื่อ route ทำงาน | บังคับ JWT/Firebase token และตรวจ admin role |
| `backend/extensions.py:36`, `app.py:233` | JWT มี default secret คาดเดาได้และ initialize ซ้ำ | High | สามารถปลอม token หากไม่ได้กำหนด production secret | บังคับ secret จาก environment และ initialize JWT จุดเดียว |
| `frontend/src/hooks/useAuth.tsx:65` | Frontend ใช้ Firebase Auth แต่ backend ใช้ JWT ภายใน | High | Firebase token ไม่ถูกส่งหรือ verify; backend มองผู้ใช้เป็น anonymous | เลือก auth architecture เดียวและ verify token ฝั่ง backend |
| `backend/api/tracking.py:134` | ผู้ใช้ที่ล็อกอินคนใดก็ได้อ่าน tracking logs | High | เปิดเผย IP, user agent และข้อมูลพฤติกรรม | ตรวจ admin role และลดข้อมูลส่วนบุคคลใน response |
| `app.py:1293` | Timeout ไม่ได้หยุด worker จริง | High | การออกจาก `ThreadPoolExecutor` รอ task จบ ทำให้ response อาจยังค้าง | ใช้ timeout ที่ HTTP client, job queue หรือ cancellable async operation |
| `backend/db.py:604` | `attraction_type` argument ไม่ถูกใช้ใน query | High | `search_main_attractions()` อาจคืนรายการประเภทอื่น | เพิ่ม `Place.attraction_type == attraction_type` ใน statement |
| `app.py:1449` | อ้าง `Place.city` ที่ไม่มีใน model | High | `/api/filters/districts` เกิด runtime error | เพิ่ม column/migration หรือ derive district จาก address ด้วย query ที่รองรับ |
| `backend/services/database.py:67` | อ้าง `Place.rating` ที่ไม่มีใน model | High | `get_all_destinations()` ใช้งานไม่ได้ | เพิ่ม schema ที่ตรงกันหรือเปลี่ยน field สำหรับ sort |
| `entrypoint.sh:26` | Gunicorn sync workers ไม่เหมาะกับ SSE | High | Streaming request ยึด worker และรองรับ concurrent chat ได้น้อย | ใช้ worker ที่รองรับ streaming หรือแยก streaming service |
| `app.py` chat/STT/TTS routes | ไม่มี rate limiting | High | เสี่ยง DoS และค่า external API สูงจาก anonymous traffic | เพิ่ม per-IP/per-user rate limits และ quotas |
| `docker-compose.yml:14` | มี default secret และ DB password อาจว่าง | High | Production สามารถเริ่มด้วย config ที่ไม่ปลอดภัย | ใช้ required-variable syntax และหยุด startup เมื่อค่าขาด |
| `frontend/src/pages/Chat.tsx:591` | SSE parser ไม่เก็บ partial buffer | Medium | JSON event ที่แบ่งข้าม network chunks จะถูกทิ้ง | เก็บ buffer จนพบ event delimiter `\n\n` |
| `frontend/src/pages/Chat.tsx:562` | Retry/fallback เพิ่มข้อความผู้ใช้ซ้ำ | Medium | Streaming เพิ่มข้อความก่อนเรียก non-streaming ที่เพิ่มข้อความอีกครั้ง | แยก transport retry ออกจากการเพิ่ม UI message |
| `backend/api/feedback.py:28` | Feedback ไม่ validate type, length และ ownership | Medium | ใครก็ overwrite feedback ของ `chat_log_id` อื่นได้ | Validate schema และตรวจเจ้าของ chat log |
| `app.py:517` | TTS ไม่มี text limit และ temp file อาจค้าง | Medium | เสี่ยง resource exhaustion | จำกัด input และ cleanup temp file ใน `finally` |
| `backend/models/chat_log.py`, `backend/db.py:263` | มี `ChatLog` สอง schema | Medium | Columns และชนิด `session_id` ไม่ตรงกัน | ใช้ model ชุดเดียวและจัดการ schema ด้วย migration |
| `frontend/src/pages/Places.tsx:139` | ไม่ map `google_maps_link` | Medium | ปุ่ม Google Maps ไม่แสดงแม้ backend ส่งข้อมูล | รองรับทั้ง `google_maps_link` และ `googleMapsUrl` |
| `frontend/src/lib/firebase.ts`, `frontend/.env.production` | Firebase production config ว่าง | Medium | Production login มีแนวโน้มล้มเหลว | Inject `VITE_FIREBASE_*` ระหว่าง build และ validate ก่อน build |
| `frontend/.env.production:5` | API domain hardcode เป็น production | Medium | Staging และ preview อาจเรียก production API | ใช้ environment-specific configuration หรือ same-origin |
| `.gitignore:8` | มี Git conflict markers | Medium | Ignore rules สับสนและ ignore test files | Resolve conflict และไม่ ignore `test_*.py` |
| `backend/.env.production` | Production env ถูก commit | Medium | แม้เป็น placeholder แต่เสี่ยงถูกแทนด้วย secret จริงในอนาคต | เก็บเฉพาะ `.env.example` และใช้ secret manager |
| `README.md:133` | เอกสาร build/deploy ไม่ตรง implementation | Medium | Build ออก `backend/static` ไม่ใช่ `frontend/dist`; Compose ไม่ publish port 9000 | ปรับ README ให้ตรงคำสั่งจริง |
| `backend/requirements.txt` | Python dependencies ไม่ pin | Medium | Build แต่ละครั้งอาจได้ dependency คนละ major version | สร้าง lockfile พร้อม hashes |
| `frontend/package.json` | Toolchain อยู่หลาย major หลัง version ปัจจุบัน | Low | เพิ่มภาระ maintenance แต่ไม่ควรอัปเกรดแบบข้าม major ทันที | วางแผนอัปเกรดและทดสอบเป็นรอบ |

## 1. Project Structure

- แยก `frontend/` และ `backend/` แล้ว แต่ backend entry point และ domain logic กระจุกในไฟล์ใหญ่
- `app.py` ประมาณ 1,751 บรรทัด และ `backend/chat.py` ประมาณ 2,505 บรรทัด
- มี chatbot implementation ซ้ำใน `backend/services/chatbot.py` และ `backend/tmp_chatbot_fixed.py`
- มี generated frontend assets ใน `backend/static/` รวมกับ source assets ทำให้ repository ใหญ่และเกิด stale build ได้
- มีไฟล์ที่ควรลบหรือเลิก track:
  - `backend/tmp_chatbot_fixed.py`
  - `frontend/src/components/VoiceAIInterface_backup.tsx.txt`
  - `frontend/vite.config.ts.timestamp-*.mjs`
  - `backend/.env.production`
  - built JS/CSS รุ่นเก่าใน `backend/static/assets`
- มี README, `.gitignore`, requirements และ frontend lockfile แต่ไม่มี Python lockfile
- Root `package-lock.json` เป็น lockfile ว่างและไม่จำเป็น

## 2. Code Correctness

- Python ทั้ง 49 ไฟล์ compile ผ่าน ไม่พบ syntax error
- พบ runtime errors จาก missing import และ model-field mismatch
- `search_places()` ไม่ใช้ `attraction_type` ตามสัญญาของฟังก์ชัน
- มี broad exception handling จำนวนมาก ทำให้ error ถูกซ่อน
- มี schema/model ซ้ำหลายชุดซึ่งอาจสร้างตารางไม่ตรงกัน

## 3. Security

- ไม่พบ API key จริงใน repository ปัจจุบัน ค่าใน env เป็น placeholder
- พบ Critical SSRF ใน image proxy
- Conversation ไม่มี tenant/session isolation
- JWT มี insecure fallback secrets
- ไม่มี rate limiting ใน endpoint ที่มีต้นทุนสูง
- News mutation และ tracking statistics ขาด authorization
- CORS ใช้ allowlist แต่ `supports_credentials=True` ควรใช้เฉพาะกรณีจำเป็น
- ยังไม่มี CSP header

## 4. Backend/API

- HTTP methods โดยรวมเหมาะสม
- Error response หลายจุดคืน `str(e)` ทำให้ข้อมูลภายในรั่ว
- `/health` ตรวจเพียง process ไม่ตรวจ DB, API registration หรือ dependencies
- `/api/places` โหลดข้อมูลทุกแถวโดยไม่มี pagination
- News list รับ `limit` และ `offset` โดยไม่จำกัดค่าบน
- การจัดการ schema ใช้ `create_all()` แทน migration ที่ตรวจสอบย้อนหลังได้

## 5. Frontend/UI

- โครงสร้าง React components และ responsive utilities โดยรวมเหมาะสม
- Auth UI ดูครบ แต่ไม่เชื่อมกับ backend authorization
- `PageViewTracker` มี implementation แต่ไม่ได้ mount ใน `App.tsx`
- หน้า place detail แสดงข้อมูลดิบทั้งหมด ทำให้ UX หนาแน่น
- ปุ่ม voice AI ใน `Navbar` ไม่มีจุดที่ตั้ง `isVoiceOpen=true`
- มีการขอกล้องเมื่อเปิด Voice AI ควรอธิบาย consent และเหตุผลชัดเจน
- External links ที่ตรวจพบใช้ `noopener noreferrer` ถูกต้อง

## 6. Performance

- Main built JS ประมาณ 1.17 MB
- Source assets รวมประมาณ 4.4 MB และ built assets ประมาณ 7.6 MB
- มี built JS/CSS ซ้ำอย่างน้อยสองชุด
- Face detection ทำงานทุก 100 ms
- Gunicorn sync worker ไม่เหมาะกับ SSE
- มีการสร้าง `ThreadPoolExecutor` ต่อ request หลายจุด
- Places API และบาง database services โหลดข้อมูลทั้งหมดก่อน slice

## 7. Maintainability

- ชื่อหลายส่วนสื่อความหมายดี แต่มี implementation ซ้ำและ ownership ไม่ชัด
- `app.py` มี routes, security, TTS, streaming, DB access และ static serving ในไฟล์เดียว
- มี `print()` ผสมกับ logging
- TypeScript ปิด strict checks หลายรายการ
- `.gitignore` ยังมี merge conflict markers

## 8. Error Handling and Edge Cases

- มี fallback สำหรับ DB/OpenAI/TTS หลายระดับ
- Broad exceptions ทำให้ startup สำเร็จแบบ feature บางส่วนหาย
- Invalid numeric query parameters บาง route กลายเป็น 500
- VAD ไม่จำกัด file size และค่าพารามิเตอร์
- TTS ไม่มี input-length limit
- SSE ไม่มี partial-event buffering
- Conversation memory ไม่ thread-safe และแยกตาม Gunicorn worker

## 9. Dependencies

- Frontend มี `package-lock.json` และ `bun.lockb` พร้อมกัน ควรเลือก package manager เดียว
- Python dependencies ใช้ `>=` เกือบทั้งหมด ทำให้ build ไม่ reproducible
- OpenAI SDK constraint กว้างตั้งแต่ `>=1.35.0`
- Dependency audit ยังรันไม่สำเร็จเพราะ network `ECONNRESET`
- ควรตรวจ package ที่ไม่ได้ใช้งานหลัง build/test พร้อม dependency scanner

## 10. Testing

ไม่พบ unit test, integration test หรือ CI workflow ที่รันอัตโนมัติ

### Test Cases ที่ควรเพิ่ม

1. Auth: register, login, expired token, disabled user และ role escalation
2. Conversation: ผู้ใช้ A ต้องอ่านหรือลบ history ของ B ไม่ได้
3. SSRF: domain suffix ปลอม, private IP และ redirect ไป internal service
4. News: anonymous/non-admin ต้องได้รับ 401 หรือ 403
5. Chat: empty input, 5,001 characters, OpenAI down, DB down และ timeout
6. SSE: JSON event ถูกแบ่งระหว่าง chunks ต้อง parse ได้
7. Database: attraction type, district/category filters และ null coordinates
8. Feedback: invalid type, nonexistent log และ ownership
9. TTS/STT: oversized body, invalid audio, timeout และ cleanup
10. Deployment smoke test: frontend, health, DB readiness และ static assets

## 11. Deployment Readiness

โปรเจกต์ยังไม่พร้อม production เนื่องจาก:

- API blueprint registration สามารถล้มโดยที่ health check ยังผ่าน
- ไม่มี migration workflow
- Production secrets ไม่ถูกบังคับ
- Firebase config ไม่ถูก inject ใน Docker build
- Dockerfile ใช้ `npm install` แทน `npm ci`
- Compose เปิด PostgreSQL port ต่อ host โดยไม่จำเป็น
- Compose `depends_on` ไม่รอ database health
- Container รันด้วย root user
- ไม่มี CI/CD quality gates

## 12. Priority Summary

### จุดที่ต้องแก้ทันที

1. Conversation privacy และ authorization
2. SSRF ใน image proxy
3. `session_scope` import และ blueprint initialization
4. News/tracking authorization
5. JWT secret และ auth architecture
6. Rate limiting และ request-size limits

### จุดที่ควร Refactor

1. แยก `app.py` เป็น application factory, blueprints และ services
2. รวม DB models เป็นชุดเดียว
3. รวม chatbot implementations
4. สร้าง shared validation/error response layer
5. เปลี่ยน in-memory global state เป็น persistent/session-aware storage
6. ทำ SSE parser และ transport layer แยกจาก UI state

### จุดที่ทำได้ดี

- SQL query ส่วนใหญ่ใช้ SQLAlchemy parameterization
- Password ถูก hash ด้วย Werkzeug
- CORS มี origin allowlist
- มี security headers เช่น `nosniff`, frame protection และ HSTS ใน production
- External links ใช้ `noopener noreferrer`
- Frontend มี responsive layout และ accessibility primitives จาก Radix UI
- Docker ใช้ multi-stage build

### ลำดับการแก้ไขที่แนะนำ

1. Security and privacy blockers
2. Runtime/API initialization blockers
3. Authentication and authorization
4. Database schema and migrations
5. Rate limits, input validation and error responses
6. SSE, timeout and concurrency fixes
7. Automated tests and CI
8. Refactoring and dependency upgrades
9. Documentation and repository cleanup

## Commands

```bash
# Python checks
python -m compileall app.py backend
python -m pytest -q
ruff check app.py backend
mypy app.py backend
pip-audit -r backend/requirements.txt

# Frontend checks
cd frontend
npm ci
npm run lint
npm run build
npm audit --omit=dev

# Deployment checks
docker compose config
docker compose build --no-cache
docker compose up
curl -f http://localhost:8000/health
```

## Verification Performed

- ตรวจ tracked files: 431 ไฟล์
- ตรวจ Python source: 49 ไฟล์
- ตรวจ TypeScript/TSX source: 87 ไฟล์
- Python syntax compile: ผ่าน
- Shell syntax: ผ่าน
- `docker compose config`: ผ่าน พร้อม warning เรื่อง environment variables และ obsolete `version`
- Frontend lint/build: ยังยืนยันไม่ได้ เพราะ dependency installation ล้มด้วย network `ECONNRESET`
- Automated test files: 0

