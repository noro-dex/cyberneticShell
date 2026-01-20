import { useEffect } from 'react';
import { CanvasRoot } from './canvas/CanvasRoot';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { OutputModal } from './components/OutputModal';
import { useTauriEvents } from './hooks/useTauriEvents';
import { useAgentCommands } from './hooks/useAgentCommands';
import { useUIStore } from './stores/ui';

function App() {
  const { setCliAvailable, setCursorCliAvailable, setStatusMessage } = useUIStore();
  const { checkCliAvailable, checkCursorCliAvailable } = useAgentCommands();

  // Set up event listeners
  useTauriEvents();

  // Check if Claude and Cursor CLIs are available on mount
  useEffect(() => {
    const check = async () => {
      setStatusMessage('Checking CLIs...');
      const [claude, cursor] = await Promise.all([checkCliAvailable(), checkCursorCliAvailable()]);
      setCliAvailable(claude);
      setCursorCliAvailable(cursor);
      const which = [claude && 'Claude', cursor && 'Cursor'].filter(Boolean).join(', ') || 'none';
      setStatusMessage(which !== 'none' ? 'Ready' : 'No CLI found (Claude or Cursor)');
    };
    check();
  }, [checkCliAvailable, checkCursorCliAvailable, setCliAvailable, setCursorCliAvailable, setStatusMessage]);

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
