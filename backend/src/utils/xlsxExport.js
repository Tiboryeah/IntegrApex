const ExcelJS = require('exceljs');

// Generic XLSX builder shared by every export endpoint (bitacora notes today,
// the HU-19 reports later): columns describe header/key/width, rows are plain
// objects keyed the same as columns[].key.
async function buildWorkbookBuffer(sheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IntegrApex';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach(row => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
}

module.exports = { buildWorkbookBuffer, sendXlsx };
