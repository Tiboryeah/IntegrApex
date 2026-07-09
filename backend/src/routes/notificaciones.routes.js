const express = require('express');

const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function contratosDelUsuario(user) {
  const contratos = store.getCollection('contratos');
  if (user.rol === 'dependencia' || user.rol === 'finanzas') {
    return new Set(contratos.map(c => c.id));
  }
  return new Set(
    contratos
      .filter(c => c.residente_id === user.id || c.superintendente_id === user.id || c.supervision_id === user.id)
      .map(c => c.id)
  );
}

// HU-02/HU-07/HU-13/HU-20: bandeja de notificaciones reales (canal 'sistema') del usuario
router.get('/notificaciones', authenticate, (req, res) => {
  const user = req.user;
  const misContratos = contratosDelUsuario(user);
  const notificaciones = store
    .find('notificaciones', n => n.creado_para_rol === user.rol && misContratos.has(n.contrato_id))
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

  return res.json({
    notificaciones,
    no_leidas: notificaciones.filter(n => !n.leida).length
  });
});

router.patch('/notificaciones/:id/leer', authenticate, (req, res) => {
  const notif = store.findOne('notificaciones', n => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: "Notificacion no encontrada" });
  if (notif.creado_para_rol !== req.user.rol) return res.status(403).json({ error: "No autorizado" });

  const updated = store.update('notificaciones', notif.id, { leida: true });
  return res.json({ message: "Notificación marcada como leída", notificacion: updated });
});

router.post('/notificaciones/leer-todas', authenticate, (req, res) => {
  const user = req.user;
  const misContratos = contratosDelUsuario(user);
  const pendientes = store.find('notificaciones', n => n.creado_para_rol === user.rol && misContratos.has(n.contrato_id) && !n.leida);
  pendientes.forEach(n => store.update('notificaciones', n.id, { leida: true }));
  return res.json({ message: `${pendientes.length} notificación(es) marcada(s) como leída(s)` });
});

// HU-07 (canal 'correo'): buzón de correo simulado, sin depender de credenciales SMTP reales.
router.get('/correos-salientes', authenticate, (req, res) => {
  const user = req.user;
  const misContratos = contratosDelUsuario(user);
  const correos = store
    .find('correos_salientes', c => c.para_rol === user.rol && misContratos.has(c.contrato_id))
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  return res.json(correos);
});

module.exports = router;
