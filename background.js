// background.js

// 5. Comandos Alternativos
// Adicionamos 'async' para poder usar 'await' e 'try...catch'
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-focus-mode") {
    return;
  }

  // 1. Tenta encontrar a aba ativa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Verifica se a aba existe e se tem uma URL (necessário para enviar mensagem)
  if (tab && tab.id) {
    // 3. Tenta enviar a mensagem
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: "toggleFocusMode" 
      });
    } catch (e) {
      // 4. Se falhar (ex: página protegida), apenas avisa no console
      // e não deixa o erro "quebrar" a extensão.
      console.warn(
        "Não foi possível enviar mensagem para a aba. (Isso é normal em páginas protegidas como chrome://)",
        e.message
      );
    }
  }
});