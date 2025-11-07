// content_script.js

let isFocusModeActive = false;
let feedbackElement;
let currentFocusedElement = null; 

// --- Função "Inteligente" (Artigo) ---
function findBestContentElement() {
  let bestElement = null;
  let maxScore = -1;
  const candidates = document.querySelectorAll('main, article, section, div');

  for (const element of candidates) {
    if (!element.offsetParent) continue;
    const paragraphs = element.querySelectorAll('p');
    let score = paragraphs.length;
    if (element.offsetHeight < 100 || element.offsetWidth < 200) score *= 0.5;
    const classOrId = (element.id + " " + element.className).toLowerCase();
    if (classOrId.includes('menu') || classOrId.includes('sidebar') || classOrId.includes('footer') || classOrId.includes('nav')) {
      score *= 0.1;
    }
    if (score > maxScore) {
      maxScore = score;
      bestElement = element;
    }
  }
  if (!bestElement) {
      bestElement = document.querySelector('main, article');
  }
  return bestElement;
}

// --- 4. Estrutura Semântica ---
function setupFeedbackRegion() {
  feedbackElement = document.createElement('div');
  feedbackElement.id = 'assistente-feedback-regiao';
  feedbackElement.setAttribute('aria-live', 'assertive');
  feedbackElement.setAttribute('role', 'status');
  feedbackElement.style.cssText = `
    position: absolute; width: 1px; height: 1px; margin: -1px; 
    overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;
  `;
  document.body.appendChild(feedbackElement);
}

// --- 2. Feedback Visual e Sonoro ---
function giveFeedback(message) {
  if (!feedbackElement) setupFeedbackRegion();
  feedbackElement.textContent = message;
  const visualToast = document.createElement('div');
  visualToast.textContent = message;
  visualToast.id = 'assistente-feedback-visual';
  document.body.appendChild(visualToast);
  setTimeout(() => {
    visualToast.remove();
  }, 3000);
}

// --- 1. Modo Leitura Focada ---
function toggleFocusMode() {
  isFocusModeActive = !isFocusModeActive;
  const html = document.documentElement;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  const isGoogleSearch = hostname.includes("google.com") && pathname.includes("/search");
  const isYouTube = hostname.includes("youtube.com");

  if (isFocusModeActive) {
    if (isGoogleSearch) {
      html.classList.add('assistente-google-focada');
      giveFeedback('Modo de leitura focado (Resultados) ativado.');
      currentFocusedElement = document.getElementById('rcnt');
    } else if (isYouTube) {
      html.classList.add('assistente-youtube-focada');
      giveFeedback('Modo de leitura focado (Vídeo) ativado.');
      currentFocusedElement = document.getElementById('player-container-outer');
    } else {
      currentFocusedElement = findBestContentElement();
      if (currentFocusedElement) {
        currentFocusedElement.classList.add('assistente-conteudo-principal');
        html.classList.add('assistente-leitura-focada-ativa');
        giveFeedback('Modo de leitura focado (Artigo) ativado.');
      } else {
        isFocusModeActive = false;
        giveFeedback('Não foi possível encontrar o conteúdo principal.');
      }
    }
    if (currentFocusedElement) {
      currentFocusedElement.setAttribute('tabindex', '-1');
      currentFocusedElement.focus();
    }
  } else {
    // --- Lógica de Desativação ---
    if (isGoogleSearch) html.classList.remove('assistente-google-focada');
    else if (isYouTube) html.classList.remove('assistente-youtube-focada');
    else {
      html.classList.remove('assistente-leitura-focada-ativa');
      if (currentFocusedElement) {
        currentFocusedElement.classList.remove('assistente-conteudo-principal');
      }
    }
    currentFocusedElement = null;
    giveFeedback('Modo de leitura focado desativado.');
  }
}

// --- 3. Controle Personalizável (ATUALIZADO) ---
function applySettings(settings) {
  const html = document.documentElement;
  
  // Tema
  html.setAttribute('data-assistente-theme', settings.theme || 'default');
  
  // Zoom
  document.body.style.zoom = (settings.fontSize || 100) + '%';

  // 👇 NOVAS REGRAS 👇
  // Espaçamento
  html.setAttribute('data-assistente-spacing', 
    settings.letterSpacing ? 'increased' : 'none'
  );
  
  // Maiúsculas
  html.setAttribute('data-assistente-transform', 
    settings.textTransform ? 'uppercase' : 'none'
  );
}

// --- Ouvintes (Listeners) (ATUALIZADO) ---

chrome.storage.onChanged.addListener((changes) => {
  // 👇 ATUALIZADO O GET 👇
  chrome.storage.sync.get([
    'theme', 'fontSize', 'letterSpacing', 'textTransform'
  ], (settings) => {
    applySettings(settings);
    // 👇 ATUALIZADO O IF 👇
    if (changes.fontSize || changes.theme || changes.letterSpacing || changes.textTransform) {
        giveFeedback('Configurações visuais atualizadas.');
    }
  });
});

// 👇 ATUALIZADO O GET 👇
chrome.storage.sync.get([
  'theme', 'fontSize', 'letterSpacing', 'textTransform'
], (settings) => {
  applySettings(settings);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleFocusMode") {
    toggleFocusMode();
    sendResponse({ success: true, status: isFocusModeActive });
  } 
  else if (request.action === "getFocusModeState") {
    sendResponse({ success: true, status: isFocusModeActive });
  }
  return true;
});