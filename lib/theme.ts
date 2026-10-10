/**
 * Ставит тему до первой отрисовки, иначе светлая страница сначала мигнёт
 * тёмной. Выбор читателя — в localStorage, без него — как в системе.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('gl:theme');t=t?JSON.parse(t):(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;
