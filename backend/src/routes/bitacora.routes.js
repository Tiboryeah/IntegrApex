const express = require('express');
const crypto = require('crypto');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { buildWorkbookBuffer, sendXlsx } = require('../utils/xlsxExport');

const router = express.Router();

// HU-08: Apertura formal
router.post('/contratos/:id/bitacora/aperturar', authenticate, authorizeRoles('residente'), (req, res) => {
  const contrato_id = req.params.id;
  const { fecha_entrega_sitio } = req.body;

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const exists = store.findOne('bitacoras', b => b.contrato_id === contrato_id);
  if (exists) {
    return res.status(400).json({ error: "La bitacora de este contrato ya fue aperturada" });
  }

  const bitacora = store.insert('bitacoras', {
    contrato_id,
    fecha_entrega_sitio,
    firmantes: [
      { user_id: contract.residente_id, rol: 'residente', firmado: false, fecha_firma: null },
      { user_id: contract.superintendente_id, rol: 'contratista', firmado: false, fecha_firma: null },
      ...(contract.supervision_id ? [{ user_id: contract.supervision_id, rol: 'supervision', firmado: false, fecha_firma: null }] : [])
    ],
    completada: false
  });

  return res.status(201).json({ message: "Bitacora creada en borrador. Pendiente de firmas de representantes.", bitacora });
});

// Por Firmar: Bandeja de firmas pendientes
router.get('/bitacora/por-firmar', authenticate, (req, res) => {
  const user = req.user;
  const bitacoras = store.getCollection('bitacoras');
  const contratos = store.getCollection('contratos');

  const pendingSignatures = [];
  bitacoras.forEach(b => {
    const signature = b.firmantes.find(f => f.user_id === user.id);
    if (signature && !signature.firmado) {
      const contract = contratos.find(c => c.id === b.contrato_id);
      pendingSignatures.push({
        bitacora_id: b.id,
        contrato_id: b.contrato_id,
        folio: contract ? contract.folio : "N/A",
        objeto: contract ? contract.objeto : "N/A",
        fecha_entrega_sitio: b.fecha_entrega_sitio
      });
    }
  });

  return res.json(pendingSignatures);
});

// Por Firmar: Firmar apertura
router.post('/bitacora/:id/firmar', authenticate, (req, res) => {
  const bitacora_id = req.params.id;
  const user = req.user;

  const bitacora = store.findOne('bitacoras', b => b.id === bitacora_id);
  if (!bitacora) {
    return res.status(404).json({ error: "Registro de bitacora no encontrado" });
  }

  const signatureIdx = bitacora.firmantes.findIndex(f => f.user_id === user.id);
  if (signatureIdx === -1) {
    return res.status(403).json({ error: "No eres un firmante autorizado para esta bitacora" });
  }

  if (bitacora.firmantes[signatureIdx].firmado) {
    return res.status(400).json({ error: "Ya has firmado esta apertura" });
  }

  bitacora.firmantes[signatureIdx].firmado = true;
  bitacora.firmantes[signatureIdx].fecha_firma = new Date().toISOString();

  const allSigned = bitacora.firmantes.every(f => f.firmado);
  bitacora.completada = allSigned;

  store.update('bitacoras', bitacora_id, bitacora);

  if (allSigned) {
    const contract = store.findOne('contratos', c => c.id === bitacora.contrato_id);
    store.insert('notas', {
      contrato_id: bitacora.contrato_id,
      folio: 1,
      tipo: "Apertura",
      contenido: `Nota de Apertura Formal de Bitacora. Contrato Folio: ${contract.folio}. Objeto: ${contract.objeto}. Monto Contractual: $${contract.monto.toFixed(2)} M.N. Plazo: ${contract.plazo_dias} dias naturales con inicio el ${contract.fecha_inicio} y termino el ${contract.fecha_termino}. Representantes autorizados: Residente (${contract.residente_id}), Superintendente (${contract.superintendente_id}), Supervision (${contract.supervision_id || 'N/A'}). De acuerdo con el Art. 122 RLOPSRM.`,
      creado_por_nombre: "Sistema IntegrApex (Firma conjunta)",
      creado_por_id: "system",
      creado_por_rol: "sistema",
      fecha: new Date().toISOString(),
      vinculo_nota_id: null
    });
  }

  return res.json({ message: "Firma registrada con exito", bitacora });
});

