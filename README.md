# Portafolio Minimalista Neón v4 — `alejandrogallego.dev`

Portafolio interactivo de Manuel Alejandro Gallego Alarcón, full-stack y dockerizado.

- **Frontend (`frontend/`)**: Next.js 14 (App Router, TypeScript). Retrato ASCII interactivo, cursor neón, carrusel 3D, Stickman Buddy, i18n ES/EN y el easter egg `snake.exe`.
- **Backend (`backend/`)**: FastAPI + SQLAlchemy 2 sobre PostgreSQL (SQLite en local).
- **Infraestructura**: Docker Compose con `db`, `backend` y `frontend`.

La especificación visual y funcional completa está en [`context.md`](context.md).

## Ranking mundial de `snake.exe`

El servidor nunca confía en el puntaje que envía el navegador:

1. `POST /api/game/start` emite una sesión de un solo uso firmada con HMAC-SHA256 y una semilla aleatoria.
2. Cliente y servidor generan la comida con el mismo LCG de 32 bits a partir de esa semilla.
3. `POST /api/game/submit` verifica la firma, consume la sesión de forma atómica (bloquea reenvíos), comprueba que el tiempo real transcurrido sea posible y **vuelve a jugar la partida completa** con los movimientos registrados. Si el puntaje no coincide, responde `403` y lo registra en la auditoría.

**Nombres únicos.** Cada nombre aparece una sola vez en el ranking, con el mejor puntaje del jugador:

- 3 a 20 caracteres: letras y números, unidos opcionalmente por `.`, `_` o `-` simples.
- La unicidad no distingue mayúsculas ni separadores: `Neo.Dev`, `neo_dev` y `NEODEV` son el mismo nombre (restricción `UNIQUE` en la base de datos).
- Hay nombres reservados (`admin`, `root`, el nombre del autor…) y un filtro básico de palabras ofensivas.
- El primer jugador que usa un nombre recibe un token secreto, que se guarda en su navegador (en la base solo se guarda su hash). Sin ese token, el nombre responde `409 Ese nombre ya está en uso`. Si el admin elimina la entrada, el nombre queda libre.

## Panel de administración (`/admin`)

- Contraseña verificada con bcrypt en tiempo constante; la respuesta es la misma para usuario o contraseña incorrectos.
- Sesión JWT en una cookie `HttpOnly` + `SameSite=Strict` + `Secure` (inaccesible desde JavaScript) y cabecera anti-CSRF en todas las escrituras.
- Rate limit de login: 5 fallos por IP y 20 globales cada 15 minutos.
- Métricas, moderación del ranking, auditoría de seguridad, bandeja de contacto y apariencia del sitio en vivo.

## Puesta en marcha con Docker

```bash
cp .env.example .env
# Completa .env: SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD_HASH (o ADMIN_PASSWORD) y POSTGRES_PASSWORD.
docker compose up --build -d
```

Generar los secretos:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"          # SECRET_KEY
python -c "import bcrypt, getpass; print(bcrypt.hashpw(getpass.getpass().encode(), bcrypt.gensalt(12)).decode())"  # ADMIN_PASSWORD_HASH
```

- Portafolio: `http://localhost:3000`
- Panel admin: `http://localhost:3000/admin`
- El backend solo escucha en `127.0.0.1:8090`. La documentación Swagger (`/api/docs`) está desactivada salvo que `ENABLE_DOCS=true`.

Docker Compose no arranca si falta algún secreto: no hay valores por defecto.

### Producción

- Pon un proxy inverso (Nginx, Caddy o Cloudflare) delante del frontend que **sobrescriba** `X-Forwarded-For` con la IP real, y ajusta `TRUSTED_PROXY_HOPS`. Next.js por sí solo reenvía esa cabecera tal como la manda el cliente; el límite global de login protege igual, pero el límite por IP necesita una IP confiable.
- Sirve el sitio solo por HTTPS (`COOKIE_SECURE=true`).
- El backend usa un solo worker porque los rate limiters viven en memoria.

## Desarrollo local

```bash
# Backend
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows (en Linux/macOS: source .venv/bin/activate)
pip install -r requirements-dev.txt
python -m pytest                                  # suite completa
uvicorn app.main:app --reload --port 8000          # necesita las variables de .env

# Frontend (otra terminal)
cd frontend
npm ci
npm run dev                                       # http://localhost:3000, reenvía /api a localhost:8000
```
