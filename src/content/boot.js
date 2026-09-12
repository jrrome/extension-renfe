// los content scripts declarados en el manifest no admiten imports de modulo,
// asi que este arranque minimo carga el resto como modulo real
(async () => {
  try {
    await import(chrome.runtime.getURL("src/content/index.js"));
  } catch (e) {
    console.error("[bot renfe] no se pudo cargar la extension:", e);
  }
})();
