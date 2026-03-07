import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { CourseProvider } from "./context/CourseContext";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Course from "./pages/Course";
import Review from "./pages/Review";
import Progress from "./pages/Progress";
import ComingSoon from "./pages/ComingSoon";
import Login from "./pages/Login";
import { isAuthenticated } from "./services/canvasAPI";

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={
          <RequireAuth>
            <CourseProvider>
              <AppLayout />
            </CourseProvider>
          </RequireAuth>
        }>
          <Route path="/"                    element={<Dashboard />} />
          <Route path="/workspace"           element={<Workspace />} />
          <Route path="/course/:courseName"  element={<Course />} />
          <Route path="/review"              element={<Review />} />
          <Route path="/progress"            element={<Progress />} />
          <Route path="/academics"           element={<ComingSoon />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);