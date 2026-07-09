const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Genera un id unico. Varias colecciones comparten el mismo prefijo de 3 letras
// (p. ej. "contratos" y "contrato_versiones" ambas producen "con"), y el id es
// la clave primaria de una sola tabla compartida (document_store), asi que el
// prefijo por si solo no evita colisiones entre colecciones distintas.
function generateId(collectionName) {
  return `${collectionName.substring(0, 3)}_${crypto.randomUUID()}`;
}

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

// Garantiza que exista la carpeta local de persistencia.
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Estado inicial de la base JSON con cuentas y contratos de demostración.
const initialState = {
  usuarios: [
    { id: "u0", email: "residente@integrapex.test", nombre: "Ing. Residente Base", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u1", email: "contratista@integrapex.test", nombre: "Ing. Contratista Base", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u2", email: "supervision@integrapex.test", nombre: "Ing. Supervision Base", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u3", email: "dependencia@integrapex.test", nombre: "Lic. Dependencia Base", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u4", email: "csilvasa@ipn.mx", nombre: "Prof. Resident IPN", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u5", email: "correo@dominio.com", nombre: "Isha Finanzas", rol: "finanzas", contrasena: "Contrasena123!", estado: "aprobado" },
    
    // Equipo de demostración: Aldo
    { id: "u_aldo_res", email: "residente2.demo@integrapex.test", nombre: "Residente Aldo", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_aldo_con", email: "super2.demo@integrapex.test", nombre: "Contratista Aldo", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_aldo_sup", email: "superv2.demo@integrapex.test", nombre: "Supervision Aldo", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_aldo_dep", email: "dependencia.sur@integrapex.test", nombre: "Dependencia Aldo", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_aldo_fin", email: "finanzas.sur@integrapex.test", nombre: "Finanzas Aldo", rol: "finanzas", contrasena: "IntegrApex2026!", estado: "aprobado" },

    // Equipo de demostración: Ronis
    { id: "u_ronis_res", email: "residente.sur@integrapex.test", nombre: "Residente Ronis", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_ronis_con", email: "super3.demo@integrapex.test", nombre: "Contratista Ronis", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_ronis_sup", email: "superv.sur@integrapex.test", nombre: "Supervision Ronis", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_ronis_dep", email: "dep2@integrapex.test", nombre: "Dependencia Ronis", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_ronis_fin", email: "finanzas.norte@integrapex.test", nombre: "Finanzas Ronis", rol: "finanzas", contrasena: "IntegrApex2026!", estado: "aprobado" },

    // Equipo de demostración: Leo
    { id: "u_leo_res", email: "residente.norte@integrapex.test", nombre: "Residente Leo", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_leo_con", email: "patito1@integrapex.test", nombre: "Contratista Leo", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_leo_sup", email: "superv.norte@integrapex.test", nombre: "Supervision Leo", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_leo_dep", email: "dependencia4@integrapex.test", nombre: "Dependencia Leo", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_leo_fin", email: "finanzas4@integrapex.test", nombre: "Finanzas Leo", rol: "finanzas", contrasena: "IntegrApex2026!", estado: "aprobado" },

    // Equipo de demostración: Van
    { id: "u_van_res", email: "residente4@integrapex.test", nombre: "Residente Van", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_van_con", email: "patito2@integrapex.test", nombre: "Contratista Van", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_van_sup", email: "superv4@integrapex.test", nombre: "Supervision Van", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_van_dep", email: "dependencia5@integrapex.test", nombre: "Dependencia Van", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_van_fin", email: "finanzas5@integrapex.test", nombre: "Finanzas Van", rol: "finanzas", contrasena: "IntegrApex2026!", estado: "aprobado" },

    // Equipo de demostración: Chinos
    { id: "u_chinos_res", email: "residente5@integrapex.test", nombre: "Residente Chinos", rol: "residente", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_chinos_con", email: "pacifico1@integrapex.test", nombre: "Contratista Chinos", rol: "contratista", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_chinos_sup", email: "superv5@integrapex.test", nombre: "Supervision Chinos", rol: "supervision", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_chinos_dep", email: "dependencia6@integrapex.test", nombre: "Dependencia Chinos", rol: "dependencia", contrasena: "IntegrApex2026!", estado: "aprobado" },
    { id: "u_chinos_fin", email: "finanzas6@integrapex.test", nombre: "Finanzas Chinos", rol: "finanzas", contrasena: "IntegrApex2026!", estado: "aprobado" },
  ],
  contratos: [
    {
      id: "c_base",
      folio: "SOP-2026-001",
      objeto: "Construccion de Planta Potabilizadora y Red de Distribucion Base",
      monto: 12500000.00,
      anticipo_porcentaje: 30,
      anticipo_monto: 3750000.00,
      plazo_dias: 180,
      fecha_inicio: "2026-07-01",
      fecha_termino: "2026-12-28",
      modalidad_pago: "Precios Unitarios",
      residente_id: "u0",
      superintendente_id: "u1",
      supervision_id: "u2",
      pdf_contrato: null,
      creado_en: "2026-07-01T10:00:00.000Z",
      catalogo: [
        { clave: "CON-01", descripcion: "Excavacion por medios mecunicos en terreno tipo B", unidad: "m3", precio_unitario: 150.00, cantidad: 5000 },
        { clave: "CON-02", descripcion: "Concreto premezclado f'c = 250 kg/cm2", unidad: "m3", precio_unitario: 2200.00, cantidad: 2000 },
        { clave: "CON-03", descripcion: "Acero de refuerzo Fy = 4200 kg/cm2", unidad: "kg", precio_unitario: 35.00, cantidad: 150000 },
        { clave: "CON-04", descripcion: "Tuberia de PVC de alta densidad 8 pulgadas", unidad: "ml", precio_unitario: 450.00, cantidad: 4611.11 }
      ],
      programa: [
        { mes: 1, avances: { "CON-01": 2000, "CON-02": 200, "CON-03": 10000, "CON-04": 500 } },
        { mes: 2, avances: { "CON-01": 2000, "CON-02": 500, "CON-03": 30000, "CON-04": 800 } },
        { mes: 3, avances: { "CON-01": 1000, "CON-02": 500, "CON-03": 40000, "CON-04": 1000 } },
        { mes: 4, avances: { "CON-01": 0, "CON-02": 400, "CON-03": 40000, "CON-04": 1000 } },
        { mes: 5, avances: { "CON-01": 0, "CON-02": 300, "CON-03": 20000, "CON-04": 800 } },
        { mes: 6, avances: { "CON-01": 0, "CON-02": 100, "CON-03": 10000, "CON-04": 511.11 } }
      ]
    }
  ],
  fianzas: [],
  convenios: [],
  bitacoras: [],
  notas: [],
  estimaciones: [],
  pagos: [],
  minutas: [],
  visitas: [],
  alertas: [],
  documentos: [],
  contrato_versiones: [],
  fianza_endosos: [],
  trabajos_periodo: [],
  notificaciones: [],
  correos_salientes: [],
  observaciones_estimacion: [],
  reportes_generados: [],
  configuracion_alertas: []
};

// Contratos base para los equipos de demostración.
const teams = [
  { prefix: "aldo", folio: "SOP-2026-002", obj: "Rehabilitacion de Colector Sanitario - Zona Sur (Aldo)", res: "u_aldo_res", con: "u_aldo_con", sup: "u_aldo_sup" },
  { prefix: "ronis", folio: "SOP-2026-003", obj: "Pavimentacion y Guarniciones en Colonia Centro (Ronis)", res: "u_ronis_res", con: "u_ronis_con", sup: "u_ronis_sup" },
  { prefix: "leo", folio: "SOP-2026-004", obj: "Construccion de Puente Vehicular sobre Rio Verde (Leo)", res: "u_leo_res", con: "u_leo_con", sup: "u_leo_sup" },
  { prefix: "van", folio: "SOP-2026-005", obj: "Techado y Canchas Deportivas de Escuela Secundaria (Van)", res: "u_van_res", con: "u_van_con", sup: "u_van_sup" },
  { prefix: "chinos", folio: "SOP-2026-006", obj: "Equipamiento de Clunica de Salud Comunitaria (Chinos)", res: "u_chinos_res", con: "u_chinos_con", sup: "u_chinos_sup" }
];

teams.forEach(t => {
  initialState.contratos.push({
    id: `c_${t.prefix}`,
    folio: t.folio,
    objeto: t.obj,
    monto: 8500000.00,
    anticipo_porcentaje: 30,
    anticipo_monto: 2550000.00,
    plazo_dias: 120,
    fecha_inicio: "2026-07-15",
    fecha_termino: "2026-11-12",
    modalidad_pago: "Precios Unitarios",
    residente_id: t.res,
    superintendente_id: t.con,
    supervision_id: t.sup,
    pdf_contrato: null,
    creado_en: "2026-07-01T11:00:00.000Z",
    catalogo: [
      { clave: "CON-01", descripcion: "Excavacion en zanja", unidad: "m3", precio_unitario: 120.00, cantidad: 4000 },
      { clave: "CON-02", descripcion: "Concreto reforzado f'c = 200 kg/cm2", unidad: "m3", precio_unitario: 1950.00, cantidad: 1200 },
      { clave: "CON-03", descripcion: "Acero de refuerzo Fy = 4200", unidad: "kg", precio_unitario: 34.00, cantidad: 80000 },
      { clave: "CON-04", descripcion: "Suministro e instalacion de tuberia de concreto de 24 pulgadas", unidad: "ml", precio_unitario: 850.00, cantidad: 3505.88 }
    ],
    programa: [
      { mes: 1, avances: { "CON-01": 2000, "CON-02": 300, "CON-03": 20000, "CON-04": 800 } },
      { mes: 2, avances: { "CON-01": 2000, "CON-02": 400, "CON-03": 30000, "CON-04": 1200 } },
      { mes: 3, avances: { "CON-01": 0, "CON-02": 300, "CON-03": 20000, "CON-04": 1000 } },
      { mes: 4, avances: { "CON-01": 0, "CON-02": 200, "CON-03": 10000, "CON-04": 505.88 } }
    ]
  });
});

class SqliteStore {
  constructor() {
    const Database = require('better-sqlite3');
    const isTest = process.env.NODE_ENV === 'test';
    const SQLITE_DB_PATH = isTest ? ':memory:' : path.join(dataDir, 'integrapex.db');
    
    this.db = new Database(SQLITE_DB_PATH);
    this.initDatabase();
    this.migrateIfNeeded();
  }

  initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_store (
        id TEXT PRIMARY KEY,
        collection_name TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_collection ON document_store(collection_name);
    `);
  }

  migrateIfNeeded() {
    const rowCount = this.db.prepare("SELECT COUNT(*) as count FROM document_store").get();
    if (rowCount.count === 0) {
      console.log("SQLite document_store is empty. Checking for db.json migration...");
      let sourceData = initialState;
      if (fs.existsSync(DB_PATH)) {
        try {
          const raw = fs.readFileSync(DB_PATH, 'utf8');
          sourceData = JSON.parse(raw);
          console.log("Found existing db.json. Migrating data to SQLite...");
        } catch (e) {
          console.error("Failed to parse db.json, fallback to initialState", e);
        }
      } else {
        console.log("No db.json found, loading initialState into SQLite...");
      }

      const insertStmt = this.db.prepare("INSERT INTO document_store (id, collection_name, data) VALUES (?, ?, ?)");
      const transaction = this.db.transaction((dataObj) => {
        Object.entries(dataObj).forEach(([collectionName, records]) => {
          if (Array.isArray(records)) {
            records.forEach(record => {
              if (!record.id) {
                record.id = generateId(collectionName);
              }
              insertStmt.run(record.id, collectionName, JSON.stringify(record));
            });
          }
        });
      });
      transaction(sourceData);
      console.log("Migration to SQLite completed successfully.");
    }
  }

  getCollection(name) {
    const stmt = this.db.prepare("SELECT data FROM document_store WHERE collection_name = ?");
    const rows = stmt.all(name);
    return rows.map(r => JSON.parse(r.data));
  }

  find(collectionName, queryFn) {
    const list = this.getCollection(collectionName);
    return list.filter(queryFn);
  }

  findOne(collectionName, queryFn) {
    const list = this.getCollection(collectionName);
    return list.find(queryFn);
  }

  insert(collectionName, record) {
    const id = record.id || generateId(collectionName);
    const newRecord = { id, ...record };
    const stmt = this.db.prepare("INSERT INTO document_store (id, collection_name, data) VALUES (?, ?, ?)");
    stmt.run(id, collectionName, JSON.stringify(newRecord));
    return newRecord;
  }

  update(collectionName, id, updates) {
    const selectStmt = this.db.prepare("SELECT data FROM document_store WHERE id = ? AND collection_name = ?");
    const row = selectStmt.get(id, collectionName);
    if (row) {
      const current = JSON.parse(row.data);
      const updated = { ...current, ...updates };
      const updateStmt = this.db.prepare("UPDATE document_store SET data = ? WHERE id = ? AND collection_name = ?");
      updateStmt.run(JSON.stringify(updated), id, collectionName);
      return updated;
    }
    return null;
  }

  delete(collectionName, id) {
    const stmt = this.db.prepare("DELETE FROM document_store WHERE id = ? AND collection_name = ?");
    stmt.run(id, collectionName);
    return true;
  }
}

module.exports = new SqliteStore();
