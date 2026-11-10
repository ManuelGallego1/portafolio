# Contexto del Proyecto — Portafolio Minimalista Neón (v4 Full-Stack)

## 1. Visión General
Este proyecto migra y expande la versión final del portafolio interactivo de **Manuel Alejandro Gallego Alarcón** (`Portafolio Manuel Gallego v4.html` / `Portafolio v4.dc.html`, dominio oficial `https://alejandrogallego.dev/`) hacia una arquitectura **Full-Stack Dockerizada** en paralelo dentro del directorio `./portafolio`:
- **Dominio / URL**: `https://alejandrogallego.dev/` (`alejandrogallego.dev`)
- **Frontend (`./portafolio/frontend`)**: Next.js (App Router, React, TypeScript) replicando al **100% la fidelidad visual, tipográfica, responsive y de animaciones** de `Portafolio Manuel Gallego v4.html` y `404.dc.html`.
- **Backend (`./portafolio/backend`)**: Python con **FastAPI**, SQLAlchemy y validación criptográfica/determinista de jugadas (Anti-Cheat Engine) + autenticación JWT para el perfil de Administrador.
- **Infraestructura (`./portafolio/docker-compose.yml`)**: Contenedores orquestados para `frontend`, `backend` y base de datos persistente (`postgres` / `sqlite`).

---

## 2. Línea Base Visual y Funcional (`Portafolio v4.dc.html`)

### 2.1 Sistema de Diseño y Tokens Visuales
- **Colores Base**:
  - Fondo principal: `#09090B`
  - Superficies / Cards / Modales: `#0E0E11`, `#16161A`
  - Bordes: `#18181B`, `#1F1F23`, `#27272A`, `#3F3F46`, `#52525B`
  - Texto primario / Highlights (`HI`): `#FAFAFA`
  - Texto secundario: `#D4D4D8`, `#B4B4BC`, `#A1A1AA`
  - Texto atenuado / Índices: `#71717A`
- **Paletas de Acento (`--accent`)**:
  - `Lima` (Default): `#D4FF3A`
  - `Cian`: `#3AF2FF`
  - `Magenta`: `#FF4FD8`
  - `Naranja`: `#FF8A3A`
- **Tipografía**:
  - Sans-serif principal: `'Geist', system-ui, sans-serif` (pesos 300, 400, 500, 600).
  - Monoespaciada / UI técnica: `'Geist Mono', monospace` (pesos 400, 500).
- **Internacionalización (i18n)**:
  - Soporte completo en tiempo real para **Español (`es`)** e **Inglés (`en`)** persistido en `localStorage` (`mg-lang`), con transición suave de opacidad y `blur(4px)` en el contenedor principal (`contentRef`).

### 2.2 Componentes y Animaciones Clave de la v4
1. **Pantalla de Carga (`renderLoader`)**:
   - Animación inicial con prompt `> mg` (`mgType`) + cursor parpadeante (`blink`) y barra de progreso (`mgBar`), desvaneciéndose con `scale(1.06)` y `blur(6px)` mientras el contenido entra con transición `cubic-bezier(.2,.7,.2,1)`.
2. **Cursor Neón Personalizado (`setupCursor` / `tickCursor`)**:
   - Punto central (`5px`, `#FAFAFA`) y anillo con interpolación lineal (`lerp 0.32`, `26px` normal, `38px` sobre elementos interactivos `a, button`), ocultándose automáticamente sobre `canvas`, `input` o `textarea`.
3. **Fondos Dinámicos**:
   - Grilla sutil (`64px × 64px`, `#ffffff08`) con máscara de degradado vertical.
   - Resplandor radial opcional (`showGlow`) siguiendo las coordenadas del puntero (`--mx`, `--my`).
4. **Retrato Interactivo en Hero (`ASCII` / `Duotono`)**:
   - Modo **ASCII** (por defecto): Renderiza `assets/manuel.jpg` sobre un `<canvas>` de `48` a `60` columnas usando la rampa `' .·:-=+*#%@'` y ruido inicial/periférico `'01<>/{}[]=+*'`, onda de escaneo vertical (`scan`) y una lente circular interactiva al pasar el cursor que revela la fotografía original en duotono con el color `--accent`.
   - Modo **Duotono**: Imagen con `grayscale(1) contrast(1.25) brightness(0.9)` y capa `mix-blend-mode: multiply` con `var(--accent)`.
