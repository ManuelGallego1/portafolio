export const HI = "#FAFAFA";

const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatCurrentMonthYear = (
  lang: "es" | "en",
  now: Date = new Date()
): string => {
  const m =
    lang === "en" ? MONTHS_EN[now.getMonth()] : MONTHS_ES[now.getMonth()];
  return `${m} ${now.getFullYear()}`;
};

export const resolveJobDate = (
  dateStr: string,
  lang: "es" | "en",
  now: Date = new Date()
): string => {
  const currentLabel = formatCurrentMonthYear(lang, now);
  return dateStr.replace(/\b(Actualidad|Present)\b/g, currentLabel);
};

export const md = (str: string) =>
  str
    .split("**")
    .map((t, i) => ({ t, c: i % 2 ? HI : "inherit" }))
    .filter((s) => s.t);

export const STACK_A = [
  "Spring Boot (Modulith)",
  "Next.js",
  "PostgreSQL",
  "SSE",
  "Docker",
  "GitHub Actions",
];

export const T: Record<string, any> = {
  es: {
    nav: {
      about: "sobre mí",
      exp: "experiencia",
      projects: "proyectos",
      contact: "contacto",
    },
    hero: {
      status: "Disponible remoto · Manizales, Colombia",
      cta: "Ver proyectos",
      cv: "Descargar CV",
      hint: "pasa el cursor",
    },
    sec: {
      about: "sobre mí",
      exp: "experiencia",
      projects: "proyectos",
      edu: "educación",
      rec: "recomendaciones",
      contact: "contacto",
    },
    about: [
      "Empecé a programar de niño, sin saber muy bien qué estaba haciendo. Quería hacer mis propios videojuegos, así que me puse a ver tutoriales y a armar cosas en **Unity 2D**, primero con bloques y después escribiendo código. Lo que no entendía lo buscaba en foros, en la documentación o en el vigésimo video sobre el mismo tema. Nunca lo sentí como estudiar; simplemente me gustaba.",
      "Con el tiempo lo convertí en carrera: hice el técnico en programación, el técnico en sistemas, la tecnología en análisis y programación, y ahora estoy terminando **Ingeniería de Sistemas**.",
      "Hoy llevo **3+ años** haciendo software que corre en producción. He trabajado en un **ERP con microservicios y Kafka**, un **SaaS multi-tenant** y varias plataformas de seguros con **pagos en línea**; entre todas manejan **más de 50.000 asegurados**. Me importa que el código se entienda, que esté bien probado y que quien lo lea después no sufra. Y sigo aprendiendo algo nuevo casi cada semana.",
    ],
    stats: {
      a: "años en producción",
      b: "asegurados entre todas mis plataformas",
      c: "plataformas en vivo",
    },
    jobs: [
      {
        role: "Líder de Desarrollo de Software",
        date: "Jul 2026 — Actualidad",
        current: true,
        company: "LAFER Soluciones Masivas de Seguros · Cali, Colombia (remoto)",
        path: ["Semi Senior · Ene – Jun 2026", "Junior · Dic 2024 – Dic 2025"],
        bullets: [
          "Lidero técnicamente el área de desarrollo: **diseño de arquitectura**, planeación y priorización de proyectos, **revisión de código y mentoría**, en coordinación con las áreas de negocio.",
          "Diseño e implemento un **ERP a medida con microservicios orientados a eventos** (Spring Boot + Kafka) que centraliza la operación de la compañía.",
          "Mantengo y evoluciono el aplicativo Vida Grupo: **50+ usuarios internos** y **30.000 asegurados activos** en producción.",
        ],
      },
      {
        role: "Desarrollador Full Stack",
        date: "Ago 2026 — Actualidad",
        current: true,
        company: "Ran Harvey · Freelance (remoto)",
        bullets: [
          "Lideré el desarrollo inicial de la plataforma, participando en la **definición y construcción de su arquitectura** tecnológica.",
          "Diseñé y desarrollé los principales flujos funcionales y la **integración con la pasarela de pagos**, garantizando transacciones seguras y confiables.",
        ],
      },
      {
        role: "Desarrollador Full Stack",
        date: "Ago 2025 — Actualidad",
        current: true,
        company: "SafeTrip · Freelance (remoto)",
        bullets: [
          "Lideré el desarrollo inicial de la plataforma y la he mantenido **en operación por más de un año** con soporte, mantenimiento y mejora continua.",
          "Desarrollé nuevas funcionalidades según las necesidades del negocio, resolví **incidencias críticas** y optimicé el rendimiento para garantizar la disponibilidad.",
        ],
      },
      {
        role: "Monitor Académico",
        date: "Nov 2023 — Dic 2024",
        company: "Universidad Autónoma de Manizales",
        bullets: [
          "Dicté monitorías de POO, bases de datos y desarrollo web a grupos de **20+ estudiantes**, cubriendo clases de docentes titulares.",
        ],
      },
      {
        role: "Desarrollador Web",
        date: "Jun 2023 — Jul 2024",
        company: "AJ Creative Studios · Nueva York, EE. UU. (remoto)",
        bullets: [
          "Entregué **1–2 landing pages y e-commerce por semana**, todos con **PageSpeed 85+** y diseño responsivo.",
          "Construí un pipeline con IA que generaba y publicaba blogs a diario: **eliminó el 100% del trabajo manual** de publicación y mejoró el posicionamiento SEO.",
        ],
      },
    ],
    projectsTitle: "En producción.",
    projects: [
      {
        url: "https://ranharvey.com",
        host: "ranharvey.com",
        tag: "nuevo",
        name: "Ran Harvey",
        sub: "Seguros estudiantiles en línea",
        stack: STACK_A,
        bullets: [
          "Diseñé y construí de punta a punta una plataforma que **digitaliza la venta de seguros estudiantiles**, con un **monolito modular** listo para escalar y despliegue continuo.",
          "**Pagos en línea seguros** con webhooks idempotentes, **seguimiento en tiempo real** de pólizas, autenticación con **OTP y 2FA** y **auditoría completa** de cada operación.",
        ],
      },
      {
        url: "https://retailhub.nevdata.com.co",
        host: "retailhub.nevdata.com.co",
        tag: "saas",
        name: "RetailHub",
        sub: "SaaS de gestión de ventas",
        stack: [
          "Spring Boot",
          "Next.js",
          "PostgreSQL",
          "Docker",
          "GitHub Actions",
          "AWS EC2/RDS",
        ],
        bullets: [
          "Plataforma **multi-tenant** para franquicias de telecomunicaciones: ventas, metas comerciales y cuatro roles con permisos diferenciados.",
          "**Métricas en tiempo real con WebSockets** por sede y por producto, tendencias de KPIs, ranking de asesores y toda la información administrativa del negocio en un solo tablero; chat por canales y reportes en Excel y PDF.",
        ],
      },
      {
        url: "https://safetrip.com.co",
        host: "safetrip.com.co",
        tag: "pagos",
        name: "Safetrip",
        sub: "Seguros de viaje",
        stack: STACK_A,
        bullets: [
          "Plataforma con **pasarela de pago** e integración con APIs de aseguradoras nacionales, procesando transacciones reales.",
          "Superó **pruebas de penetración** de un equipo de hackers éticos; corregí vulnerabilidades de JWT, OAuth2 y OWASP Top 10.",
        ],
      },
      {
        url: "#proyectos",
        target: "_self",
        host: "arca",
        tag: "en construcción",
        name: "ARCA",
        sub: "CRM para aseguradoras",
        soon: true,
        stack: [],
        bullets: [
          "Un CRM pensado para aseguradoras. Muy pronto más detalles.",
        ],
      },
    ],
    skillNames: [
      "Backend",
      "Frontend",
      "DevOps y nube",
      "Datos y seguridad",
      "IA aplicada",
      "Otros",
    ],
    skillAi: [
      "Asistentes de código",
      "Agentes de IA",
      "Automatización de flujos",
      "Prompt engineering",
      "Integración de LLMs vía API",
      "Revisión y pruebas de código generado",
    ],
    skillAiDesc:
      "Uso la IA para multiplicar mi productividad con criterio: la integro en todo el ciclo de desarrollo y valido cada resultado con revisión, pruebas y buenas prácticas de seguridad.",
    skillExtra: [
      "Liderazgo técnico",
      "Mentoría",
      "SEO técnico",
      "Scrum",
      "Kanban",
    ],
    edu: [
      {
        title: "Ingeniería de Sistemas",
        note: "(por terminar)",
        place: "Universidad Autónoma de Manizales · Ago 2024 – Actualidad",
      },
      {
        title: "Tecnología en Análisis y Programación de Computadores",
        note: "",
        place: "Universidad Autónoma de Manizales · Feb 2023 – Mar 2024",
      },
      {
        title: "Técnico Profesional en Programación",
        note: "",
        place: "Universidad Autónoma de Manizales · Jul 2021 – Dic 2022",
      },
      {
        title: "Técnico Laboral Auxiliar en Sistemas Informáticos",
        note: "",
        place: "Universidad Autónoma de Manizales · Jul 2021 – Dic 2022",
      },
      {
        title: "Curso de Inglés Comunicativo",
        note: "",
        place: "Universidad Católica de Manizales · Mar – Nov 2022",
      },
    ],
    quote:
      "Trabajé con Alejandro en el área de SEO, él se desempeñaba como SEO técnico. En este puesto destacó por su rápida asimilación de conceptos y habilidad para optimizar la velocidad de sitios web. Su capacidad para automatizar tareas con IA fue excepcional, creando soluciones funcionales y estéticamente sólidas.\n\nAlejandro es rápido en la implementación, busca activamente retroalimentación y tiene buen ojo para los detalles. Su personalidad colaborativa y habilidades investigativas lo hacen invaluable en cualquier equipo. Recomiendo a Alejandro para roles que requieran tanto habilidades técnicas como buenas aptitudes interpersonales.",
    quoteBy:
      "Arturo Cabarcas · Especialista en SEO | Estrategias de SEO Local y Google Business Profile · Supervisor directo · 8 de julio de 2024",
    quotes: [
      {
        text: "El pelado es un crack, y lo digo sin exagerar. Es una persona brillante, muy comprometida y con una capacidad increíble para desarrollar soluciones. Pero lo que más valoro de él es que no se limita a hacer lo que le piden: entiende el negocio, analiza las necesidades y propone alternativas que realmente aportan valor.\n\nTener a alguien que no solo sabe tanto de desarrollo, sino que también tiene esa visión de negocio y esa iniciativa para proponer mejores caminos, es un privilegio.\n\nY más allá de lo profesional, es un gran amigo y una excelente persona. Sin duda, alguien con quien da gusto trabajar y que recomendaría con los ojos cerrados.",
        by: "Álvaro José Ramírez Correa · Director Operativo | Transformación Digital · IA Aplicada · Automatización · LAFER · 16 de octubre de 2026",
      },
      {
        text: "Trabajé con Alejandro en el área de SEO, él se desempeñaba como SEO técnico. En este puesto destacó por su rápida asimilación de conceptos y habilidad para optimizar la velocidad de sitios web. Su capacidad para automatizar tareas con IA fue excepcional, creando soluciones funcionales y estéticamente sólidas.\n\nAlejandro es rápido en la implementación, busca activamente retroalimentación y tiene buen ojo para los detalles. Su personalidad colaborativa y habilidades investigativas lo hacen invaluable en cualquier equipo. Recomiendo a Alejandro para roles que requieran tanto habilidades técnicas como buenas aptitudes interpersonales.",
        by: "Arturo Cabarcas · Especialista en SEO | Estrategias de SEO Local y Google Business Profile · Supervisor directo · 8 de julio de 2024",
      },
    ],
    contactTitle: "Hablemos",
    ui: {
      copyPhone: "Copiar número",
      phoneCopied: "Número copiado",
      skHint: "Haz clic en una tecnología para ver dónde la usé",
      skAll: "Uso transversal en mi día a día",
      skClear: "limpiar",
      gameHint:
        "Flechas / WASD o desliza para moverte · espacio para reiniciar · esc para salir",
      copy: "Copiar email",
      copied: "Email copiado",
      formTitle: "nuevo_mensaje",
      name: "Nombre",
      email: "Email",
      msg: "Mensaje",
      msgPh: "Cuéntame sobre tu proyecto o la vacante…",
      send: "Enviar",
      sent: "Mensaje guardado y abriendo tu cliente de correo",
      top: "Volver arriba",
      stack: "stack",
    },
  },
  en: {
    nav: {
      about: "about",
      exp: "experience",
      projects: "projects",
      contact: "contact",
    },
    hero: {
      status: "Available remote · Manizales, Colombia",
      cta: "View projects",
      cv: "Download CV",
      hint: "hover me",
    },
    sec: {
      about: "about",
      exp: "experience",
      projects: "projects",
      edu: "education",
      rec: "recommendations",
      contact: "contact",
    },
    about: [
      "I started coding as a kid without really knowing what I was doing. I wanted to make my own video games, so I watched tutorials and built things in **Unity 2D**, first with visual blocks and then with actual code. Whatever I didn't get, I looked up on forums, in the docs or in the twentieth video on the same topic. It never felt like studying; I just liked it.",
      "Over time it turned into a career: a technical degree in programming, a certificate in computer systems, a technology degree in computer analysis and programming, and now I'm finishing **Systems Engineering**.",
      "Today I have **3+ years** building software that runs in production. I've worked on an **ERP with microservices and Kafka**, a **multi-tenant SaaS** and several insurance platforms with **online payments**; together they handle **over 50,000 policyholders**. I care about code that's easy to read, well tested and doesn't make the next person suffer. And I still learn something new almost every week.",
    ],
    stats: {
      a: "years in production",
      b: "policyholders across my platforms",
      c: "live platforms",
    },
    jobs: [
      {
        role: "Software Development Lead",
        date: "Jul 2026 — Present",
        current: true,
        company: "LAFER Soluciones Masivas de Seguros · Cali, Colombia (remote)",
        path: ["Semi Senior · Jan – Jun 2026", "Junior · Dec 2024 – Dec 2025"],
        bullets: [
          "I lead the development team technically: **software architecture**, project planning and prioritization, **code review and mentoring**, in coordination with business areas.",
          "I design and build a **custom event-driven microservices ERP** (Spring Boot + Kafka) that centralizes the company's operations.",
          "I maintain and evolve the Vida Grupo application: **50+ internal users** and **30,000 active policyholders** in production.",
        ],
      },
      {
        role: "Full Stack Developer",
        date: "Aug 2026 — Present",
        current: true,
        company: "Ran Harvey · Freelance (remote)",
        bullets: [
          "Led the initial development of the platform, taking part in **defining and building its technical architecture**.",
          "Designed and built the core functional flows and the **payment gateway integration**, ensuring secure and reliable transactions.",
        ],
      },
      {
        role: "Full Stack Developer",
        date: "Aug 2025 — Present",
        current: true,
        company: "SafeTrip · Freelance (remote)",
        bullets: [
          "Led the initial development of the platform and have kept it **running for over a year** through support, maintenance and continuous improvement.",
          "Built new features driven by business needs, resolved **critical incidents** and optimized performance to keep the system available.",
        ],
      },
      {
        role: "Teaching Assistant",
        date: "Nov 2023 — Dec 2024",
        company: "Universidad Autónoma de Manizales",
        bullets: [
          "Led tutoring sessions on OOP, databases and web development for groups of **20+ students**, covering classes for lead instructors.",
        ],
      },
      {
        role: "Web Developer",
        date: "Jun 2023 — Jul 2024",
        company: "AJ Creative Studios · New York, USA (remote)",
        bullets: [
          "Delivered **1–2 landing pages and e-commerce sites per week**, all with **PageSpeed 85+** and responsive design.",
          "Built an AI pipeline that generated and published blog posts daily: it **removed 100% of the manual publishing work** and improved SEO rankings.",
        ],
      },
    ],
    projectsTitle: "In production.",
    projects: [
      {
        url: "https://ranharvey.com",
        host: "ranharvey.com",
        tag: "new",
        name: "Ran Harvey",
        sub: "Online student insurance",
        stack: STACK_A,
        bullets: [
          "Designed and built end to end a platform that **digitizes student insurance sales**, on a **modular monolith** ready to scale with continuous deployment.",
          "**Secure online payments** with idempotent webhooks, **real-time policy tracking**, **OTP and 2FA** authentication and a **full audit trail** of every operation.",
        ],
      },
      {
        url: "https://retailhub.nevdata.com.co",
        host: "retailhub.nevdata.com.co",
        tag: "saas",
        name: "RetailHub",
        sub: "Sales management SaaS",
        stack: [
          "Spring Boot",
          "Next.js",
          "PostgreSQL",
          "Docker",
          "GitHub Actions",
          "AWS EC2/RDS",
        ],
        bullets: [
          "**Multi-tenant** platform for telecom franchises: sales, commercial targets and four roles with distinct permissions.",
          "**Real-time metrics over WebSockets** by branch and product, KPI trends, advisor rankings and all of the business's admin data in a single dashboard; channel chat and Excel/PDF reports.",
        ],
      },
      {
        url: "https://safetrip.com.co",
        host: "safetrip.com.co",
        tag: "payments",
        name: "Safetrip",
        sub: "Travel insurance",
        stack: STACK_A,
        bullets: [
          "Platform with a **payment gateway** and integration with national insurers' APIs, processing real transactions.",
          "Passed **penetration testing** by a team of ethical hackers; I fixed JWT, OAuth2 and OWASP Top 10 vulnerabilities.",
        ],
      },
      {
        url: "#proyectos",
        target: "_self",
        host: "arca",
        tag: "in progress",
        name: "ARCA",
        sub: "CRM for insurers",
        soon: true,
        stack: [],
        bullets: ["A CRM built for insurance companies. More details very soon."],
      },
    ],
    skillNames: [
      "Backend",
      "Frontend",
      "DevOps & cloud",
      "Data & security",
      "Applied AI",
      "Other",
    ],
    skillAi: [
      "Coding assistants",
      "AI agents",
      "Workflow automation",
      "Prompt engineering",
      "LLM API integration",
      "Review & testing of generated code",
    ],
    skillAiDesc:
      "I use AI to multiply my productivity with judgment: I bring it into the whole development cycle and validate every result through review, testing and security best practices.",
    skillExtra: [
      "Technical leadership",
      "Mentoring",
      "Technical SEO",
      "Scrum",
      "Kanban",
    ],
    edu: [
      {
        title: "Systems Engineering",
        note: "(in progress)",
        place: "Universidad Autónoma de Manizales · Aug 2024 – Present",
      },
      {
        title: "Technology Degree in Computer Analysis and Programming",
        note: "",
        place: "Universidad Autónoma de Manizales · Feb 2023 – Mar 2024",
      },
      {
        title: "Professional Technical Degree in Programming",
        note: "",
        place: "Universidad Autónoma de Manizales · Jul 2021 – Dec 2022",
      },
      {
        title: "Technical Certificate in Computer Systems Support",
        note: "",
        place: "Universidad Autónoma de Manizales · Jul 2021 – Dec 2022",
      },
      {
        title: "Communicative English Course",
        note: "",
        place: "Universidad Católica de Manizales · Mar – Nov 2022",
      },
    ],
    quote:
      "I worked with Alejandro in the SEO department, where he served as Technical SEO. In this role, he stood out for his quick grasp of concepts and ability to optimize website speed. His ability to automate tasks with AI was exceptional, creating functional and aesthetically solid solutions.\n\nAlejandro is fast in implementation, actively seeks feedback, and has a great eye for detail. His collaborative personality and research skills make him invaluable on any team. I recommend Alejandro for roles that require both technical skills and strong interpersonal abilities.",
    quoteBy:
      "Arturo Cabarcas · SEO Specialist | Local SEO & Google Business Profile Strategies · Direct supervisor · July 8, 2024",
    quotes: [
      {
        text: "He's an absolute ace, and I say that without exaggeration. He is a brilliant, deeply committed person with an incredible ability to build solutions. But what I value most about him is that he doesn't just do what he's asked: he understands the business, analyzes the needs, and proposes alternatives that truly add value.\n\nHaving someone who not only knows so much about software development, but also has that business vision and initiative to propose better paths, is a privilege.\n\nAnd beyond the professional side, he is a great friend and an excellent person. Without a doubt, someone who is a pleasure to work with and whom I would recommend with my eyes closed.",
        by: "Álvaro José Ramírez Correa · Operations Director | Digital Transformation · Applied AI · Automation · LAFER · October 16, 2026",
      },
      {
        text: "I worked with Alejandro in the SEO department, where he served as Technical SEO. In this role, he stood out for his quick grasp of concepts and ability to optimize website speed. His ability to automate tasks with AI was exceptional, creating functional and aesthetically solid solutions.\n\nAlejandro is fast in implementation, actively seeks feedback, and has a great eye for detail. His collaborative personality and research skills make him invaluable on any team. I recommend Alejandro for roles that require both technical skills and strong interpersonal abilities.",
        by: "Arturo Cabarcas · SEO Specialist | Local SEO & Google Business Profile Strategies · Direct supervisor · July 8, 2024",
      },
    ],
    contactTitle: "Let's talk",
    ui: {
      copyPhone: "Copy number",
      phoneCopied: "Number copied",
      skHint: "Click a technology to see where I used it",
      skAll: "Used across my day-to-day work",
      skClear: "clear",
      gameHint:
        "Arrows / WASD or swipe to move · space to restart · esc to exit",
      copy: "Copy email",
      copied: "Email copied",
      formTitle: "new_message",
      name: "Name",
      email: "Email",
      msg: "Message",
      msgPh: "Tell me about your project or the role…",
      send: "Send",
      sent: "Message saved and opening your email client",
      top: "Back to top",
      stack: "stack",
    },
  },
};

