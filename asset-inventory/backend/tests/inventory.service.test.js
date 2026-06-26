// Mockea ambos repositories para probar la logica de negocio pura,
// sin tocar la base de datos real.
jest.mock('../src/modules/inventory/inventory.repository');
jest.mock('../src/modules/assets/assets.repository');

const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const assetsRepo = require('../src/modules/assets/assets.repository');
const service = require('../src/modules/inventory/inventory.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createSession', () => {
  test('lanza 400 si falta algun campo requerido', async () => {
    await expect(service.createSession({ location: 'X' }))
      .rejects.toMatchObject({ status: 400 });
  });

  test('lanza 404 si el batch no existe', async () => {
    assetsRepo.findBatchById.mockResolvedValue(null);
    await expect(service.createSession({
      location: 'X', custodian: 'Y', upload_batch_id: 'abc',
    })).rejects.toMatchObject({ status: 404 });
  });

  test('lanza 409 si el batch no esta en estado done', async () => {
    assetsRepo.findBatchById.mockResolvedValue({ status: 'processing' });
    await expect(service.createSession({
      location: 'X', custodian: 'Y', upload_batch_id: 'abc',
    })).rejects.toMatchObject({ status: 409 });
  });

  test('crea la sesion si el batch existe y esta done', async () => {
    assetsRepo.findBatchById.mockResolvedValue({ status: 'done' });
    inventoryRepo.createSession.mockResolvedValue({ id: 'sess-1' });

    const result = await service.createSession({
      location: 'X', custodian: 'Y', upload_batch_id: 'abc',
    });
    expect(result.id).toBe('sess-1');
  });
});

describe('registerScan - sanitizacion', () => {
  test('hace trim al scanned_code antes de buscar (regresion del bug real)', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ id: 's1', status: 'active', upload_batch_id: 'b1', custodian: 'C', location: 'L' });
    inventoryRepo.findDuplicateScan.mockResolvedValue(null);
    assetsRepo.findByAssetNumberGlobal.mockResolvedValue(null);
    inventoryRepo.insertScan.mockResolvedValue({ id: 'scan-1', scan_type: 'external' });

    await service.registerScan('s1', '49823 '); // con espacio al final, como lo manda Quagga

    expect(assetsRepo.findByAssetNumberGlobal).toHaveBeenCalledWith('49823');
  });

  test('lanza 400 si scanned_code esta vacio', async () => {
    await expect(service.registerScan('s1', '')).rejects.toMatchObject({ status: 400 });
  });
});

describe('registerScan - clasificacion de pertenencia', () => {
  const baseSession = { id: 's1', status: 'active', upload_batch_id: 'b1', custodian: 'Ana', location: 'Edificio X' };

  test('codigo ya escaneado en la sesion -> duplicate, sin tocar trazabilidad', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    inventoryRepo.findDuplicateScan.mockResolvedValue({ id: 'dup-1' });
    inventoryRepo.insertScan.mockResolvedValue({ id: 'scan-1', scan_type: 'duplicate' });

    const result = await service.registerScan('s1', '111');

    expect(result.scan_type).toBe('duplicate');
    expect(assetsRepo.updateLastScan).not.toHaveBeenCalled();
  });

  test('codigo que no existe en ningun activo -> external/unknown, sin trazabilidad', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    inventoryRepo.findDuplicateScan.mockResolvedValue(null);
    assetsRepo.findByAssetNumberGlobal.mockResolvedValue(null);
    inventoryRepo.insertScan.mockResolvedValue({ id: 'scan-1', scan_type: 'external', external_reason: 'unknown' });

    const result = await service.registerScan('s1', '999');

    expect(result.scan_type).toBe('external');
    expect(inventoryRepo.insertScan).toHaveBeenCalledWith(
      expect.objectContaining({ scan_type: 'external', external_reason: 'unknown', asset_id: null })
    );
    expect(assetsRepo.updateLastScan).not.toHaveBeenCalled();
  });

  test('codigo que existe y functional_center menciona Alajuela -> located, con trazabilidad', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    inventoryRepo.findDuplicateScan.mockResolvedValue(null);
    assetsRepo.findByAssetNumberGlobal.mockResolvedValue({
      id: 'asset-1', functional_center: 'CENTRO ACADEMICO DE ALAJUELA',
    });
    inventoryRepo.insertScan.mockResolvedValue({ id: 'scan-1', scan_type: 'located', scanned_at: 'now' });
    assetsRepo.updateLastScan.mockResolvedValue({ id: 'asset-1', last_scanned_by: 'Ana' });

    const result = await service.registerScan('s1', '49823');

    expect(result.scan_type).toBe('located');
    expect(assetsRepo.updateLastScan).toHaveBeenCalledWith('asset-1', expect.objectContaining({
      custodian: 'Ana', location: 'Edificio X',
    }));
  });

  test('codigo que existe pero functional_center NO menciona Alajuela -> external/other_campus, CON trazabilidad', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    inventoryRepo.findDuplicateScan.mockResolvedValue(null);
    assetsRepo.findByAssetNumberGlobal.mockResolvedValue({
      id: 'asset-2', functional_center: 'ESCUELA DE MATEMATICA',
    });
    inventoryRepo.insertScan.mockResolvedValue({ id: 'scan-2', scan_type: 'external', external_reason: 'other_campus', scanned_at: 'now' });
    assetsRepo.updateLastScan.mockResolvedValue({ id: 'asset-2' });

    const result = await service.registerScan('s1', '89104');

    expect(result.scan_type).toBe('external');
    expect(inventoryRepo.insertScan).toHaveBeenCalledWith(
      expect.objectContaining({ scan_type: 'external', external_reason: 'other_campus' })
    );
    // este es el caso clave: external por otra sede SI actualiza trazabilidad
    expect(assetsRepo.updateLastScan).toHaveBeenCalled();
  });

  test('lanza 404 si la sesion no existe', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(null);
    await expect(service.registerScan('no-existe', '123'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('lanza 409 si la sesion esta cerrada', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ ...baseSession, status: 'closed' });
    await expect(service.registerScan('s1', '123'))
      .rejects.toMatchObject({ status: 409 });
  });
});

describe('closeSession', () => {
  test('lanza 404 si la sesion no existe', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(null);
    await expect(service.closeSession('no-existe'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('lanza 409 si ya estaba cerrada', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ status: 'closed' });
    await expect(service.closeSession('s1'))
      .rejects.toMatchObject({ status: 409 });
  });

  test('cierra correctamente una sesion activa', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ status: 'active' });
    inventoryRepo.closeSession.mockResolvedValue({ status: 'closed' });

    const result = await service.closeSession('s1');
    expect(result.status).toBe('closed');
  });
});