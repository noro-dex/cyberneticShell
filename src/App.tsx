import { useEffect } from 'react';
import { CanvasRoot } from './canvas/CanvasRoot';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { OutputModal } from './components/OutputModal';
import { useTauriEvents } from './hooks/useTauriEvents';
import { useAgentCommands } from './hooks/useAgentCommands';
import { useUIStore } from './stores/ui';

function App() {
  const { setCliAvailable, setStatusMessage } = useUIStore();
  const { checkCliAvailable } = useAgentCommands();

  // Set up event listeners
  useTauriEvents();

  // Check if Claude CLI is available on mount
  useEffect(() => {
    const checkCli = async () => {
      setStatusMessage('Checking Claude CLI...');
      const available = await checkCliAvailable();
      setCliAvailable(available);
      setStatusMessage(available ? 'Ready' : 'Claude CLI not found');
    };
    checkCli();
  }, [checkCliAvailable, setCliAvailable, setStatusMessage]);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas-bg text-gray-100">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <CanvasRoot />

        {/* Sidebar */}
        <Sidebar />
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      <OutputModal />
    </div>
  );
}

export default App;
