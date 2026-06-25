const service = require('./export.service');

// GET /api/export/:sessionId/excel
async function exportExcel(req, res, next) {
  try {
    const { workbook, session } = await service.buildSessionWorkbook(req.params.sessionId);

    const safeLocation = session.location.replace(/[^a-z0-9]+/gi, '_');
    const filename = `inventario_${safeLocation}_${session.id.slice(0, 8)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { exportExcel };