5. **Stickman Buddy (`drawBuddy`, `drawFig`, `drawFront`)**:
   - Lienzo fijo a pantalla completa (`z-index: 15`, `pointer-events: none`), activo en viewports `>= 760px`.
   - **Plataformas (`[data-plat="00" .. "07"]`)**: El stickman detecta el scroll y salta con física parabólica entre las etiquetas de cada sección (`00` Hero, `01` Sobre mí, `02` Experiencia, `03` Proyectos, `04` Stack, `05` Educación, `06` Recomendaciones, `07` Contacto).
   - **Física y Partículas**: Agachado previo al salto (`crouch`), giro mortal en el aire (`spin`) cuando la distancia vertical supera `160px`, compresión al aterrizar (`squash`) y partículas de polvo (`dust`).
   - **Interacción con el Usuario**:
     - Sigue el cursor con la mirada (`eye`, `eyeF`) cuando el mouse se acerca a `< 180px`.
     - Se asusta (`!`) y corre/salta lateralmente si el cursor se acerca a `< 46px`.
     - Al hacer clic sobre él (`< 30px`), realiza un mortal hacia atrás (`flipT`) y dice `¡ey!`, `jaja`, `¡otra vez!`, `wiii` (o equivalente en inglés).
   - **Repertorio de Gestos y Acrobacias**: `wave`, `look`, `stretch`, `tap`, `shrug`, `hop`, `front`, `frontwave`, `dance`, `backflip`, `cartwheel`, `handstand`, `think`, `clap`, `point`, `type`.
   - **Bocadillos de Diálogo (`bubble`)**: Mensajes contextuales por sección, frases de desarrollador y pistas secretas del Easter Egg (`psst… ↑↑↓↓←→←→BA`, `psst… toca el logo 5 veces`).
6. **Secciones del Portafolio**:
   - **Navbar**: Sticky con `backdrop-filter: blur(14px)`, logo `> manuel.gallego_` (5 toques abren el juego), navegación, descarga de CV (`assets/CV-Manuel-Gallego.pdf`), selector `ES/EN` y menú móvil a pantalla completa.
   - **01 / Sobre mí**: Historia profesional con resaltado markdown (`**`) y 3 contadores animados (`3+`, `50.000+`, `3`) activados por `IntersectionObserver`.
   - **02 / Experiencia**: Línea de tiempo interactiva (`LAFER`, `Ran Harvey`, `SafeTrip`, `UAM`, `AJ Creative Studios`) con indicador luminoso para cargos actuales y progresión de carrera.
   - **03 / Proyectos**: Carrusel infinito responsivo (`pv = 1 | 2 | 3` tarjetas según ancho de ventana), efecto 3D tilt (`perspective(900px)`), scroll automático de vista previa al hacer hover sobre la ventana del proyecto (`Ran Harvey`, `RetailHub`, `SafeTrip`, y terminal animada para `ARCA`), controles por puntos, flechas y swipe táctil.
   - **04 / Stack**: Panel sticky interactivo que filtra e ilumina en qué experiencias y proyectos se utilizó cada tecnología (`USES` y `PLACES`).
   - **05 / Educación**: Grid responsivo con los títulos universitarios y técnicos.
   - **06 / Recomendaciones**: Carrusel automático de referencias (`Álvaro Ramírez`, `Arturo Cabarcas`) con transición suave de desenfoque y desplazamiento.
   - **07 / Contacto**: Enlaces directos (Email con copiado y toast, WhatsApp, Teléfono con copiado, GitHub, LinkedIn, CV) y formulario `nuevo_mensaje`.

---

## 3. Nuevas Funcionalidades Full-Stack

### 3.1 Easter Egg (`snake.exe`) + Tabla de Clasificación Mundial Protegida (Anti-Cheat)
- **Activación**: Código Konami (`↑↑↓↓←→←→BA`) en teclado o tocar 5 veces el logo `> manuel.gallego`.
- **Flujo del Juego y Clasificación Mundial**:
  1. Al iniciar una partida, el frontend solicita una sesión firmada al backend (`POST /api/game/start`).
  2. El backend genera un `session_id` único, una semilla aleatoria (`seed`) para el generador pseudoaleatorio determinista (PRNG Mulberry32) que posiciona la comida, la marca de tiempo (`issued_at`) y una firma criptográfica **HMAC-SHA256**.
  3. Tanto el cliente como el servidor usan exactamente el mismo algoritmo PRNG alimentado por `seed` para colocar cada fruta en el tablero `20x20`.
  4. Durante la partida, el cliente registra cada cambio de dirección con el número exacto de tick (`{ t: tick, d: 'U'|'D'|'L'|'R' }`).
  5. Al terminar la partida (`game over`), si el puntaje es `> 0`, el jugador puede ingresar su `username` para guardar su puntuación en la **Tabla de Clasificación Mundial (Global Leaderboard)** integrada directamente en el modal de `snake.exe`.
  6. **Un nombre por jugador**: 3–20 caracteres `[A-Za-z0-9]` unidos por `.`, `_` o `-` simples; la unicidad se valida sobre una clave normalizada (minúsculas, sin separadores) con `UNIQUE` en la base. El primer jugador recibe un token secreto (en BD solo su SHA-256) y sin él el nombre responde `409`. Se guarda solo el mejor puntaje de cada nombre. Hay nombres reservados y un filtro básico de palabras ofensivas.
