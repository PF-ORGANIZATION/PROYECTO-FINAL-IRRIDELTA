import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { env, pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const supabaseBin = path.join(projectRoot, "node_modules", ".bin", "supabase");
const adminEnvFile = ".env.admin.local";

for (const envFile of [".env", adminEnvFile]) {
  const envPath = path.join(projectRoot, envFile);

  if (fs.existsSync(envPath)) {
    config({ path: envPath, override: true, quiet: true });
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    console.error(`Falta ${name}. Guardalo en ${adminEnvFile} antes de ejecutar seed:demo.`);
    process.exit(1);
  }

  return value;
}

const DEMO_PASSWORD = requiredEnv("DEMO_USER_PASSWORD");
const pdfPath = path.resolve(projectRoot, requiredEnv("DEMO_MANUAL_PDF"));
const PDF_FILE_NAME = path.basename(pdfPath);

const kbStoragePath = `demo/${PDF_FILE_NAME}`;
const learningStoragePath = `demo/${PDF_FILE_NAME}`;
const targetProjectRef = requiredEnv("SUPABASE_PROJECT_REF");
const targetUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
const publicManualUrl = `${targetUrl}/storage/v1/object/public/formacion-archivos/${learningStoragePath}`;

const users = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    email: "lucia.benitez@demo.irridelta.com",
    fullName: "Lucia Benitez",
    role: "admin",
    company: "Irridelta - Operaciones",
    phone: "+54 11 5220 1842",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "martin.rios@demo.irridelta.com",
    fullName: "Martin Rios",
    role: "cliente",
    company: "Verde Norte Paisajismo",
    phone: "+54 11 6073 4189",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    email: "camila.navarro@demo.irridelta.com",
    fullName: "Camila Navarro",
    role: "cliente",
    company: "Vivero Los Ceibos",
    phone: "+54 11 6841 2576",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    email: "nicolas.pereyra@demo.irridelta.com",
    fullName: "Nicolas Pereyra",
    role: "cliente",
    company: "Administracion Las Cortaderas",
    phone: "+54 11 5962 7031",
  },
];

const categories = [
  [101, "Riego residencial"],
  [102, "Riego agricola"],
  [103, "Bombas y presurizacion"],
  [104, "Piscinas y tratamiento de agua"],
  [105, "Jardineria y mantenimiento"],
];

const products = [
  [1001, "Controlador Hunter X2 8 estaciones", "Programador modular para riego residencial y espacios verdes medianos. Permite programacion por zonas, ciclos independientes y actualizacion WiFi con modulo WAND.", "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80", 101],
  [1002, "Electrovalvula Rain Bird DV 1 pulgada 24VAC", "Valvula de diafragma para automatizacion de sectores de riego. Cuerpo reforzado, purga manual y solenoide de bajo consumo.", "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80", 101],
  [1003, "Aspersor rotor Hunter PGP Ultra", "Rotor regulable para cesped y parques. Alcance aproximado de 6 a 14 metros segun boquilla y presion de trabajo.", "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=900&q=80", 101],
  [1004, "Tobera MP Rotator 2000 90-210", "Tobera multichorro de alta uniformidad para reducir escorrentia y mejorar la eficiencia de aplicacion.", "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=900&q=80", 101],
  [1005, "Kit de riego por goteo para huerta 100 m", "Kit completo con cinta, conectores, filtro y accesorios para huertas familiares, canteros y viveros.", "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80", 102],
  [1006, "Manguera Layflat 2 pulgadas reforzada", "Manguera plana para conduccion temporal de agua en quintas, viveros y aplicaciones agricolas.", "https://images.unsplash.com/photo-1599685315640-cc74d7d9de1d?auto=format&fit=crop&w=900&q=80", 102],
  [1007, "Filtro de anillas 120 mesh 1 pulgada", "Filtro compacto para proteger goteros, microaspersores y valvulas en instalaciones con particulas finas.", "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80", 102],
  [1008, "Bomba centrifuga Pedrollo CPm 158", "Bomba monofasica para presurizacion de riego y abastecimiento domiciliario con caudal estable.", "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80", 103],
  [1009, "Bomba sumergible Espa Acuaria 07", "Equipo multietapa para perforaciones y cisternas, recomendado para alimentar sistemas de riego con presion constante.", "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=900&q=80", 103],
  [1010, "Presostato electronico Presscontrol 1.5 HP", "Control automatico de arranque y parada para bombas de superficie con proteccion por falta de agua.", "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80", 103],
  [1011, "Filtro de arena Vulcano VC-50", "Filtro para piscinas residenciales con valvula selectora, cama filtrante de arena y mantenimiento simple.", "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=900&q=80", 104],
  [1012, "Bomba piscina Vulcano BAP 100", "Bomba autocebante para recirculacion y filtrado de piscinas familiares de uso intensivo.", "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=900&q=80", 104],
  [1013, "Ablandador automatico Clack 25 L", "Sistema de intercambio ionico para reducir dureza y proteger bombas, calderas y circuitos sanitarios.", "https://images.unsplash.com/photo-1581093458791-9d15482442f6?auto=format&fit=crop&w=900&q=80", 104],
  [1014, "Programador Galcon 9001 para grifo", "Temporizador autonomo a bateria para balcones, patios y riego por goteo sin tablero electrico.", "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=900&q=80", 105],
];

function question(id, enunciado, opciones, respuestaCorrecta) {
  return {
    id,
    tipo: "multiple_choice",
    enunciado,
    opciones,
    respuesta_correcta: respuestaCorrecta,
  };
}

function trueFalse(id, enunciado, respuestaCorrecta) {
  return {
    id,
    tipo: "true_false",
    enunciado,
    opciones: ["Verdadero", "Falso"],
    respuesta_correcta: respuestaCorrecta,
  };
}

