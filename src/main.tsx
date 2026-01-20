import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Note: StrictMode removed due to PixiJS async initialization conflicts
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
