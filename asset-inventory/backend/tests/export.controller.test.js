jest.mock('../src/modules/export/export.service');

const express = require('express');
const request = require('supertest');
const ExcelJS = require('exceljs');
const service = require('../src/modules/export/export.service');
const controller = require('../src/modules/export/export.controller');

const app = express();
app.get('/api/export/:sessionId/excel', controller.exportExcel);
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: true, message: err.message });
});

describe('GET /api/export/:sessionId/excel', () => {
  test('responde con Content-Type de Excel correcto', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Resumen');
    service.buildSessionWorkbook.mockResolvedValue({
      workbook,
      session: { id: 's1', location: 'Edificio Central', closed_at: new Date() },
    });

    const res = await request(app).get('/api/export/s1/excel');
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
  });

  test('el filename sanitiza caracteres especiales de la ubicacion', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Resumen');
    service.buildSessionWorkbook.mockResolvedValue({
      workbook,
      session: { id: 's1', location: 'Edificio Á / B!', closed_at: new Date() },
    });

    const res = await request(app).get('/api/export/s1/excel');
    expect(res.headers['content-disposition']).not.toMatch(/[/!]/);
  });
});