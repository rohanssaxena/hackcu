import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Course from "./pages/Course";
import Learn from "./pages/Learn";
import PracticeExam from "./pages/PracticeExam";
import Progress from "./pages/Progress";
import ComingSoon from "./pages/ComingSoon";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/course/:folderId" element={<Course />} />
          <Route path="/course/:folderId/learn/:contentNodeId" element={<Learn />} />
          <Route path="/course/:folderId/practice/:examId" element={<PracticeExam />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/academics" element={<ComingSoon />} />
          <Route path="/review" element={<ComingSoon />} />
          <Route path="/admin" element={<ComingSoon />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
