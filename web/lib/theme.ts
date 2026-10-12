export const THEME_STORAGE_KEY = "kinetic-theme";

/** Runs before paint so a saved dark choice never flashes light. */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
