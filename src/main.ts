import "./style.css";

async function start() {
  try {
    const { startGame } = await import("./game");
    await startGame();
  } catch (error) {
    console.error("Unable to start the expedition.", error);
    document.querySelector<HTMLElement>("#load-status")!.textContent =
      "The scene could not load. Please reload in a recent browser with WebGL enabled.";
    const start = document.querySelector<HTMLButtonElement>("#start")!;
    start.disabled = false;
    start.textContent = "Reload expedition";
    start.onclick = () => location.reload();
  }
}

void start();
