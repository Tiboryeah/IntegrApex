const PDFDocument = require('pdfkit');

// Generic single-table PDF builder shared by every report export. Mirrors
// xlsxExport.js's buildWorkbookBuffer so every report type (7 for HU-19,
// bitacora for HU-10) is defined the same way: title + columns + rows.
function buildTablePdfBuffer(title, subtitle, columns, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').fillColor('#555555').text(subtitle);
      doc.fillColor('#000000');
    }
    doc.moveDown(0.8);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / columns.length;
    const rowHeight = 20;

    function drawHeader(y) {
      doc.font('Helvetica-Bold').fontSize(9);
      columns.forEach((col, i) => {
        doc.text(col.header, startX + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
      });
      doc.moveTo(startX, y + rowHeight - 4).lineTo(startX + usableWidth, y + rowHeight - 4).strokeColor('#cccccc').stroke();
      return y + rowHeight;
    }

    let y = drawHeader(doc.y);
    doc.font('Helvetica').fontSize(9);

    if (rows.length === 0) {
      doc.text('Sin datos para el periodo seleccionado.', startX, y);
    }

    rows.forEach(row => {
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
        doc.font('Helvetica').fontSize(9);
      }
      columns.forEach((col, i) => {
        const value = row[col.key];
        doc.text(value === undefined || value === null ? '' : String(value), startX + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
      });
      y += rowHeight;
    });

    doc.end();
  });
}

function sendPdf(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
}

module.exports = { buildTablePdfBuffer, sendPdf };