export const ALL3 = ["ranharvey", "retailhub", "safetrip"];

export const USES: Record<string, string[]> = {
  Java: ["lafer", ...ALL3, "monitor"],
  "Spring Boot": ["lafer", ...ALL3],
  "Spring Security": ["ranharvey", "safetrip"],
  "JPA/Hibernate": ["lafer", ...ALL3],
  "REST APIs": ["lafer", ...ALL3],
  WebSockets: ["retailhub"],
  Kafka: ["lafer"],
  Microservicios: ["lafer", "safetrip"],
  "Next.js": ALL3,
  React: ALL3,
  TypeScript: ALL3,
  "Tailwind CSS": ALL3,
  AngularJS: ["lafer"],
  Docker: ALL3,
  "GitHub Actions (CI/CD)": ALL3,
  "AWS (EC2, RDS)": ["retailhub"],
  "Git / GitFlow": ["lafer", ...ALL3],
  PostgreSQL: ALL3,
  MySQL: ["monitor"],
  JWT: ["ranharvey", "safetrip"],
  OAuth2: ["safetrip"],
  OWASP: ["safetrip"],
  SOLID: ["lafer", "monitor"],
  GRASP: ["monitor"],
  "Automatización de flujos": ["lafer", "aj"],
  "Integración de LLMs vía API": ["aj"],
  "Liderazgo técnico": ["lafer", "ranharvey", "safetrip"],
  Mentoría: ["lafer", "monitor"],
  "SEO técnico": ["aj"],
  Scrum: ["lafer"],
};