// HU-09: Emision y respuesta de notas
router.post('/contratos/:id/bitacora/notas', authenticate, (req, res) => {
  const contrato_id = req.params.id;
  const { tipo, contenido, vinculo_nota_id } = req.body;
  const user = req.user;

  if (!tipo || !contenido) {
    return res.status(400).json({ error: "Tipo y contenido requeridos" });
  }

  const bitacora = store.findOne('bitacoras', b => b.contrato_id === contrato_id);
  if (!bitacora || !bitacora.completada) {
    return res.status(400).json({ error: "La bitacora no ha sido aperturada formalmente o le faltan firmas" });
  }

  const validTypes = {
    residente: ['Autorizacion', 'Aprobacion', 'Instruccin', 'General'],
    contratista: ['Solicitud', 'Aviso', 'Entrega', 'General'],
    supervision: ['Avance', 'Incidencia', 'Reporte', 'General']
  };

  const allowedTypes = validTypes[user.rol] || ['General'];
  if (!allowedTypes.includes(tipo)) {
    return res.status(403).json({ error: `Tu rol no tiene permitido emitir notas del tipo ${tipo}. Permitidos: ${allowedTypes.join(', ')}` });
  }

  const contractNotes = store.find('notas', n => n.contrato_id === contrato_id);
  const nextFolio = contractNotes.reduce((max, n) => Math.max(max, n.folio), 0) + 1;

  const signatureHash = crypto.createHash('sha256').update(`${user.id}_${nextFolio}_${Date.now()}`).digest('hex');

  const newNote = store.insert('notas', {
    contrato_id,
    folio: nextFolio,
    tipo,
    contenido,
    creado_por_nombre: user.nombre,
    creado_por_id: user.id,
    creado_por_rol: user.rol,
    fecha: new Date().toISOString(),
    firma_hash: signatureHash,
    vinculo_nota_id: vinculo_nota_id || null
  });

  return res.status(201).json({ message: "Nota emitida y firmada digitalmente", nota: newNote });
});

// HU-10: Busqueda y consulta de notas
router.get('/contratos/:id/bitacora/notas', authenticate, (req, res) => {
  const contrato_id = req.params.id;
  const { tipo, f_inicio, f_fin, creador_id, vinculo, query } = req.query;

  const notes = store.find('notas', n => n.contrato_id === contrato_id);

  const filtered = notes.filter(n => {
    if (tipo && n.tipo !== tipo) return false;
    if (creador_id && n.creado_por_id !== creador_id) return false;
    if (vinculo && String(n.vinculo_nota_id || '') !== String(vinculo)) return false;

    if (f_inicio) {
      if (new Date(n.fecha) < new Date(f_inicio)) return false;
    }
    if (f_fin) {
      const end = new Date(f_fin);
      end.setHours(23, 59, 59, 999);
      if (new Date(n.fecha) > end) return false;
    }

    if (query) {
      const txt = query.toLowerCase();
      const inCont = n.contenido.toLowerCase().includes(txt);
      const inName = n.creado_por_nombre.toLowerCase().includes(txt);
      const inFolio = String(n.folio).includes(txt);
      if (!inCont && !inName && !inFolio) return false;
    }

    return true;
  });

  return res.json(filtered.sort((a, b) => a.folio - b.folio));
});

// HU-10: Exportar seleccion de notas a Excel
router.get('/contratos/:id/bitacora/notas/export', authenticate, async (req, res, next) => {
  try {
    const contrato_id = req.params.id;
    const idsParam = req.query.ids;

    let notes = store.find('notas', n => n.contrato_id === contrato_id);
    if (idsParam) {
      const idSet = new Set(String(idsParam).split(',').filter(Boolean));
      notes = notes.filter(n => idSet.has(n.id));
    }
    notes = notes.sort((a, b) => a.folio - b.folio);

    const columns = [
      { header: 'Folio', key: 'folio', width: 10 },
      { header: 'Tipo', key: 'tipo', width: 16 },
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Emitido por', key: 'emitido_por', width: 26 },
      { header: 'Rol', key: 'rol', width: 14 },
      { header: 'Vinculo (folio)', key: 'vinculo', width: 16 },
      { header: 'Contenido', key: 'contenido', width: 60 },
      { header: 'Firma (hash)', key: 'firma', width: 20 }
    ];
    const rows = notes.map(n => ({
      folio: n.folio,
      tipo: n.tipo,
      fecha: n.fecha ? new Date(n.fecha).toLocaleString('es-MX') : '',
      emitido_por: n.creado_por_nombre,
      rol: n.creado_por_rol,
      vinculo: n.vinculo_nota_id || '',
      contenido: n.contenido,
      firma: n.firma_hash ? n.firma_hash.substring(0, 16) : ''
    }));

    const buffer = await buildWorkbookBuffer('Bitacora', columns, rows);
    return sendXlsx(res, `Bitacora_${contrato_id}.xlsx`, buffer);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
