import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App";
import { I18nProvider } from "./ui/i18n";
import "./ui/styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