const trainings = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    title: "Operacion y mantenimiento de sistemas de riego residencial",
    description:
      "Capacitacion practica para diagnosticar, operar y mantener instalaciones automatizadas en jardines, barrios cerrados y espacios verdes.",
    published: true,
    modules: [
      {
        id: "21000000-0000-4000-8000-000000000001",
        title: "Componentes de una instalacion residencial",
        description:
          "Reconocimiento de programadores, valvulas, sectores, emisores, filtros y puntos de control antes de intervenir una instalacion.",
        order: 1,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000001",
            type: "archivo",
            title: "Manual tecnico de operaciones de riego",
            order: 1,
            fileName: PDF_FILE_NAME,
            filePath: learningStoragePath,
            fileUrl: publicManualUrl,
            extension: "pdf",
          },
        ],
        questions: [
          question("res-1-q1", "Que elemento permite dividir una instalacion en sectores independientes?", ["Filtro de arena", "Electrovalvula", "Manometro de piscina", "Ablandador"], 1),
          trueFalse("res-1-q2", "Antes de regular aspersores conviene verificar presion disponible y limpieza de filtros.", 0),
        ],
      },
      {
        id: "21000000-0000-4000-8000-000000000002",
        title: "Rutina de mantenimiento preventivo",
        description:
          "Checklist de limpieza, prueba de sectores, observacion de cobertura y ajustes de temporada para reducir fallas recurrentes.",
        order: 2,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000002",
            type: "youtube",
            title: "Revision visual de sectores y emisores",
            order: 1,
            youtubeUrl: "https://www.youtube.com/watch?v=9Vmwsg8Eabo",
          },
        ],
        questions: [
          question("res-2-q1", "Cual es una senal frecuente de filtro obstruido?", ["Aumento sostenido de caudal", "Baja de presion aguas abajo", "Mayor alcance de rotores", "Menor consumo electrico siempre"], 1),
          trueFalse("res-2-q2", "Una boquilla parcialmente tapada puede generar zonas secas aunque el programador funcione correctamente.", 0),
        ],
      },
      {
        id: "21000000-0000-4000-8000-000000000003",
        title: "Diagnostico de fallas frecuentes",
        description:
          "Metodologia para diferenciar problemas electricos, hidraulicos y de configuracion en sistemas automatizados.",
        order: 3,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000003",
            type: "youtube",
            title: "Diagnostico de baja presion en riego",
            order: 1,
            youtubeUrl: "https://www.youtube.com/watch?v=1kUE0BZtTRc",
          },
        ],
        questions: [
          question("res-3-q1", "Si una zona no abre, que conviene verificar primero?", ["Color del cesped", "Alimentacion del solenoide y apertura manual", "Temperatura ambiente", "Marca del aspersor"], 1),
          trueFalse("res-3-q2", "Una fuga en una linea secundaria puede simular falta de presion en todo el sector.", 0),
        ],
      },
    ],
    certification: {
      id: "23000000-0000-4000-8000-000000000001",
      title: "Certificacion en mantenimiento de riego residencial",
      description:
        "Acredita criterios basicos para operar, revisar y mantener sistemas residenciales de riego automatizado.",
      passingScore: 75,
      duration: 35,
      questionCount: 4,
      questions: [
        question("cert-res-q1", "Que dato es mas importante para seleccionar una boquilla?", ["Color del controlador", "Presion y caudal disponibles", "Cantidad de luces del tablero", "Marca del jardinero"], 1),
        question("cert-res-q2", "Que accion reduce riesgo de obturacion en goteo?", ["Instalar filtrado adecuado", "Aumentar siempre la duracion", "Eliminar todas las valvulas", "Usar solo manguera cristal"], 0),
        trueFalse("cert-res-q3", "El mantenimiento preventivo debe incluir prueba de cobertura y revision de fugas.", 0),
        trueFalse("cert-res-q4", "Todos los sectores deben tener exactamente el mismo tiempo de riego sin importar emisores o asoleamiento.", 1),
      ],
    },
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    title: "Diseno basico de riego por goteo para espacios verdes",
    description:
      "Fundamentos de sectorizacion, filtrado, presion y seleccion de emisores para canteros, huertas y pequenas superficies productivas.",
    published: true,
    modules: [
      {
        id: "21000000-0000-4000-8000-000000000004",
        title: "Necesidad hidrica y sectorizacion",
        description:
          "Como agrupar plantas por requerimiento de agua, exposicion solar y tipo de suelo para evitar exceso o deficit de riego.",
        order: 1,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000004",
            type: "archivo",
            title: "Manual tecnico: suelo, capacidad de campo y PMP",
            order: 1,
            fileName: PDF_FILE_NAME,
            filePath: learningStoragePath,
            fileUrl: publicManualUrl,
            extension: "pdf",
          },
        ],
        questions: [
          question("got-1-q1", "Que criterio ayuda a separar sectores de goteo?", ["Color de las macetas", "Tipo de planta y exposicion solar", "Altura del programador", "Marca del filtro"], 1),
          trueFalse("got-1-q2", "Suelos arenosos suelen requerir pulsos mas frecuentes que suelos pesados.", 0),
        ],
      },
      {
        id: "21000000-0000-4000-8000-000000000005",
        title: "Filtrado, presion y emisores",
        description:
          "Seleccion de filtros, reguladores y goteros segun calidad de agua, longitud de lineas y caudal requerido.",
        order: 2,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000005",
            type: "youtube",
            title: "Armado de cabecera de riego por goteo",
            order: 1,
            youtubeUrl: "https://www.youtube.com/watch?v=GJ5rDgmQ7o4",
          },
        ],
        questions: [
          question("got-2-q1", "Que componente protege goteros frente a particulas?", ["Filtro", "Control remoto", "Boquilla VAN", "Clorador"], 0),
          question("got-2-q2", "Que problema puede generar presion excesiva en cinta de goteo?", ["Mejor uniformidad siempre", "Roturas o caudales fuera de especificacion", "Menos necesidad de filtro", "Cierre automatico de la valvula"], 1),
        ],
      },
    ],
    certification: {
      id: "23000000-0000-4000-8000-000000000002",
      title: "Certificacion en riego por goteo aplicado",
      description:
        "Evalua criterios de diseno y seleccion de componentes para instalaciones de goteo de baja y media escala.",
      passingScore: 70,
      duration: 30,
      questionCount: 4,
      questions: [
        question("cert-got-q1", "Que variable influye en la frecuencia de riego?", ["Tipo de suelo", "Color del tablero", "Altura del alambrado", "Cantidad de herramientas"], 0),
        question("cert-got-q2", "Para lineas largas de goteo conviene revisar principalmente:", ["Perdida de carga y uniformidad", "Color de la cinta", "Marca del cantero", "Tipo de enchufe"], 0),
        trueFalse("cert-got-q3", "El filtrado es parte critica de una instalacion de goteo.", 0),
        trueFalse("cert-got-q4", "La sectorizacion no tiene relacion con exposicion solar ni requerimiento de las plantas.", 1),
      ],
    },
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    title: "Bombas centrifugas y presurizacion para instalaciones de riego",
    description:
      "Curso orientado a seleccionar, operar y proteger bombas de superficie o sumergibles usadas en riego y abastecimiento.",
    published: true,
    modules: [
      {
        id: "21000000-0000-4000-8000-000000000006",
        title: "Lectura de curva y punto de trabajo",
        description:
          "Interpretacion de caudal, altura manometrica y perdidas para evitar equipos sobredimensionados o insuficientes.",
        order: 1,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000006",
            type: "youtube",
            title: "Conceptos de caudal y altura manometrica",
            order: 1,
            youtubeUrl: "https://www.youtube.com/watch?v=4V2Oe4F5KjU",
          },
        ],
        questions: [
          question("bom-1-q1", "Que relacion muestra una curva de bomba?", ["Caudal y altura", "Color y peso", "Precio y marca", "Temperatura y humedad"], 0),
          trueFalse("bom-1-q2", "El punto de trabajo depende tambien de las perdidas de carga de la instalacion.", 0),
        ],
      },
      {
        id: "21000000-0000-4000-8000-000000000007",
        title: "Protecciones y puesta en marcha",
        description:
          "Uso de presostatos, proteccion por falta de agua, cebado, valvulas de retencion y controles de seguridad.",
        order: 2,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000007",
            type: "archivo",
            title: "Guia de chequeo previa a puesta en marcha",
            order: 1,
            fileName: PDF_FILE_NAME,
            filePath: learningStoragePath,
            fileUrl: publicManualUrl,
            extension: "pdf",
          },
        ],
        questions: [
          question("bom-2-q1", "Que protege a la bomba ante ausencia de agua?", ["Proteccion por marcha en seco", "Boquilla regulable", "Filtro UV", "Malla sombra"], 0),
          trueFalse("bom-2-q2", "Una bomba de superficie puede danarse si trabaja sin cebado adecuado.", 0),
        ],
      },
    ],
    certification: {
      id: "23000000-0000-4000-8000-000000000003",
      title: "Certificacion en bombas para riego",
      description:
        "Certifica nociones basicas de seleccion, proteccion y operacion segura de bombas aplicadas a riego.",
      passingScore: 75,
      duration: 40,
      questionCount: 4,
      questions: [
        question("cert-bom-q1", "Que dato se cruza con el caudal para elegir bomba?", ["Altura manometrica", "Color del tanque", "Tipo de cesped", "Cantidad de usuarios web"], 0),
        question("cert-bom-q2", "Que componente ayuda a automatizar arranque y parada?", ["Presostato o presscontrol", "Aspersor emergente", "Ablandador de resina", "Tobera fija"], 0),
        trueFalse("cert-bom-q3", "La proteccion por falta de agua reduce riesgo de dano por marcha en seco.", 0),
        trueFalse("cert-bom-q4", "Las perdidas de carga no afectan el punto de trabajo de la bomba.", 1),
      ],
    },
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    title: "Tratamiento de agua y mantenimiento de piscinas",
    description:
      "Conceptos operativos de filtrado, recirculacion y control basico de agua para piscinas residenciales y comerciales pequenas.",
    published: true,
    modules: [
      {
        id: "21000000-0000-4000-8000-000000000008",
        title: "Filtracion y recirculacion",
        description:
          "Funcion del filtro, bomba, valvula selectora y tiempos de recirculacion segun uso y condiciones ambientales.",
        order: 1,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000008",
            type: "youtube",
            title: "Mantenimiento de filtro y bomba de piscina",
            order: 1,
            youtubeUrl: "https://www.youtube.com/watch?v=Vmg-0XU3Avc",
          },
        ],
        questions: [
          question("pis-1-q1", "Que equipo retiene particulas durante la recirculacion?", ["Filtro", "Electrovalvula de riego", "Goteros", "Sensor de lluvia"], 0),
          trueFalse("pis-1-q2", "La limpieza del canasto de bomba ayuda a mantener caudal de recirculacion.", 0),
        ],
      },
      {
        id: "21000000-0000-4000-8000-000000000009",
        title: "Agua dura y tratamiento domiciliario",
        description:
          "Identificacion de dureza, incrustaciones y uso de ablandadores para proteger instalaciones y equipos.",
        order: 2,
        resources: [
          {
            id: "22000000-0000-4000-8000-000000000009",
            type: "archivo",
            title: "Referencia tecnica sobre calidad de agua",
            order: 1,
            fileName: PDF_FILE_NAME,
            filePath: learningStoragePath,
            fileUrl: publicManualUrl,
            extension: "pdf",
          },
        ],
        questions: [
          question("pis-2-q1", "Que problema puede asociarse al agua dura?", ["Incrustaciones", "Mayor velocidad de internet", "Cierre de programador", "Cambio de color del cesped siempre"], 0),
          trueFalse("pis-2-q2", "Un ablandador puede proteger equipos sensibles a incrustaciones.", 0),
        ],
      },
    ],
    certification: {
      id: "23000000-0000-4000-8000-000000000004",
      title: "Certificacion en mantenimiento de piscinas y agua",
      description:
        "Evalua conceptos de filtracion, recirculacion y control operativo de equipos de tratamiento de agua.",
      passingScore: 70,
      duration: 30,
      questionCount: 4,
      questions: [
        question("cert-pis-q1", "Que elemento impulsa el agua por el filtro?", ["Bomba", "Goteros", "Tobera", "Valvula de riego"], 0),
        question("cert-pis-q2", "Que indica habitualmente la dureza elevada?", ["Presencia de calcio y magnesio", "Mayor senal WiFi", "Menor necesidad de limpieza", "Ausencia de sales"], 0),
        trueFalse("cert-pis-q3", "La recirculacion y el filtrado son parte central del mantenimiento de piscinas.", 0),
        trueFalse("cert-pis-q4", "El canasto de la bomba nunca necesita revision.", 1),
      ],
    },
  },
];

