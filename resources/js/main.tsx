import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const mountElement = document.getElementById("root") ?? document.getElementById("app");
if (!mountElement) {
	// Fail gracefully with a helpful error for easier debugging in dev.
	// eslint-disable-next-line no-console
	console.error('React mount element not found. Add <div id="root"> or <div id="app"> to your layout.');
} else {
	createRoot(mountElement).render(<App />);
}
