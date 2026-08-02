import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { AuthProvider } from "@/lib/auth";
import "@/app/globals.css";

const root = document.documentElement;
const savedTheme = localStorage.getItem("msf-theme");
const useDarkTheme = savedTheme === "dark" || (savedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
root.classList.toggle("dark", useDarkTheme);
root.classList.toggle("light", !useDarkTheme);
const savedScene = localStorage.getItem("msf-glass-scene");
const savedQuality = localStorage.getItem("msf-glass-quality");
root.dataset.garyScene = savedScene === "static" || savedScene === "neutral" ? savedScene : "dynamic";
root.dataset.garyQuality = savedQuality === "balanced" || savedQuality === "reduced" ? savedQuality : "full";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