const curatedKbDocs = [
  {
    title: "Criterios de diagnostico en instalaciones de riego",
    content:
      "Para diagnosticar baja presion en un sector de riego, Irridelta recomienda verificar primero el filtro, la apertura de la electrovalvula, la existencia de fugas visibles y la presion dinamica durante el funcionamiento. Si el problema afecta solo un sector, suele estar asociado a obturaciones, boquillas, solenoide o perdida en esa linea.",
  },
  {
    title: "Seleccion de bombas para riego",
    content:
      "La seleccion de una bomba para riego debe cruzar caudal requerido, altura manometrica total, perdidas de carga, fuente de agua y simultaneidad de sectores. Una bomba sobredimensionada puede trabajar fuera de curva y una insuficiente puede dejar sectores con baja cobertura.",
  },
  {
    title: "Riego por goteo y filtrado",
    content:
      "En riego por goteo, el filtrado es critico para evitar obturacion de emisores. Tambien conviene controlar presion de trabajo, longitud de lineas y uniformidad. Los sectores deben agrupar plantas con necesidades hidricas similares y condiciones de exposicion parecidas.",
  },
  {
    title: "Servicios de Irridelta para clientes",
    content:
      "Irridelta comercializa productos para riego, bombas, piscinas, tratamiento de agua y jardineria. La empresa acompana proyectos con asesoramiento tecnico, seleccion de componentes, capacitaciones y soporte para mantenimiento preventivo.",
  },
];

