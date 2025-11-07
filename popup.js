// popup.js

// --- 1. Seletores dos Elementos ---
const themeRadios = document.querySelectorAll('input[name="theme"]');
const fontSizeSlider = document.getElementById('font-size');
const focusToggle = document.getElementById('focus-toggle');
const letterSpacingToggle = document.getElementById('letter-spacing-toggle');
const textTransformToggle = document.getElementById('text-transform-toggle');
const fontWeightToggle = document.getElementById('font-weight-toggle'); // ADICIONADO

const fontSizeValue = document.getElementById('font-size-value');

// --- 2. Funções de Comunicação ---
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getTabState(tab) {
  if (!tab.url || (!tab.url.startsWith('http') && !tab.url.startsWith('file'))) {
    throw new Error('Página inválida');
  }
  return await chrome.tabs.sendMessage(tab.id, { action: "getFocusModeState" });
}

function sendToggleCommand(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "toggleFocusMode" });
}

// --- 3. Lógica de Carregamento do Popup ---
async function loadPopupState() {
  // ADICIONADO 'fontWeight'
  const settings = await chrome.storage.sync.get([
    'theme', 'fontSize', 'letterSpacing', 'textTransform', 'fontWeight'
  ]);
  
  // Tema e Fonte
  const theme = settings.theme || 'default';
  document.getElementById(`theme-${theme}`).checked = true;
  const fontSize = settings.fontSize || 100;
  fontSizeSlider.value = fontSize;
  fontSizeValue.textContent = fontSize + '%';

  // Toggles de Fonte
  letterSpacingToggle.checked = settings.letterSpacing || false;
  textTransformToggle.checked = settings.textTransform || false;
  fontWeightToggle.checked = settings.fontWeight || false; // ADICIONADO

  // Estado do Modo Focado
  try {
    const tab = await getActiveTab();
    const response = await getTabState(tab);
    if (response && response.success) {
      focusToggle.checked = response.status;
    }
  } catch (e) {
    console.warn("Não foi possível carregar o estado do Modo Focado:", e.message);
    focusToggle.disabled = true;
  }
}

// --- 4. Event Listeners ---
themeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    chrome.storage.sync.set({ theme: e.target.value });
  });
});

fontSizeSlider.addEventListener('input', (e) => {
  fontSizeValue.textContent = e.target.value + '%';
});
fontSizeSlider.addEventListener('change', (e) => {
  chrome.storage.sync.set({ fontSize: e.target.value });
});

focusToggle.addEventListener('change', async () => {
  try {
    const tab = await getActiveTab();
    sendToggleCommand(tab.id);
  } catch (e) {
    console.error("Não foi possível alternar o Modo Focado:", e.message);
  }
});

letterSpacingToggle.addEventListener('change', (e) => {
  chrome.storage.sync.set({ letterSpacing: e.target.checked });
});

textTransformToggle.addEventListener('change', (e) => {
  chrome.storage.sync.set({ textTransform: e.target.checked });
});

// ADICIONADO
fontWeightToggle.addEventListener('change', (e) => {
  chrome.storage.sync.set({ fontWeight: e.target.checked });
});

// Inicia tudo
document.addEventListener('DOMContentLoaded', loadPopupState);