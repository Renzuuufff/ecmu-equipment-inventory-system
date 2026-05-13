const DB_NAME = 'ecmu_equipment_inventory_db';
const DB_VERSION = 1;
const STORE_NAME = 'equipment';

let db;
let inventory = [];
let currentPhotoDataUrl = '';

const els = {
  btnAdd: document.getElementById('btnAdd'),
  btnPrint: document.getElementById('btnPrint'),
  btnSample: document.getElementById('btnSample'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnExportJson: document.getElementById('btnExportJson'),
  jsonImport: document.getElementById('jsonImport'),
  closeNotice: document.getElementById('closeNotice'),
  storageNotice: document.getElementById('storageNotice'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  inventoryBody: document.getElementById('inventoryBody'),
  recordCounter: document.getElementById('recordCounter'),
  equipmentDialog: document.getElementById('equipmentDialog'),
  equipmentForm: document.getElementById('equipmentForm'),
  formTitle: document.getElementById('formTitle'),
  btnCloseDialog: document.getElementById('btnCloseDialog'),
  btnCancel: document.getElementById('btnCancel'),
  recordId: document.getElementById('recordId'),
  equipmentCode: document.getElementById('equipmentCode'),
  equipmentName: document.getElementById('equipmentName'),
  category: document.getElementById('category'),
  brandModel: document.getElementById('brandModel'),
  serialNumber: document.getElementById('serialNumber'),
  propertyNumber: document.getElementById('propertyNumber'),
  projectSource: document.getElementById('projectSource'),
  acquisitionDate: document.getElementById('acquisitionDate'),
  location: document.getElementById('location'),
  custodian: document.getElementById('custodian'),
  status: document.getElementById('status'),
  lastPmDate: document.getElementById('lastPmDate'),
  nextPmDate: document.getElementById('nextPmDate'),
  description: document.getElementById('description'),
  remarks: document.getElementById('remarks'),
  photoInput: document.getElementById('photoInput'),
  photoPreview: document.getElementById('photoPreview'),
  btnRemovePhoto: document.getElementById('btnRemovePhoto'),
  duplicateWarning: document.getElementById('duplicateWarning'),
  imageDialog: document.getElementById('imageDialog'),
  largeImage: document.getElementById('largeImage'),
  btnCloseImage: document.getElementById('btnCloseImage'),
  statTotal: document.getElementById('statTotal'),
  statOperational: document.getElementById('statOperational'),
  statRepair: document.getElementById('statRepair'),
  statRetired: document.getElementById('statRetired')
};

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('serialNumber', 'serialNumber', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = 'readonly') {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function getAllRecords() {
  return new Promise((resolve, reject) => {
    const request = tx().getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(record) {
  return new Promise((resolve, reject) => {
    const request = tx('readwrite').put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(id) {
  return new Promise((resolve, reject) => {
    const request = tx('readwrite').delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearRecords() {
  return new Promise((resolve, reject) => {
    const request = tx('readwrite').clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadInventory() {
  inventory = await getAllRecords();
  inventory.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  render();
}

function normalize(value) {
  return String(value || '').trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function escapeHtml(value) {
  return normalize(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function getFilteredRecords() {
  const q = lower(els.searchInput.value);
  const category = lower(els.categoryFilter.value);
  const status = lower(els.statusFilter.value);

  return inventory.filter((item) => {
    const haystack = [
      item.equipmentCode,
      item.equipmentName,
      item.category,
      item.brandModel,
      item.serialNumber,
      item.propertyNumber,
      item.projectSource,
      item.location,
      item.custodian,
      item.status,
      item.description,
      item.remarks
    ].map(lower).join(' ');

    const matchesSearch = !q || haystack.includes(q);
    const matchesCategory = !category || lower(item.category) === category;
    const matchesStatus = !status || lower(item.status) === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function statusClass(status) {
  const s = lower(status);
  if (s.includes('standby')) return 'standby';
  if (s.includes('repair')) return 'repair';
  if (s.includes('calibration')) return 'calibration';
  if (s.includes('missing')) return 'missing';
  if (s.includes('retired')) return 'retired';
  return 'operational';
}

function renderStats(records) {
  els.statTotal.textContent = inventory.length;
  els.statOperational.textContent = inventory.filter((x) => lower(x.status) === 'operational').length;
  els.statRepair.textContent = inventory.filter((x) => ['for repair', 'for calibration'].includes(lower(x.status))).length;
  els.statRetired.textContent = inventory.filter((x) => ['retired', 'missing'].includes(lower(x.status))).length;
  els.recordCounter.textContent = `Showing ${records.length} of ${inventory.length} record(s)`;
}

function renderCategoryFilter() {
  const current = els.categoryFilter.value;
  const categories = [...new Set(inventory.map((x) => normalize(x.category)).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = '<option value="">All categories</option>' + categories.map((cat) => `<option>${escapeHtml(cat)}</option>`).join('');
  els.categoryFilter.value = categories.includes(current) ? current : '';
}

function renderTable(records) {
  if (!records.length) {
    els.inventoryBody.innerHTML = '<tr><td colspan="7" class="empty-state">No matching inventory records found.</td></tr>';
    return;
  }

  els.inventoryBody.innerHTML = records.map((item) => {
    const photo = item.photoDataUrl
      ? `<img class="table-photo" src="${item.photoDataUrl}" alt="${escapeHtml(item.equipmentName)}" data-view-image="${item.id}" />`
      : '<div class="photo-placeholder">No photo</div>';

    return `
      <tr>
        <td>${photo}</td>
        <td>
          <div class="equipment-name">${escapeHtml(item.equipmentName)}</div>
          <div class="equipment-meta">
            ${escapeHtml(item.equipmentCode || 'No equipment code')} • ${escapeHtml(item.category || 'Uncategorized')}<br>
            ${escapeHtml(item.brandModel || 'No brand/model')}<br>
            <strong>Description:</strong> ${escapeHtml(item.description || '')}
          </div>
        </td>
        <td class="project-text">${escapeHtml(item.projectSource || '')}</td>
        <td>
          <strong>${escapeHtml(item.serialNumber || '')}</strong><br>
          <span class="equipment-meta">Property: ${escapeHtml(item.propertyNumber || 'N/A')}</span>
        </td>
        <td>
          ${escapeHtml(item.location || '')}<br>
          <span class="equipment-meta">Custodian: ${escapeHtml(item.custodian || 'N/A')}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status || '')}</span><br>
          <span class="equipment-meta">Last PM: ${escapeHtml(formatDate(item.lastPmDate) || 'N/A')}</span><br>
          <span class="equipment-meta">Next PM: ${escapeHtml(formatDate(item.nextPmDate) || 'N/A')}</span>
        </td>
        <td class="no-print">
          <div class="row-actions">
            <button class="action-link" data-edit="${item.id}">Edit</button>
            <button class="action-link" data-duplicate="${item.id}">Duplicate</button>
            <button class="action-link delete" data-delete="${item.id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function render() {
  const records = getFilteredRecords();
  renderStats(records);
  renderCategoryFilter();
  renderTable(records);
}

function resetForm() {
  els.equipmentForm.reset();
  els.recordId.value = '';
  currentPhotoDataUrl = '';
  els.photoPreview.removeAttribute('src');
  els.photoPreview.style.display = 'none';
  els.duplicateWarning.hidden = true;
  els.duplicateWarning.textContent = '';
  els.status.value = 'Operational';
}

function openForm(record = null) {
  resetForm();
  if (record) {
    els.formTitle.textContent = 'Edit Equipment';
    els.recordId.value = record.id;
    els.equipmentCode.value = record.equipmentCode || '';
    els.equipmentName.value = record.equipmentName || '';
    els.category.value = record.category || '';
    els.brandModel.value = record.brandModel || '';
    els.serialNumber.value = record.serialNumber || '';
    els.propertyNumber.value = record.propertyNumber || '';
    els.projectSource.value = record.projectSource || '';
    els.acquisitionDate.value = record.acquisitionDate || '';
    els.location.value = record.location || '';
    els.custodian.value = record.custodian || '';
    els.status.value = record.status || 'Operational';
    els.lastPmDate.value = record.lastPmDate || '';
    els.nextPmDate.value = record.nextPmDate || '';
    els.description.value = record.description || '';
    els.remarks.value = record.remarks || '';
    currentPhotoDataUrl = record.photoDataUrl || '';
    if (currentPhotoDataUrl) {
      els.photoPreview.src = currentPhotoDataUrl;
      els.photoPreview.style.display = 'block';
    }
  } else {
    els.formTitle.textContent = 'Add Equipment';
  }
  els.equipmentDialog.showModal();
  setTimeout(() => els.equipmentName.focus(), 100);
}

function getFormRecord() {
  const now = new Date().toISOString();
  const id = els.recordId.value || crypto.randomUUID();
  const existing = inventory.find((x) => x.id === id);
  return {
    id,
    equipmentCode: normalize(els.equipmentCode.value),
    equipmentName: normalize(els.equipmentName.value),
    category: normalize(els.category.value),
    brandModel: normalize(els.brandModel.value),
    serialNumber: normalize(els.serialNumber.value),
    propertyNumber: normalize(els.propertyNumber.value),
    projectSource: normalize(els.projectSource.value),
    acquisitionDate: els.acquisitionDate.value,
    location: normalize(els.location.value),
    custodian: normalize(els.custodian.value),
    status: els.status.value,
    lastPmDate: els.lastPmDate.value,
    nextPmDate: els.nextPmDate.value,
    description: normalize(els.description.value),
    remarks: normalize(els.remarks.value),
    photoDataUrl: currentPhotoDataUrl,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function checkDuplicateSerial() {
  const serial = lower(els.serialNumber.value);
  const currentId = els.recordId.value;
  if (!serial) {
    els.duplicateWarning.hidden = true;
    return false;
  }
  const duplicate = inventory.find((x) => lower(x.serialNumber) === serial && x.id !== currentId);
  if (duplicate) {
    els.duplicateWarning.hidden = false;
    els.duplicateWarning.textContent = `Warning: Serial number already exists for “${duplicate.equipmentName}”. Verify before saving.`;
    return true;
  }
  els.duplicateWarning.hidden = true;
  return false;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!els.equipmentForm.reportValidity()) return;
  const record = getFormRecord();
  await putRecord(record);
  els.equipmentDialog.close();
  await loadInventory();
}

function compressImage(file, maxSize = 1100, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoChange() {
  const file = els.photoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }
  currentPhotoDataUrl = await compressImage(file);
  els.photoPreview.src = currentPhotoDataUrl;
  els.photoPreview.style.display = 'block';
}

function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const headers = [
    'Equipment ID/Code', 'Equipment Name', 'Category', 'Brand/Model', 'Serial Number', 'Property Number',
    'Project Source', 'Acquisition Date', 'Location/Station', 'Custodian', 'Status', 'Last PM Date',
    'Next PM Date', 'Description', 'Remarks', 'Has Photo', 'Created At', 'Updated At'
  ];
  const rows = inventory.map((item) => [
    item.equipmentCode, item.equipmentName, item.category, item.brandModel, item.serialNumber, item.propertyNumber,
    item.projectSource, item.acquisitionDate, item.location, item.custodian, item.status, item.lastPmDate,
    item.nextPmDate, item.description, item.remarks, item.photoDataUrl ? 'YES' : 'NO', item.createdAt, item.updatedAt
  ]);
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
  download(`ECMU_Equipment_Inventory_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportJson() {
  const payload = {
    app: 'ECMU Equipment Inventory System',
    exportedAt: new Date().toISOString(),
    recordCount: inventory.length,
    records: inventory
  };
  download(`ECMU_Equipment_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed) ? parsed : parsed.records;
    if (!Array.isArray(records)) throw new Error('Invalid backup file.');
    const confirmImport = confirm(`Import ${records.length} record(s)? Existing records with the same ID will be updated.`);
    if (!confirmImport) return;
    for (const record of records) {
      if (!record.id) record.id = crypto.randomUUID();
      record.updatedAt = record.updatedAt || new Date().toISOString();
      await putRecord(record);
    }
    await loadInventory();
    alert('Import completed.');
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

function sampleRecords() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      equipmentCode: 'ECMU-CCTV-001',
      equipmentName: 'Outdoor PTZ Camera',
      category: 'CCTV',
      brandModel: '8MP PTZ, 40x Optical Zoom',
      serialNumber: 'SAMPLE-PTZ-0001',
      propertyNumber: 'For assignment',
      projectSource: 'Supply, Delivery, Installation, Testing and Commissioning of CCTV Cameras and Fiber Optic Communication Upgrade',
      acquisitionDate: '',
      location: 'Magat Spillway / Korokan Fault Area',
      custodian: 'ECMU',
      status: 'Operational',
      lastPmDate: '',
      nextPmDate: '',
      description: 'Outdoor network PTZ camera intended for critical infrastructure surveillance and remote monitoring.',
      remarks: 'Sample record only. Replace with actual property details and equipment photo.',
      photoDataUrl: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      equipmentCode: 'ECMU-RG-001',
      equipmentName: 'Tipping Bucket Rain Gauge',
      category: 'Rain Gauge',
      brandModel: '0.2 mm/tip rain gauge',
      serialNumber: 'SAMPLE-RG-0001',
      propertyNumber: 'For assignment',
      projectSource: 'Hydrometeorological Monitoring Station Equipment Project',
      acquisitionDate: '',
      location: 'Halong RG Station',
      custodian: 'ECMU',
      status: 'For Calibration',
      lastPmDate: '',
      nextPmDate: '',
      description: 'Rainfall sensor used for automated rainfall measurement and telemetry reporting.',
      remarks: 'Sample record only. Update with actual serial number and calibration status.',
      photoDataUrl: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      equipmentCode: 'ECMU-VHF-001',
      equipmentName: 'VHF Base Radio',
      category: 'VHF Radio',
      brandModel: 'Base transceiver with antenna system',
      serialNumber: 'SAMPLE-VHF-0001',
      propertyNumber: 'For assignment',
      projectSource: 'Communication Equipment Upgrade Project',
      acquisitionDate: '',
      location: 'FFIS Command Center',
      custodian: 'ECMU',
      status: 'Standby',
      lastPmDate: '',
      nextPmDate: '',
      description: 'Base radio equipment for field communication support during monitoring and emergency operations.',
      remarks: 'Sample record only. Replace with actual equipment data.',
      photoDataUrl: '',
      createdAt: now,
      updatedAt: now
    }
  ];
}

async function loadSampleRecords() {
  if (inventory.length && !confirm('Add sample records to the current inventory?')) return;
  for (const record of sampleRecords()) await putRecord(record);
  await loadInventory();
}

async function handleTableClick(event) {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const duplicateId = event.target.dataset.duplicate;
  const viewImageId = event.target.dataset.viewImage;

  if (editId) {
    const record = inventory.find((x) => x.id === editId);
    if (record) openForm(record);
  }

  if (duplicateId) {
    const record = inventory.find((x) => x.id === duplicateId);
    if (record) {
      const copy = { ...record, id: crypto.randomUUID(), equipmentCode: `${record.equipmentCode || 'COPY'}-COPY`, serialNumber: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      openForm(copy);
      els.recordId.value = '';
      els.formTitle.textContent = 'Duplicate Equipment';
    }
  }

  if (deleteId) {
    const record = inventory.find((x) => x.id === deleteId);
    if (record && confirm(`Delete “${record.equipmentName}”? This cannot be undone unless you have a backup JSON.`)) {
      await deleteRecord(deleteId);
      await loadInventory();
    }
  }

  if (viewImageId) {
    const record = inventory.find((x) => x.id === viewImageId);
    if (record?.photoDataUrl) {
      els.largeImage.src = record.photoDataUrl;
      els.imageDialog.showModal();
    }
  }
}

function closeDialog() {
  els.equipmentDialog.close();
}

function bindEvents() {
  els.btnAdd.addEventListener('click', () => openForm());
  els.btnPrint.addEventListener('click', () => window.print());
  els.btnSample.addEventListener('click', loadSampleRecords);
  els.btnExportCsv.addEventListener('click', exportCsv);
  els.btnExportJson.addEventListener('click', exportJson);
  els.jsonImport.addEventListener('change', importJson);
  els.searchInput.addEventListener('input', render);
  els.categoryFilter.addEventListener('change', render);
  els.statusFilter.addEventListener('change', render);
  els.inventoryBody.addEventListener('click', handleTableClick);
  els.equipmentForm.addEventListener('submit', handleSubmit);
  els.btnCloseDialog.addEventListener('click', closeDialog);
  els.btnCancel.addEventListener('click', closeDialog);
  els.photoInput.addEventListener('change', handlePhotoChange);
  els.serialNumber.addEventListener('input', checkDuplicateSerial);
  els.btnRemovePhoto.addEventListener('click', () => {
    currentPhotoDataUrl = '';
    els.photoInput.value = '';
    els.photoPreview.removeAttribute('src');
    els.photoPreview.style.display = 'none';
  });
  els.btnCloseImage.addEventListener('click', () => els.imageDialog.close());
  els.closeNotice.addEventListener('click', () => {
    els.storageNotice.style.display = 'none';
    localStorage.setItem('ecmu_inventory_notice_closed', '1');
  });
  if (localStorage.getItem('ecmu_inventory_notice_closed') === '1') {
    els.storageNotice.style.display = 'none';
  }
}

async function init() {
  try {
    db = await openDb();
    bindEvents();
    await loadInventory();
  } catch (error) {
    console.error(error);
    alert('Unable to open the local inventory database. Please use a modern browser and avoid private/incognito mode.');
  }
}

init();