function sqlString(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonb(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function userIdSql(user) {
  return `(select id from auth.users where email = ${sqlString(user.email)})`;
}

function vectorLiteral(values) {
  return sqlString(`[${Array.from(values).map((value) => Number(value).toFixed(8)).join(",")}]`);
}

function run(command, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("close", (code) => {
      if (code === 0 || allowFailure) {
        resolve({ code, stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed (${code}): ${command} ${args.join(" ")}\n${stdout}\n${stderr}`
        )
      );
    });
  });
}

async function uploadStorageObject(args) {
  const result = await run(supabaseBin, args, { allowFailure: true });
  const output = `${result.stdout}\n${result.stderr}`;

  if (result.code === 0 || output.includes('"Duplicate"') || output.includes("resource already exists")) {
    return;
  }

  throw new Error(`Storage upload failed: ${output}`);
}

async function runDbSql(sql) {
  const tmpSqlPath = path.join("/tmp", `irridelta-demo-seed-${Date.now()}.sql`);
  fs.writeFileSync(tmpSqlPath, sql, { mode: 0o600 });

  try {
    return await run(supabaseBin, ["db", "query", "--linked", "-f", tmpSqlPath, "-o", "json"]);
  } finally {
    fs.rmSync(tmpSqlPath, { force: true });
  }
}

function buildCleanupSql() {
  const trainingIds = trainings.map((training) => sqlString(training.id)).join(",");
  const moduleIds = trainings
    .flatMap((training) => training.modules.map((module) => sqlString(module.id)))
    .join(",");
  const resourceIds = trainings
    .flatMap((training) => training.modules.flatMap((module) => module.resources.map((resource) => sqlString(resource.id))))
    .join(",");
  const certificationIds = trainings.map((training) => sqlString(training.certification.id)).join(",");
  const kbFileId = "24000000-0000-4000-8000-000000000001";

  return `
begin;
delete from public.certification_requests where user_id in (select id from auth.users where email like '%@demo.irridelta.com') or certification_id in (${certificationIds});
delete from public.exam_attempts where user_id in (select id from auth.users where email like '%@demo.irridelta.com');
delete from public.progreso_recursos where user_id in (select id from auth.users where email like '%@demo.irridelta.com') or recurso_id in (${resourceIds});
delete from public.user_progress where user_id in (select id from auth.users where email like '%@demo.irridelta.com') or recurso_id in (${resourceIds});
delete from public.certificaciones where id in (${certificationIds}) or capacitacion_id in (${trainingIds});
delete from public.modulo_recursos where id in (${resourceIds}) or modulo_id in (${moduleIds});
delete from public.capacitacion_modulos where id in (${moduleIds}) or capacitacion_id in (${trainingIds});
delete from public.capacitaciones where id in (${trainingIds});
delete from public.productos where id between 1001 and 1014;
delete from public.categorias where id between 101 and 105;
delete from public.documentos_kb where archivo_id = ${sqlString(kbFileId)}::uuid or metadata ->> 'seed' = 'demo_2026';
delete from public.archivos_fuente where id = ${sqlString(kbFileId)}::uuid or storage_path = ${sqlString(kbStoragePath)};
delete from auth.users where email like '%@demo.irridelta.com';
commit;
`;
}

async function provisionAuthUsersWithTempFunction() {
  const functionName = "tmp-demo-auth-seed";
  const seedToken = crypto.randomUUID();
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "irridelta-demo-auth-"));
  const functionDir = path.join(tmpDir, "supabase", "functions", functionName);

  fs.mkdirSync(functionDir, { recursive: true });
  fs.writeFileSync(
    path.join(functionDir, "index.ts"),
    `
import { createClient } from "npm:@supabase/supabase-js@2";

const expectedToken = ${JSON.stringify(seedToken)};
const demoPassword = ${JSON.stringify(DEMO_PASSWORD)};
const demoUsers = ${JSON.stringify(users)};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (req.headers.get("x-seed-token") !== expectedToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return Response.json({ error: listError.message }, { status: 500 });
  }

  for (const existingUser of listData.users ?? []) {
    if (existingUser.email?.endsWith("@demo.irridelta.com")) {
      const { error } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (error) {
        return Response.json({ error: error.message, email: existingUser.email }, { status: 500 });
      }
    }
  }

  const created = [];

  for (const user of demoUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: demoPassword,
      email_confirm: true,
      app_metadata: {
        provider: "email",
        providers: ["email"],
        role: user.role,
      },
      user_metadata: {
        full_name: user.fullName,
        company: user.company,
        phone: user.phone,
      },
    });

    if (error) {
      return Response.json({ error: error.message, email: user.email }, { status: 500 });
    }

    created.push({
      email: data.user.email,
      id: data.user.id,
      role: data.user.app_metadata?.role,
    });
  }

  return Response.json({ created });
});
`,
    { mode: 0o600 }
  );

  try {
    await run(supabaseBin, [
      "--workdir",
      tmpDir,
      "functions",
      "deploy",
      functionName,
      "--project-ref",
      targetProjectRef,
      "--use-api",
      "--no-verify-jwt",
    ]);

    const response = await fetch(`${targetUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "x-seed-token": seedToken,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`No se pudieron crear usuarios demo: ${response.status} ${JSON.stringify(payload)}`);
    }

    console.log(`Usuarios Auth creados: ${payload.created?.length ?? 0}`);
  } finally {
    await run(supabaseBin, [
      "functions",
      "delete",
      functionName,
      "--project-ref",
      targetProjectRef,
      "--yes",
    ], { allowFailure: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function extractPdfPages(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableWorker: true,
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 80) {
      pages.push({ pageNumber, text });
    }
  }

  return pages;
}

function chunkPdfPages(pages, chunkSize = 1100, overlap = 180) {
  const chunks = [];

  for (const page of pages) {
    let start = 0;

    while (start < page.text.length) {
      let end = Math.min(start + chunkSize, page.text.length);

      if (end < page.text.length) {
        const lastPeriod = page.text.lastIndexOf(". ", end);
        if (lastPeriod > start + 350) {
          end = lastPeriod + 1;
        }
      }

      const text = page.text.slice(start, end).trim();

      if (text.length > 120) {
        chunks.push({
          text,
          metadata: {
            seed: "demo_2026",
            source: PDF_FILE_NAME,
            storage_path: kbStoragePath,
            page: page.pageNumber,
            chunk_index: chunks.length,
          },
        });
      }

      if (end >= page.text.length) {
        break;
      }

      start = Math.max(end - overlap, start + 1);
    }
  }

  return chunks;
}

async function embedDocuments(documents) {
  env.allowLocalModels = false;
  env.cacheDir = process.env.TRANSFORMERS_CACHE ?? "/tmp/irridelta-transformers-cache";
  env.backends.onnx.wasm.numThreads = 1;

  const extractor = await pipeline("feature-extraction", "Supabase/gte-small");
  const embedded = [];

  for (let index = 0; index < documents.length; index += 1) {
    const doc = documents[index];
    const output = await extractor(doc.text, {
      pooling: "mean",
      normalize: true,
    });

    embedded.push({
      ...doc,
      embedding: Array.from(output.data),
    });

    if ((index + 1) % 10 === 0 || index + 1 === documents.length) {
      console.log(`Embeddings KB: ${index + 1}/${documents.length}`);
    }
  }

  return embedded;
}

function assessmentFields(module) {
  return [
    jsonb(module.questions),
    module.passingScore ?? 70,
    module.duration ?? 25,
    module.questionCount ?? module.questions.length,
  ];
}

function buildSql(embeddedDocs) {
  const trainingIds = trainings.map((training) => sqlString(training.id)).join(",");
  const moduleIds = trainings
    .flatMap((training) => training.modules.map((module) => sqlString(module.id)))
    .join(",");
  const resourceIds = trainings
    .flatMap((training) => training.modules.flatMap((module) => module.resources.map((resource) => sqlString(resource.id))))
    .join(",");
  const certificationIds = trainings.map((training) => sqlString(training.certification.id)).join(",");
  const kbFileId = "24000000-0000-4000-8000-000000000001";

  const authUpdateStatements = users
    .map(
      (user) => `
update auth.users
set
  raw_app_meta_data = ${jsonb({ provider: "email", providers: ["email"], role: user.role })},
  raw_user_meta_data = ${jsonb({ full_name: user.fullName, company: user.company, phone: user.phone })},
  updated_at = now()
where email = ${sqlString(user.email)};

update auth.identities
set
  identity_data = identity_data || ${jsonb({
    email_verified: true,
    phone_verified: false,
    full_name: user.fullName,
  })},
  updated_at = now()
where user_id = ${userIdSql(user)};
`
    )
    .join("\n");

  const categoryRows = categories
    .map(([id, name]) => `(${id}, ${sqlString(name)})`)
    .join(",\n");

  const productRows = products
    .map(
      ([id, name, description, imageUrl, categoryId]) =>
        `(${id}, ${sqlString(name)}, ${sqlString(description)}, ${sqlString(imageUrl)}, ${categoryId})`
    )
    .join(",\n");

  const trainingRows = trainings
    .map(
      (training, index) =>
        `(${sqlString(training.id)}::uuid, ${sqlString(training.title)}, ${sqlString(training.description)}, now() - interval '${10 - index} days', now() - interval '${index} hours', ${training.published})`
    )
    .join(",\n");

  const moduleRows = trainings
    .flatMap((training) =>
      training.modules.map((module) => {
        const [questions, passingScore, duration, questionCount] = assessmentFields(module);
        return `(${sqlString(module.id)}::uuid, ${sqlString(training.id)}::uuid, ${sqlString(module.title)}, ${sqlString(module.description)}, ${module.order}, now(), ${questions}, ${passingScore}, ${duration}, ${questionCount})`;
      })
    )
    .join(",\n");

  const resourceRows = trainings
    .flatMap((training) =>
      training.modules.flatMap((module) =>
        module.resources.map((resource) => {
          if (resource.type === "archivo") {
            return `(${sqlString(resource.id)}::uuid, ${sqlString(module.id)}::uuid, 'archivo', ${sqlString(resource.title)}, ${resource.order}, null, ${sqlString(resource.fileUrl)}, ${sqlString(resource.filePath)}, ${sqlString(resource.fileName)}, ${sqlString(resource.extension)}, now())`;
          }

          return `(${sqlString(resource.id)}::uuid, ${sqlString(module.id)}::uuid, 'youtube', ${sqlString(resource.title)}, ${resource.order}, ${sqlString(resource.youtubeUrl)}, null, null, null, null, now())`;
        })
      )
    )
    .join(",\n");

  const certificationRows = trainings
    .map((training) => {
      const cert = training.certification;
      return `(${sqlString(cert.id)}::uuid, ${sqlString(training.id)}::uuid, ${sqlString(cert.title)}, ${sqlString(cert.description)}, ${jsonb(cert.questions)}, ${cert.passingScore}, ${cert.duration}, now(), ${cert.questionCount})`;
    })
    .join(",\n");

  const progressRows = [
    ["32000000-0000-4000-8000-000000000001", users[1], trainings[0].id, trainings[0].modules[0].id, trainings[0].modules[0].resources[0].id],
    ["32000000-0000-4000-8000-000000000002", users[1], trainings[0].id, trainings[0].modules[1].id, trainings[0].modules[1].resources[0].id],
    ["32000000-0000-4000-8000-000000000003", users[1], trainings[0].id, trainings[0].modules[2].id, trainings[0].modules[2].resources[0].id],
    ["32000000-0000-4000-8000-000000000004", users[2], trainings[1].id, trainings[1].modules[0].id, trainings[1].modules[0].resources[0].id],
    ["32000000-0000-4000-8000-000000000005", users[2], trainings[2].id, trainings[2].modules[0].id, trainings[2].modules[0].resources[0].id],
  ]
    .map(
      ([id, user, capacitacionId, moduloId, recursoId], index) =>
        `(${sqlString(id)}::uuid, ${userIdSql(user)}, ${sqlString(capacitacionId)}::uuid, ${sqlString(moduloId)}::uuid, ${sqlString(recursoId)}::uuid, true, now() - interval '${6 - index} days', now() - interval '${7 - index} days', now() - interval '${6 - index} days')`
    )
    .join(",\n");

  const userProgressRows = [
    ["33000000-0000-4000-8000-000000000001", users[1], trainings[0].modules[0].id, trainings[0].modules[0].resources[0].id],
    ["33000000-0000-4000-8000-000000000002", users[1], trainings[0].modules[1].id, trainings[0].modules[1].resources[0].id],
    ["33000000-0000-4000-8000-000000000003", users[1], trainings[0].modules[2].id, trainings[0].modules[2].resources[0].id],
    ["33000000-0000-4000-8000-000000000004", users[2], trainings[1].modules[0].id, trainings[1].modules[0].resources[0].id],
  ]
    .map(
      ([id, user, moduloId, recursoId], index) =>
        `(${sqlString(id)}::uuid, ${userIdSql(user)}, ${sqlString(moduloId)}::uuid, ${sqlString(recursoId)}::uuid, true, now() - interval '${5 - index} days')`
    )
    .join(",\n");

  const attemptRows = [
    {
      id: "30000000-0000-4000-8000-000000000001",
      user: users[1],
      capacitacionId: trainings[0].id,
      certificationId: trainings[0].certification.id,
      type: "final",
      attempt: 1,
      percentage: 88,
      approved: true,
      duration: 1460,
      answers: [
        { question_id: "cert-res-q1", correcta: true },
        { question_id: "cert-res-q2", correcta: true },
        { question_id: "cert-res-q3", correcta: true },
        { question_id: "cert-res-q4", correcta: false },
      ],
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      user: users[2],
      capacitacionId: trainings[1].id,
      moduleId: trainings[1].modules[0].id,
      type: "modulo",
      attempt: 1,
      percentage: 75,
      approved: true,
      duration: 720,
      answers: [
        { question_id: "got-1-q1", correcta: true },
        { question_id: "got-1-q2", correcta: true },
      ],
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      user: users[3],
      capacitacionId: trainings[2].id,
      moduleId: trainings[2].modules[0].id,
      type: "modulo",
      attempt: 1,
      percentage: 50,
      approved: false,
      duration: 410,
      answers: [
        { question_id: "bom-1-q1", correcta: true },
        { question_id: "bom-1-q2", correcta: false },
      ],
    },
  ]
    .map(
      (attempt, index) =>
        `(${sqlString(attempt.id)}::uuid, ${userIdSql(attempt.user)}, ${sqlString(attempt.capacitacionId)}::uuid, ${attempt.moduleId ? `${sqlString(attempt.moduleId)}::uuid` : "null"}, ${attempt.certificationId ? `${sqlString(attempt.certificationId)}::uuid` : "null"}, ${sqlString(attempt.type)}, ${attempt.attempt}, 3, 'completado', ${attempt.percentage}, ${attempt.approved}, now() - interval '${8 - index} days', now() - interval '${8 - index} days' + interval '${attempt.duration} seconds', now() - interval '${8 - index} days', ${jsonb(attempt.answers)}, ${attempt.duration})`
    )
    .join(",\n");

  const requestRows = [
    {
      id: "31000000-0000-4000-8000-000000000001",
      cert: trainings[0].certification,
      training: trainings[0],
      user: users[1],
      status: "approved",
      percentage: 88,
      attemptId: "30000000-0000-4000-8000-000000000001",
      reviewed: "now() - interval '6 days'",
      reason: null,
    },
    {
      id: "31000000-0000-4000-8000-000000000002",
      cert: trainings[1].certification,
      training: trainings[1],
      user: users[2],
      status: "pending",
      percentage: 82,
      attemptId: null,
      reviewed: "null",
      reason: null,
    },
    {
      id: "31000000-0000-4000-8000-000000000003",
      cert: trainings[2].certification,
      training: trainings[2],
      user: users[3],
      status: "rejected",
      percentage: 58,
      attemptId: null,
      reviewed: "now() - interval '2 days'",
      reason: "Debe completar la puesta en marcha supervisada antes de emitir el certificado.",
    },
  ]
    .map(
      (request, index) =>
        `(${sqlString(request.id)}::uuid, ${sqlString(request.cert.id)}::uuid, ${sqlString(request.training.id)}::uuid, ${sqlString(request.cert.title)}, ${sqlString(request.training.title)}, ${sqlString(request.user.fullName)}, ${userIdSql(request.user)}, ${sqlString(request.status)}, ${sqlString(request.reason)}, ${request.percentage}, now() - interval '${7 - index} days', now() - interval '${7 - index} days', ${request.reviewed}, ${request.attemptId ? `${sqlString(request.attemptId)}::uuid` : "null"})`
    )
    .join(",\n");

  const kbRows = embeddedDocs
    .map(
      (doc, index) =>
        `(${sqlString(`25000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)}::uuid, ${sqlString(doc.text)}, ${jsonb(doc.metadata)}, ${vectorLiteral(doc.embedding)}::vector, ${sqlString(kbFileId)}::uuid)`
    )
    .join(",\n");

  return `
begin;

delete from public.certification_requests where id in ('31000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000003') or user_id in (select id from auth.users where email like '%@demo.irridelta.com') or certification_id in (${certificationIds});
delete from public.exam_attempts where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003') or user_id in (select id from auth.users where email like '%@demo.irridelta.com');
delete from public.progreso_recursos where user_id in (select id from auth.users where email like '%@demo.irridelta.com') or recurso_id in (${resourceIds});
delete from public.user_progress where user_id in (select id from auth.users where email like '%@demo.irridelta.com') or recurso_id in (${resourceIds});
delete from public.certificaciones where id in (${certificationIds}) or capacitacion_id in (${trainingIds});
delete from public.modulo_recursos where id in (${resourceIds}) or modulo_id in (${moduleIds});
delete from public.capacitacion_modulos where id in (${moduleIds}) or capacitacion_id in (${trainingIds});
delete from public.capacitaciones where id in (${trainingIds});
delete from public.productos where id between 1001 and 1014;
delete from public.categorias where id between 101 and 105;
delete from public.documentos_kb where archivo_id = ${sqlString(kbFileId)}::uuid or metadata ->> 'seed' = 'demo_2026';
delete from public.archivos_fuente where id = ${sqlString(kbFileId)}::uuid or storage_path = ${sqlString(kbStoragePath)};

${authUpdateStatements}

insert into public.categorias (id, nombre) values
${categoryRows}
on conflict (id) do update set nombre = excluded.nombre;

insert into public.productos (id, nombre, descripcion, imagen_url, id_categoria) values
${productRows}
on conflict (id) do update
set nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    imagen_url = excluded.imagen_url,
    id_categoria = excluded.id_categoria;

insert into public.capacitaciones (id, titulo, descripcion, created_at, updated_at, publicada) values
${trainingRows}
on conflict (id) do update
set titulo = excluded.titulo,
    descripcion = excluded.descripcion,
    updated_at = excluded.updated_at,
    publicada = excluded.publicada;

insert into public.capacitacion_modulos (
  id,
  capacitacion_id,
  titulo,
  descripcion,
  orden,
  created_at,
  preguntas,
  porcentaje_aprobacion,
  duracion_maxima_minutos,
  cantidad_preguntas_a_mostrar
) values
${moduleRows}
on conflict (id) do update
set capacitacion_id = excluded.capacitacion_id,
    titulo = excluded.titulo,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    preguntas = excluded.preguntas,
    porcentaje_aprobacion = excluded.porcentaje_aprobacion,
    duracion_maxima_minutos = excluded.duracion_maxima_minutos,
    cantidad_preguntas_a_mostrar = excluded.cantidad_preguntas_a_mostrar;

insert into public.modulo_recursos (
  id,
  modulo_id,
  tipo,
  titulo,
  orden,
  youtube_url,
  archivo_url,
  archivo_path,
  archivo_nombre,
  extension,
  created_at
) values
${resourceRows}
on conflict (id) do update
set modulo_id = excluded.modulo_id,
    tipo = excluded.tipo,
    titulo = excluded.titulo,
    orden = excluded.orden,
    youtube_url = excluded.youtube_url,
    archivo_url = excluded.archivo_url,
    archivo_path = excluded.archivo_path,
    archivo_nombre = excluded.archivo_nombre,
    extension = excluded.extension;

insert into public.certificaciones (
  id,
  capacitacion_id,
  titulo,
  descripcion,
  preguntas,
  porcentaje_aprobacion,
  duracion_maxima_minutos,
  created_at,
  cantidad_preguntas_examen
) values
${certificationRows}
on conflict (id) do update
set capacitacion_id = excluded.capacitacion_id,
    titulo = excluded.titulo,
    descripcion = excluded.descripcion,
    preguntas = excluded.preguntas,
    porcentaje_aprobacion = excluded.porcentaje_aprobacion,
    duracion_maxima_minutos = excluded.duracion_maxima_minutos,
    cantidad_preguntas_examen = excluded.cantidad_preguntas_examen;

insert into public.progreso_recursos (
  id,
  user_id,
  capacitacion_id,
  modulo_id,
  recurso_id,
  completado,
  completado_en,
  created_at,
  updated_at
) values
${progressRows}
on conflict (id) do update
set completado = excluded.completado,
    completado_en = excluded.completado_en,
    updated_at = excluded.updated_at;

insert into public.user_progress (
  id,
  user_id,
  modulo_id,
  recurso_id,
  aprobado,
  updated_at
) values
${userProgressRows}
on conflict (id) do update
set aprobado = excluded.aprobado,
    updated_at = excluded.updated_at;

insert into public.exam_attempts (
  id,
  user_id,
  capacitacion_id,
  modulo_id,
  certificacion_id,
  tipo_examen,
  intento_numero,
  max_intentos,
  estado,
  porcentaje,
  aprobado,
  fecha_inicio,
  fecha_fin,
  created_at,
  respuestas_detalle,
  duracion_segundos
) values
${attemptRows}
on conflict (id) do update
set estado = excluded.estado,
    porcentaje = excluded.porcentaje,
    aprobado = excluded.aprobado,
    fecha_fin = excluded.fecha_fin,
    respuestas_detalle = excluded.respuestas_detalle,
    duracion_segundos = excluded.duracion_segundos;

insert into public.certification_requests (
  id,
  certification_id,
  capacitacion_id,
  certification_title,
  capacitacion_title,
  requester_name,
  user_id,
  status,
  rejection_reason,
  exam_percentage,
  exam_approved_at,
  requested_at,
  reviewed_at,
  exam_attempt_id
) values
${requestRows}
on conflict (id) do update
set status = excluded.status,
    rejection_reason = excluded.rejection_reason,
    exam_percentage = excluded.exam_percentage,
    exam_approved_at = excluded.exam_approved_at,
    reviewed_at = excluded.reviewed_at,
    exam_attempt_id = excluded.exam_attempt_id;

insert into public.archivos_fuente (
  id,
  nombre,
  storage_path,
  tipo,
  created_at,
  activo
) values (
  ${sqlString(kbFileId)}::uuid,
  ${sqlString(PDF_FILE_NAME)},
  ${sqlString(kbStoragePath)},
  'application/pdf',
  now(),
  true
)
on conflict (id) do update
set nombre = excluded.nombre,
    storage_path = excluded.storage_path,
    tipo = excluded.tipo,
    activo = excluded.activo;

insert into public.documentos_kb (
  id,
  contenido,
  metadata,
  embedding,
  archivo_id
) values
${kbRows}
on conflict (id) do update
set contenido = excluded.contenido,
    metadata = excluded.metadata,
    embedding = excluded.embedding,
    archivo_id = excluded.archivo_id;

select setval(pg_get_serial_sequence('public.categorias', 'id'), greatest((select coalesce(max(id), 1) from public.categorias), 1), true);
select setval(pg_get_serial_sequence('public.productos', 'id'), greatest((select coalesce(max(id), 1) from public.productos), 1), true);

commit;
`;
}

async function main() {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`No se encontro el PDF: ${pdfPath}`);
  }

  console.log(`PDF: ${pdfPath}`);
  console.log("Subiendo PDF a Storage...");
  await run(supabaseBin, ["storage", "rm", `ss:///kb-files/${kbStoragePath}`, "--linked", "--experimental"], {
    allowFailure: true,
  });
  await run(supabaseBin, ["storage", "rm", `ss:///formacion-archivos/${learningStoragePath}`, "--linked", "--experimental"], {
    allowFailure: true,
  });
  await uploadStorageObject([
    "storage",
    "cp",
    pdfPath,
    `ss:///kb-files/${kbStoragePath}`,
    "--linked",
    "--experimental",
    "--content-type",
    "application/pdf",
  ]);
  await uploadStorageObject([
    "storage",
    "cp",
    pdfPath,
    `ss:///formacion-archivos/${learningStoragePath}`,
    "--linked",
    "--experimental",
    "--content-type",
    "application/pdf",
  ]);

  console.log("Limpiando datos demo anteriores...");
  await runDbSql(buildCleanupSql());

  console.log("Creando usuarios demo con Auth Admin temporal...");
  await provisionAuthUsersWithTempFunction();

  console.log("Extrayendo texto del PDF...");
  const pages = await extractPdfPages(pdfPath);
  const pdfChunks = chunkPdfPages(pages);
  const docs = [
    ...pdfChunks,
    ...curatedKbDocs.map((doc, index) => ({
      text: doc.content,
      metadata: {
        seed: "demo_2026",
        source: "demo_irridelta_operaciones",
        title: doc.title,
        chunk_index: pdfChunks.length + index,
      },
    })),
  ];

  console.log(`Chunks KB: ${docs.length}`);
  const embeddedDocs = await embedDocuments(docs);
  const sql = buildSql(embeddedDocs);

  console.log("Aplicando semilla demo en Supabase...");
  await runDbSql(sql);

  console.log("Semilla demo aplicada.");
  console.log(`Usuarios demo: ${users.map((user) => user.email).join(", ")}`);
  console.log(`Password demo comun: configurado en ${adminEnvFile}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
