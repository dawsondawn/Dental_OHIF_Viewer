import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.DENTAL_BACKEND_PORT || process.env.PORT || '4010', 10);
const HOST = process.env.DENTAL_BACKEND_HOST || '127.0.0.1';
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'measurements.json');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, 'utf-8');
  } catch {
    await writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function readRecords() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, 'utf-8');

  if (!raw.trim()) {
    await writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    await writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  } catch {
    await writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }
}

async function writeRecords(records) {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

function json(res, statusCode, body) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

const server = createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (method === 'GET' && url.pathname === '/health') {
      json(res, 200, { status: 'ok' });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/dental-measurements') {
      const records = await readRecords();
      json(res, 200, { total: records.length, records });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/dental-measurements/latest') {
      const records = await readRecords();
      const latest = records[records.length - 1] || null;
      json(res, 200, { record: latest });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/dental-measurements') {
      const payload = await readJsonBody(req);
      const measurements = payload?.measurements;

      if (!Array.isArray(measurements) || measurements.length === 0) {
        json(res, 400, {
          error: 'measurements must be a non-empty array',
        });
        return;
      }

      const records = await readRecords();
      const record = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        source: payload?.source || 'dental-panel',
        measurementCount: measurements.length,
        measurements,
      };

      records.push(record);
      await writeRecords(records);

      json(res, 201, { record });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, {
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'unknown',
    });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Dental measurements backend listening on http://${HOST}:${PORT}`);
});
