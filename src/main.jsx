import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Course from "./pages/Course";
import ComingSoon from "./pages/ComingSoon";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/course/:courseName" element={<Course />} />
          <Route path="/progress" element={<ComingSoon />} />
          <Route path="/academics" element={<ComingSoon />} />
          <Route path="/review" element={<ComingSoon />} />
          <Route path="/admin" element={<ComingSoon />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
