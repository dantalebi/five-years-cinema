// The full plan page reads the plan cached by the main page; without it, back to the main page.
window.D = (() => { try { return JSON.parse(localStorage.getItem('fy-plan') || 'null'); } catch (e) { return null; } })();
if (!window.D) location.replace('./');
