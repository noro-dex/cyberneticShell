import { useEffect } from 'react';
import { CanvasRoot } from './canvas/CanvasRoot';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { OutputModal } from './components/OutputModal';
import { useAgentEvents } from './hooks/useAgentEvents';
import { useAgentCommands } from './hooks/useAgentCommands';
import { useUIStore } from './stores/ui';

function App() {
  const { setCliAvailable, setCursorCliAvailable, setKiloCliAvailable, setGeminiCliAvailable, setGrokCliAvailable, setDeepseekCliAvailable, setStatusMessage } = useUIStore();
  const { checkCliAvailable, checkCursorCliAvailable, checkKiloCliAvailable, checkGeminiCliAvailable, checkGrokCliAvailable, checkDeepseekCliAvailable } = useAgentCommands();

  // Set up event listeners
  useAgentEvents();

  // Check if Claude, Cursor, Kilo, Gemini, Grok, and DeepSeek CLIs are available on mount
  useEffect(() => {
    const check = async () => {
      setStatusMessage('Checking CLIs...');
      const [claude, cursor, kilo, gemini, grok, deepseek] = await Promise.all([
        checkCliAvailable(),
        checkCursorCliAvailable(),
        checkKiloCliAvailable(),
        checkGeminiCliAvailable(),
        checkGrokCliAvailable(),
        checkDeepseekCliAvailable(),
      ]);
      setCliAvailable(claude);
      setCursorCliAvailable(cursor);
      setKiloCliAvailable(kilo);
      setGeminiCliAvailable(gemini);
      setGrokCliAvailable(grok);
      setDeepseekCliAvailable(deepseek);
      const which = [claude && 'Claude', cursor && 'Cursor', kilo && 'Kilo', gemini && 'Gemini', grok && 'Grok', deepseek && 'DeepSeek'].filter(Boolean).join(', ') || 'none';
      setStatusMessage(which !== 'none' ? 'Ready' : 'No CLI found (Claude, Cursor, Kilo, Gemini, Grok, or DeepSeek)');
    };
    check();
  }, [
    checkCliAvailable,
    checkCursorCliAvailable,
    checkKiloCliAvailable,
    checkGeminiCliAvailable,
    checkGrokCliAvailable,
    checkDeepseekCliAvailable,
    setCliAvailable,
    setCursorCliAvailable,
    setKiloCliAvailable,
    setGeminiCliAvailable,
    setGrokCliAvailable,
    setDeepseekCliAvailable,
    setStatusMessage,
  ]);

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
