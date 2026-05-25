// Memoria Rápida · Guarda solo texto, no audios.
// Usa dictado por voz cuando el navegador lo permite y guarda las notas en localStorage.

const recordBtn = document.getElementById('recordBtn');
const recordText = document.getElementById('recordText');
const statusIndicator = document.getElementById('statusIndicator');
const searchInput = document.getElementById('searchInput');
const notesContainer = document.getElementById('notesContainer');
const noResults = document.getElementById('noResults');
const emptyState = document.getElementById('emptyState');
const notesCount = document.getElementById('notesCount');
const manualNote = document.getElementById('manualNote');
const saveManualBtn = document.getElementById('saveManualBtn');

const STORAGE_KEY = 'memoria_rapida_notas_v1';
const OLD_STORAGE_KEY = 'mis_notas_voz';

let savedNotes = loadNotes();
let recognition = null;
let isRecording = false;

renderAllNotes();
setupSpeechRecognition();

recordBtn.addEventListener('click', () => {
  if (!recognition) return;

  if (isRecording) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (error) {
      statusIndicator.textContent = 'Espera un momento y vuelve a tocar el botón.';
    }
  }
});

saveManualBtn.addEventListener('click', () => {
  const text = manualNote.value.trim();

  if (!text) {
    statusIndicator.textContent = 'Escribe una nota antes de guardarla.';
    manualNote.focus();
    return;
  }

  saveNote(text);
  manualNote.value = '';
  statusIndicator.textContent = 'Nota escrita guardada.';
});

manualNote.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    saveManualBtn.click();
  }
});

searchInput.addEventListener('input', renderAllNotes);

notesContainer.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('[data-action="delete-note"]');
  if (!deleteBtn) return;

  const noteId = deleteBtn.dataset.id;
  const note = savedNotes.find(item => item.id === noteId);
  if (!note) return;

  const shouldDelete = confirm('¿Borrar esta nota?');
  if (!shouldDelete) return;

  savedNotes = savedNotes.filter(item => item.id !== noteId);
  persistNotes();
  renderAllNotes();
  statusIndicator.textContent = 'Nota borrada.';
});

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    statusIndicator.textContent = 'Tu navegador no soporta dictado directo. Puedes escribir la nota manualmente.';
    recordBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'es-PE';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecording = true;
    recordBtn.classList.add('recording');
    recordText.textContent = 'Escuchando...';
    statusIndicator.textContent = 'Habla ahora. Solo guardaré el texto.';
  };

  recognition.onend = () => {
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordText.textContent = 'Toca para dictar';
  };

  recognition.onresult = (event) => {
    const textResult = event.results?.[0]?.[0]?.transcript?.trim() || '';

    if (textResult) {
      saveNote(textResult);
      statusIndicator.textContent = 'Nota dictada guardada.';
    } else {
      statusIndicator.textContent = 'No logré escuchar nada. Intenta de nuevo.';
    }
  };

  recognition.onerror = (event) => {
    console.error('Error de reconocimiento:', event.error);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      statusIndicator.textContent = 'Permite el uso del micrófono para poder dictar.';
    } else if (event.error === 'no-speech') {
      statusIndicator.textContent = 'No detecté voz. Intenta hablar un poco más cerca.';
    } else {
      statusIndicator.textContent = 'Hubo un problema con el dictado. Puedes escribir la nota manualmente.';
    }
  };
}

function loadNotes() {
  const currentNotes = safeParse(localStorage.getItem(STORAGE_KEY));
  if (Array.isArray(currentNotes)) {
    return normalizeNotes(currentNotes);
  }

  // Migración suave desde la primera versión creada por Gemini.
  const oldNotes = safeParse(localStorage.getItem(OLD_STORAGE_KEY));
  if (Array.isArray(oldNotes) && oldNotes.length > 0) {
    const migratedNotes = normalizeNotes(oldNotes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedNotes));
    return migratedNotes;
  }

  return [];
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeNotes(notes) {
  return notes
    .filter(note => note && typeof note.text === 'string' && note.text.trim())
    .map((note, index) => ({
      id: note.id || `note-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      text: note.text.trim(),
      date: note.date || formatDate(new Date()),
      createdAt: note.createdAt || new Date().toISOString(),
    }));
}

function saveNote(text) {
  const now = new Date();
  const note = {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    date: formatDate(now),
    createdAt: now.toISOString(),
  };

  savedNotes.unshift(note);
  persistNotes();
  searchInput.value = '';
  renderAllNotes();
}

function persistNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedNotes));
}

function renderAllNotes() {
  const query = searchInput.value.trim();
  const normalizedQuery = normalizeText(query);
  const filteredNotes = normalizedQuery
    ? savedNotes.filter(note => normalizeText(note.text).includes(normalizedQuery))
    : savedNotes;

  notesContainer.innerHTML = '';

  filteredNotes.forEach(note => {
    notesContainer.appendChild(createNoteCard(note));
  });

  updateEmptyStates(filteredNotes.length, query);
  updateNotesCount();
}

function createNoteCard(note) {
  const article = document.createElement('article');
  article.className = 'note-card';
  article.dataset.id = note.id;

  const meta = document.createElement('div');
  meta.className = 'note-meta';

  const date = document.createElement('span');
  date.className = 'note-date';
  date.textContent = note.date;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-delete';
  deleteButton.dataset.action = 'delete-note';
  deleteButton.dataset.id = note.id;
  deleteButton.textContent = 'Borrar';
  deleteButton.setAttribute('aria-label', `Borrar nota: ${note.text}`);

  const text = document.createElement('p');
  text.className = 'note-text';
  text.textContent = note.text;

  meta.append(date, deleteButton);
  article.append(meta, text);

  return article;
}

function updateEmptyStates(filteredCount, query) {
  const hasNotes = savedNotes.length > 0;
  const hasQuery = query.trim() !== '';

  emptyState.classList.toggle('fp-hidden', hasNotes);
  noResults.classList.toggle('fp-hidden', !hasNotes || !hasQuery || filteredCount > 0);
}

function updateNotesCount() {
  const count = savedNotes.length;
  notesCount.textContent = count === 1 ? '1 nota' : `${count} notas`;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDate(date) {
  const dayLabel = date.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeLabel = date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dayLabel}, ${timeLabel}`;
}
