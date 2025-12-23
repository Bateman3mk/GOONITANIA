// main.js - GOONITANIA archive interactions (English)
(function(){
  'use strict';

  const STORAGE_KEY = 'goonitania_archives';

  function nouakchottTime() {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nouakchott', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return fmt.format(now);
    } catch (e) {
      return new Date().toUTCString();
    }
  }

  function updateTime() {
    const el = document.getElementById('local-time');
    if (!el) return;
    el.textContent = 'Local time (Nouakchott): ' + nouakchottTime();
  }

  function localGreeting() {
    const el = document.getElementById('local-greeting');
    if (!el) return;
    const hour = new Date().getUTCHours();
    let greeting = 'Welcome to GOONITANIA - Nouakchott';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    el.textContent = greeting + ' - Explore archival collections.';
  }

  function showToast(message) {
    if (!message) return;
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.style.display = 'block';
    setTimeout(()=> t.style.display = 'none', 3000);
  }

  function getEntries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function saveEntries(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function storeEntry(data) {
    const list = getEntries();
    list.push(data);
    saveEntries(list);
    return list;
  }

  function renderEntries() {
    const table = document.getElementById('archives-table');
    const noItems = document.getElementById('no-items');
    if (!table) return;
    const list = getEntries();
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
      if (noItems) noItems.style.display = 'block';
      table.style.display = 'none';
      return;
    }
    table.style.display = '';
    if (noItems) noItems.style.display = 'none';
    // Show entries in chronological order by item date (oldest first).
    const sorted = list.slice().sort((a,b) => {
      const aKey = a.date || a.createdAt || '';
      const bKey = b.date || b.createdAt || '';
      // compare as ISO dates when possible
      const aTime = isNaN(Date.parse(aKey)) ? aKey : Date.parse(aKey);
      const bTime = isNaN(Date.parse(bKey)) ? bKey : Date.parse(bKey);
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return 0;
    });
    sorted.forEach(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.createdAt;
      const tdTitle = document.createElement('td'); tdTitle.textContent = item.title || '';
      const tdDate = document.createElement('td'); tdDate.textContent = item.date || '';
      const tdCat = document.createElement('td'); tdCat.textContent = item.category || '';
      const tdContrib = document.createElement('td'); tdContrib.textContent = item.contributor || '';
      const tdAct = document.createElement('td');
      const del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'small-btn';
      del.addEventListener('click', () => deleteEntry(item.createdAt));
      tdAct.appendChild(del);
      tr.appendChild(tdTitle);
      tr.appendChild(tdDate);
      tr.appendChild(tdCat);
      tr.appendChild(tdContrib);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
  }

  function initSubmissionForm() {
    const form = document.getElementById('reservation-form');
    if (!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const title = form.querySelector('#title').value.trim();
      const contributor = form.querySelector('#contributor').value.trim();
      const date = form.querySelector('#date').value;
      const categoryEl = form.querySelector('#category');
      const category = categoryEl ? categoryEl.value : '';
      const description = form.querySelector('#description').value.trim();
      const fileEl = form.querySelector('#file');
      const filename = fileEl && fileEl.files && fileEl.files[0] ? fileEl.files[0].name : '';
      if (!title || !contributor || !date) { showToast('Please provide title, contributor and date.'); return; }
      const entry = { title, contributor, date, category, description, filename, createdAt: new Date().toISOString() };
      // Always save locally until a server is available
      storeEntry(entry);
      renderEntries();
      showToast('Archive submitted - Thank you');
      form.reset();
    });
  }

  function deleteEntry(id) {
    const list = getEntries();
    const filtered = list.filter(i => i.createdAt !== id);
    saveEntries(filtered);
    renderEntries();
    showToast('Item deleted');
  }

  function clearAll() {
    if (!confirm('Clear all local archive metadata? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderEntries();
    showToast('All items cleared');
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      showToast('Message sent - thank you.');
      form.reset();
    });
  }

  async function exportEntries() {
    // Export entries in chronological order (oldest first)
    const dataObj = getEntries().slice().sort((a,b) => {
      const aKey = a.date || a.createdAt || '';
      const bKey = b.date || b.createdAt || '';
      const aTime = isNaN(Date.parse(aKey)) ? aKey : Date.parse(aKey);
      const bTime = isNaN(Date.parse(bKey)) ? bKey : Date.parse(bKey);
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return 0;
    });
    const content = JSON.stringify(dataObj, null, 2);
    const filename = 'goonitania_archives.json';
    if (window.showSaveFilePicker) {
      try {
        const opts = [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }];
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: opts });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        showToast('File saved to your device.');
        return;
      } catch (err) {
        console.error('File save failed', err);
      }
    }
    const blob = new Blob([content], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Export downloaded.');
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateTime(); setInterval(updateTime, 1000);
    localGreeting();
    initSubmissionForm();
    initContactForm();
    renderEntries();
    const exportBtn = document.getElementById('export-btn'); if (exportBtn) exportBtn.addEventListener('click', exportEntries);
    const clearBtn = document.getElementById('clear-btn'); if (clearBtn) clearBtn.addEventListener('click', clearAll);
  });
})();
