import { useState, memo } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TabBar from "../components/TabBar";
import AIPanel from "../components/AIPanel";
import GuidedModeModal from "../components/GuidedModeModal";
import { TabProvider } from "../contexts/TabContext";

const MainContent = memo(function MainContent() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TabBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
});

export default function AppLayout() {
  const [guidedModeOpen, setGuidedModeOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);

  return (
    <TabProvider>
      <div
        className="fixed inset-0 flex h-screen w-screen overflow-hidden bg-bg-primary"
        style={{ height: "100dvh", width: "100vw" }}
      >
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden"
          style={{ marginRight: panelWidth }}
        >
          <Sidebar onOpenGuidedMode={() => setGuidedModeOpen(true)} />
          <MainContent />
        </div>
        <div
          className="fixed right-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden"
          style={{ width: panelWidth, height: "100dvh" }}
        >
          <AIPanel onWidthChange={setPanelWidth} />
        </div>
      </div>
      {guidedModeOpen && (
        <GuidedModeModal onClose={() => setGuidedModeOpen(false)} />
      )}
    </TabProvider>
  );
}
