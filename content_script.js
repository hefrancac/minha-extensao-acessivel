// content_script.js

// --- Execução Imediata (document_start) ---
new MutationObserver((mutations, obs) => {
  if (document.documentElement) {
    if (window.location.hostname.includes("youtube.com")) {
      document.documentElement.setAttribute('data-is-youtube', 'true');
    }
    obs.disconnect(); 
  }
}).observe(document, { childList: true, subtree: true });


// O resto do código precisa esperar o DOM carregar
document.addEventListener('DOMContentLoaded', () => {

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
    const html = document.documentElement;
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const isGoogleSearch = hostname.includes("google.com") && pathname.includes("/search");
    const isYouTubeWatch = hostname.includes("youtube.com") && pathname.includes("/watch");
    const isYouTubeAny = hostname.includes("youtube.com");

    if (isFocusModeActive) {
      isFocusModeActive = false; 
      
      if (isGoogleSearch) html.classList.remove('assistente-google-focada');
      else if (isYouTubeWatch) html.classList.remove('assistente-youtube-focada');
      else {
        const readabilityOverlay = document.getElementById('assistente-readability-overlay');
        if (readabilityOverlay) readabilityOverlay.remove();
        html.classList.remove('assistente-leitura-focada-ativa');
      }
      
      if (currentFocusedElement) {
        currentFocusedElement.classList.remove('assistente-conteudo-principal');
        currentFocusedElement = null;
      }
      giveFeedback('Modo de leitura focado desativado.');
      return;
    }
    
    isFocusModeActive = true; 

    if (isGoogleSearch) {
      html.classList.add('assistente-google-focada');
      giveFeedback('Modo de leitura focado (Resultados) ativado.');
    
    } else if (isYouTubeWatch) {
      html.classList.add('assistente-youtube-focada');
      giveFeedback('Modo de leitura focado (Vídeo) ativado.');
    
    } else if (isYouTubeAny) {
      isFocusModeActive = false;
      giveFeedback('Modo focado só é compatível em páginas de vídeo (YouTube).');
      return; 

    } else {
      const documentClone = document.cloneNode(true);
      const article = new Readability(documentClone).parse();

      if (article && article.content) {
        html.classList.add('assistente-leitura-focada-ativa');
        const overlay = document.createElement('div');
        overlay.id = 'assistente-readability-overlay';
        overlay.innerHTML = `
          <div class="readability-container">
            <h1>${article.title}</h1>
            <p class="readability-byline">${article.byline || ''}</p>
            <div class="readability-content">${article.content}</div>
          </div>
        `;
        document.body.appendChild(overlay);
        giveFeedback('Modo de leitura focado (Artigo) ativado.');
        
      } else {
        isFocusModeActive = false;
        giveFeedback('Modo focado não encontrou um artigo nesta página.');
        return;
      }
    }
    
    if (currentFocusedElement) {
      currentFocusedElement.setAttribute('tabindex', '-1');
      currentFocusedElement.focus();
    }
  }

  // --- 3. Controle Personalizável ---
  function applySettings(settings) {
    const html = document.documentElement;
    const isYouTube = html.hasAttribute('data-is-youtube');

    const theme = settings.theme || 'default';
    
    html.removeAttribute('data-assistente-theme');
    html.removeAttribute('dark');

    if (isYouTube) {
      if (theme === 'dark') {
        html.setAttribute('dark', 'true');
      }
    } else {
      if (theme === 'dark' || theme === 'sepia') {
        html.setAttribute('data-assistente-theme', theme);
      }
    }
    
    document.body.style.zoom = (settings.fontSize || 100) + '%';
    
    html.setAttribute('data-assistente-spacing', 
      settings.letterSpacing ? 'increased' : 'none'
    );
    
    html.setAttribute('data-assistente-transform', 
      settings.textTransform ? 'uppercase' : 'none'
    );

    // ADICIONADO
    html.setAttribute('data-assistente-weight', 
      settings.fontWeight ? 'bold' : 'normal'
    );
  }

  // --- Ouvintes (Listeners) ---

  chrome.storage.onChanged.addListener((changes) => {
    // ADICIONADO 'fontWeight'
    chrome.storage.sync.get([
      'theme', 'fontSize', 'letterSpacing', 'textTransform', 'fontWeight'
    ], (settings) => {
      applySettings(settings);
      // ADICIONADO 'changes.fontWeight'
      if (changes.fontSize || changes.theme || changes.letterSpacing || changes.textTransform || changes.fontWeight) {
          giveFeedback('Configurações visuais atualizadas.');
      }
    });
  });

  // ADICIONADO 'fontWeight'
  chrome.storage.sync.get([
    'theme', 'fontSize', 'letterSpacing', 'textTransform', 'fontWeight'
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

}); // Fim do 'DOMContentLoaded'