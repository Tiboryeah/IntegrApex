const DAY_MS = 24 * 60 * 60 * 1000;

// Semáforo compartido para plazos legales:
// 15 días naturales de revisión y 20 días naturales de pago (art. 54 LOPSRM).
// Verde indica margen suficiente, ámbar indica tramo final y rojo indica vencimiento.
function calcularPlazoLegal(fechaInicio, diasLimite) {
  if (!fechaInicio) return null;

  const inicio = new Date(fechaInicio);
  if (Number.isNaN(inicio.getTime())) return null;

  const ahora = new Date();
  const fechaLimite = new Date(inicio.getTime() + diasLimite * DAY_MS);
  const diasTranscurridos = Math.floor((ahora - inicio) / DAY_MS);
  const diasRestantes = diasLimite - diasTranscurridos;
  const vencido = diasRestantes < 0;

  let semaforo = 'verde';
  if (vencido) {
    semaforo = 'rojo';
  } else if (diasTranscurridos / diasLimite >= 2 / 3) {
    semaforo = 'ambar';
  }

  return {
    fecha_inicio: inicio.toISOString(),
    fecha_limite: fechaLimite.toISOString(),
    dias_limite: diasLimite,
    dias_transcurridos: Math.max(0, diasTranscurridos),
    dias_restantes: diasRestantes,
    vencido,
    semaforo
  };
}

module.exports = { calcularPlazoLegal };
