import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDomMutationGuard } from "./lib/domMutationGuard";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

installDomMutationGuard(rootElement);
createRoot(rootElement).render(<App />);
