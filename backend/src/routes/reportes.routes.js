const express = require('express');

const store = require('../db/store');
const { authenticate } = require('../middleware/auth');
const { buildReporteData, REPORT_DEFINITIONS } = require('../utils/reportData');
const { buildWorkbookBuffer, sendXlsx } = require('../utils/xlsxExport');
const { buildTablePdfBuffer, sendPdf } = require('../utils/pdfExport');

const router = express.Router();

function loadReportSource(contractId) {
  const contract = store.findOne('contratos', c => c.id === contractId);
  if (!contract) return null;
  return {
    contract,
    notes: store.find('notas', n => n.contrato_id === contractId),
    estimations: store.find('estimaciones', e => e.contrato_id === contractId),
    convenios: store.find('convenios', c => c.contrato_id === contractId)
  };
}

// HU-19: Datos de los 7 reportes (consumo interno / dashboards)
router.get('/contratos/:id/reporte-data', authenticate, (req, res) => {
  const source = loadReportSource(req.params.id);
  if (!source) return res.status(404).json({ error: "Contrato no encontrado" });

  const { periodo_tipo, periodo_valor } = req.query;
  const reportes = buildReporteData(source.contract, source.notes, source.estimations, source.convenios, { periodo_tipo, periodo_valor });
  return res.json(reportes);
});

// HU-19: Exportación real de cada uno de los 7 reportes definidos, en XLSX o PDF.
router.get('/contratos/:id/reportes/:tipo/export', authenticate, async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const definicion = REPORT_DEFINITIONS[tipo];
    if (!definicion) {
      return res.status(400).json({ error: `Tipo de reporte desconocido: ${tipo}` });
    }

    const source = loadReportSource(req.params.id);
    if (!source) return res.status(404).json({ error: "Contrato no encontrado" });

    const { formato, periodo_tipo, periodo_valor } = req.query;
    const data = buildReporteData(source.contract, source.notes, source.estimations, source.convenios, { periodo_tipo, periodo_valor });
    const rows = definicion.rows(data);
    const subtitle = definicion.subtitle ? definicion.subtitle(data) : '';
    const periodoLabel = !periodo_tipo || periodo_tipo === 'acumulado' ? 'Acumulado' : `${periodo_tipo === 'mensual' ? 'Mensual' : 'Trimestral'} (${periodo_valor})`;
    const title = `${definicion.label} - ${source.contract.folio}`;
    const fullSubtitle = [subtitle, `Periodo: ${periodoLabel}`].filter(Boolean).join(' | ');

    if (formato === 'pdf') {
      const buffer = await buildTablePdfBuffer(title, fullSubtitle, definicion.columns, rows);
      return sendPdf(res, `${tipo}_${source.contract.folio}.pdf`, buffer);
    }

    const buffer = await buildWorkbookBuffer(definicion.label, definicion.columns, rows);
    return sendXlsx(res, `${tipo}_${source.contract.folio}.xlsx`, buffer);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
