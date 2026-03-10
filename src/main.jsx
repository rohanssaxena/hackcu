import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Course from "./pages/Course";
import Learn from "./pages/Learn";
import Drill from "./pages/Drill";
import ComingSoon from "./pages/ComingSoon";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/course/:folderId" element={<ErrorBoundary><Course /></ErrorBoundary>} />
          <Route path="/course/:folderId/learn/:contentNodeId" element={<Learn />} />
          <Route path="/course/:folderId/drill/:setId" element={<Drill />} />
          <Route path="/progress" element={<ComingSoon />} />
          <Route path="/academics" element={<ComingSoon />} />
          <Route path="/review" element={<ComingSoon />} />
          <Route path="/admin" element={<ComingSoon />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