- **Protección Anti-Cheat en el Backend (`POST /api/game/submit`)**:
  - **Token de Sesión de Un Solo Uso**: Verifica la firma HMAC-SHA256 contra la sesión guardada y la consume con un `UPDATE ... WHERE is_used = false` atómico (evita replay attacks, también con peticiones concurrentes). Las sesiones caducan a las 3 horas.
  - **Validación Temporal (Wall-Clock Check)**: Comprueba que el tiempo real transcurrido en el servidor (`now - issued_at`) sea coherente con la cantidad de ticks jugados (mínimo `90 ms` por tick menos `1,5 s` de tolerancia de red), impidiendo que un bot simule una partida instantáneamente.
  - **Simulación Determinista Completa en el Servidor (Server-Side Replay Engine)**:
    - El backend reconstruye el tablero `20x20`, inicializa la serpiente en `[(9,10), (8,10), (7,10)]`, la comida inicial en `(14,10)` y la semilla `seed`.
    - Ejecuta paso a paso cada tick desde `0` hasta `total_ticks` aplicando los giros enviados en `moves`.
    - Verifica colisiones contra bordes o contra el propio cuerpo y calcula el puntaje real obtenido (`server_score`).
    - Si `server_score != claimed_score` o la partida es inválida, **rechaza la petición (`403 Forbidden`)** y registra el intento de manipulación en la tabla `security_audit_logs` para que sea visible en el panel de Admin. Al cliente solo se le devuelve un mensaje genérico.
  - **Rate limiting**: `start` 30/min, `submit` 10/min y contacto 5 cada 10 min por IP (más un tope global para contacto).

### 3.2 Perfil de Administrador Protegido (`/admin`)
- **Autenticación**:
  - Login mediante usuario y contraseña verificada con hash seguro (`bcrypt`) en `POST /api/admin/login`.
  - Verificación en tiempo constante (misma respuesta para usuario o contraseña incorrectos).
  - **JWT (HS256)** con `iss`/`aud`/`exp`/`jti` en cookie `HttpOnly` + `SameSite=Strict` + `Secure`; cabecera anti-CSRF `X-Requested-With: mg-admin` en las escrituras.
  - Fuerza bruta: 5 fallos por IP y 20 globales cada 15 minutos. La IP real solo se toma de `X-Forwarded-For` cuando la petición viene de un proxy interno.
- **Capacidades del Dashboard de Admin**:
  - **Métricas en Tiempo Real**: Total de partidas jugadas, récord mundial actual, intentos de trampa bloqueados por el motor Anti-Cheat y mensajes de contacto recibidos.
  - **Gestión del Leaderboard Mundial**: Tabla detallada con usuario, puntaje, ticks, duración de la partida, hash de verificación, fecha y botón para eliminar registros.
  - **Auditoría de Seguridad (Anti-Cheat & Auth Logs)**: Registro de intentos de modificación de puntaje rechazados, payloads sospechosos y logins fallidos.
  - **Bandeja de Mensajes de Contacto**: Visualización, marcado como leído y eliminación de mensajes enviados desde el formulario de contacto del portafolio.
  - **Configuración Visual en Vivo**: Permite cambiar la configuración global por defecto del portafolio (`accent`, `photoStyle`, `showBuddy`, `showGrid`, `showGlow`).

---

## 4. Estructura de Directorios
```text
portafolio/
├── README.md
├── context.md
├── task.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt / requirements-dev.txt
│   ├── tests/            (pytest: anti-cheat, nombres, admin, endpoints públicos, migración)
│   └── app/
│       ├── main.py       (arma la app: middlewares y routers)
│       ├── config.py     (variables de entorno; falla si faltan secretos)
│       ├── database.py
│       ├── db_init.py    (create_all + migración del ranking antiguo)
│       ├── models.py
│       ├── schemas.py
│       ├── auth.py       (login admin, JWT en cookie, CSRF)
│       ├── security.py   (IP del cliente, rate limiter, cabeceras)
│       ├── audit.py
│       ├── anticheat.py  (sesiones HMAC y replay determinista)
│       ├── usernames.py  (reglas de nombres del ranking)
│       └── routers/      (public.py, game.py, admin.py)
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.mjs   (proxy /api, CSP y cabeceras de seguridad)
    ├── tsconfig.json
    ├── public/assets/
    └── src/app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx
        ├── not-found.tsx
        ├── components/
        │   ├── PortfolioClient.tsx
        │   ├── portfolioData.ts
        │   ├── stickmanBuddy.ts
        │   └── snakeAntiCheat.ts
        └── admin/
            ├── layout.tsx (noindex)
            └── page.tsx
```
