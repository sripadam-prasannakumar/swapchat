import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ThemeProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </ThemeProvider>
);
