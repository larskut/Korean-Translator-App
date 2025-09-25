const form = document.getElementById('translateForm');
const sentenceEl = document.getElementById('sentence');
const targetLangEl = document.getElementById('targetLang');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const fullEl = document.getElementById('fullTranslation');
const wordsEl = document.getElementById('words');
const submitBtn = document.getElementById('submitBtn');

const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

// Theme init
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  themeToggle.checked = true;
  themeLabel.textContent = 'Dark';
}

themeToggle.addEventListener('change', () => {
  const isDark = themeToggle.checked;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeLabel.textContent = isDark ? 'Dark' : 'Light';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sentence = sentenceEl.value.trim();
  const targetLang = targetLangEl.value;
  if (!sentence) return;

  resultsEl.classList.add('hidden');
  statusEl.textContent = 'Translating…';
  submitBtn.disabled = true;

  try {
    const res = await fetch(window.location.origin + '/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, targetLang })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    const data = await res.json();
    fullEl.textContent = data.fullTranslation || '';
    wordsEl.innerHTML = '';
    (data.words || []).forEach((w) => {
      const item = document.createElement('div');
      item.className = 'word-item';
      const korean = document.createElement('div');
      korean.className = 'korean';
      korean.textContent = w.word;
      const gloss = document.createElement('div');
      gloss.className = 'gloss';
      gloss.textContent = w.translation;
      item.appendChild(korean);
      item.appendChild(gloss);
      wordsEl.appendChild(item);
    });

    resultsEl.classList.remove('hidden');
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = err.message || 'Something went wrong';
  } finally {
    submitBtn.disabled = false;
  }
});


