import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TabBar from "../components/TabBar";
import AIPanel from "../components/AIPanel";
import GuidedModeModal from "../components/GuidedModeModal";

export default function AppLayout() {
  const [guidedModeOpen, setGuidedModeOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-primary">
      <Sidebar onOpenGuidedMode={() => setGuidedModeOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TabBar />
        <Outlet />
      </div>

      <AIPanel />

      {guidedModeOpen && (
        <GuidedModeModal onClose={() => setGuidedModeOpen(false)} />
      )}
    </div>
  );
}
