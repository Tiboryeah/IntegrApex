const DAY_MS = 24 * 60 * 60 * 1000;

// Shared semaphore for every legal deadline in the system: HU-13/HU-15's 15
// dias naturales de revision (art. 54 LOPSRM) and HU-20's 20 dias naturales
// de pago (art. 54 LOPSRM). Verde while there's comfortable room, ambar in
// the final third of the window, rojo once the deadline has passed.
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
