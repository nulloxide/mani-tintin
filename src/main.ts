import './style.css';

const status = document.querySelector<HTMLParagraphElement>('#mission-status')!;
const land = document.querySelector<HTMLButtonElement>('#land')!;

async function start() {
  try {
    const { createMoonScene } = await import('./moon');
    await createMoonScene();
  } catch (error) {
    console.error('Unable to start the Moon scene.', error);
    status.textContent = 'The 3D scene could not load. Try refreshing in an up-to-date Safari, Chrome, Edge, or Firefox browser with graphics acceleration enabled.';
    if (import.meta.env.DEV) status.textContent += ` ${String(error)}`;
    status.classList.add('error');
    land.textContent = 'Reload preview';
    land.disabled = false;
    land.onclick = () => window.location.reload();
  }
}

void start();
