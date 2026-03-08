import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TabBar from "../components/TabBar";
import AIPanel from "../components/AIPanel";
import GuidedModeModal from "../components/GuidedModeModal";
import { TabProvider } from "../contexts/TabContext";

export default function AppLayout() {
  const [guidedModeOpen, setGuidedModeOpen] = useState(false);

  return (
    <TabProvider>
      <div className="flex h-screen w-full overflow-hidden bg-bg-primary">
        <Sidebar onOpenGuidedMode={() => setGuidedModeOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TabBar />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </div>

        <AIPanel />

        {guidedModeOpen && (
          <GuidedModeModal onClose={() => setGuidedModeOpen(false)} />
        )}
      </div>
    </TabProvider>
  );
}
