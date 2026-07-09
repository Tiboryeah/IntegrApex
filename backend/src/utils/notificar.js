// HU-07/HU-02: entrega una notificación por el canal configurado.
// canal 'sistema' -> bandeja en app (colección 'notificaciones').
// canal 'correo'  -> buzón de correo simulado (colección 'correos_salientes'),
// para no depender de credenciales SMTP reales en este prototipo.
const store = require('../db/store');

function notificar({ contrato_id, tipo, canal, mensaje, creado_para_rol, relacionado_tipo, relacionado_id }) {
  const creado_en = new Date().toISOString();

  if (canal === 'correo') {
    return store.insert('correos_salientes', {
      contrato_id,
      tipo,
      canal: 'correo',
      para_rol: creado_para_rol,
      asunto: mensaje.length > 90 ? `${mensaje.slice(0, 87)}...` : mensaje,
      cuerpo: mensaje,
      relacionado_tipo: relacionado_tipo || null,
      relacionado_id: relacionado_id || null,
      creado_en,
      enviado_en: creado_en
    });
  }

  return store.insert('notificaciones', {
    contrato_id,
    tipo,
    canal: 'sistema',
    mensaje,
    leida: false,
    creado_para_rol,
    relacionado_tipo: relacionado_tipo || null,
    relacionado_id: relacionado_id || null,
    creado_en
  });
}

module.exports = { notificar };