export const PLACES: Record<string, { name: string; href: string }> = {
  lafer: { name: "LAFER", href: "#j-lafer" },
  ranharvey: { name: "Ran Harvey", href: "#p-ranharvey" },
  retailhub: { name: "RetailHub", href: "#p-retailhub" },
  safetrip: { name: "SafeTrip", href: "#p-safetrip" },
  monitor: { name: "UAM", href: "#j-monitor" },
  aj: { name: "AJ Creative Studios", href: "#j-aj" },
};

export const SHOTS: Record<string, { f: string; dur: number }> = {
  ranharvey: { f: "/assets/preview-ranharvey.jpg", dur: 6.5 },
  retailhub: { f: "/assets/preview-retailhub.jpg", dur: 3 },
  safetrip: { f: "/assets/preview-safetrip.jpg", dur: 5 },
};

export const SUMMARY: Record<string, Record<string, string>> = {
  es: {
    ranharvey:
      "Plataforma para comprar **seguros estudiantiles en línea**. La diseñé y construí de punta a punta: pagos seguros, seguimiento de pólizas en tiempo real, verificación por OTP y auditoría de cada operación.",
    retailhub:
      "**SaaS multi-tenant** para franquicias de telecomunicaciones. Reúne ventas, metas y equipos en un solo tablero, con métricas en tiempo real por sede, ranking de asesores, chat interno y reportes.",
    safetrip:
      "Plataforma de **seguros de viaje** conectada con aseguradoras nacionales y con pagos reales. La lideré desde el inicio, la mantengo hace más de un año y pasó pruebas de penetración de hackers éticos.",
  },
  en: {
    ranharvey:
      "Platform to buy **student insurance online**. I designed and built it end to end: secure payments, real-time policy tracking, OTP verification and an audit trail for every operation.",
    retailhub:
      "**Multi-tenant SaaS** for telecom franchises. It brings sales, targets and teams into one dashboard, with real-time metrics per branch, advisor rankings, internal chat and reports.",
    safetrip:
      "**Travel insurance** platform connected to national insurers and processing real payments. I led it from day one, have maintained it for over a year, and it passed penetration testing by ethical hackers.",
  },
};

export const JOB_KEYS = ["lafer", "ranharvey", "safetrip", "monitor", "aj"];
export const PROJ_KEYS = ["ranharvey", "retailhub", "safetrip", "arca"];
export const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export const SKILLS = [
  [
    "Java",
    "Spring Boot",
    "Spring Security",
    "JPA/Hibernate",
    "REST APIs",
    "WebSockets",
    "Kafka",
    "Microservicios",
  ],
  ["Next.js", "React", "TypeScript", "Tailwind CSS", "AngularJS"],
  ["Docker", "GitHub Actions (CI/CD)", "AWS (EC2, RDS)", "Git / GitFlow"],
  ["PostgreSQL", "MySQL", "JWT", "OAuth2", "OWASP", "SOLID", "GRASP"],
];

