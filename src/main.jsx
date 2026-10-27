import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register service worker — not immediate, updates happen on next full app open
registerSW({ immediate: false });

// Error Boundary to catch crashes and show a helpful message instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0f172a', color: '#fff', minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#f87171', marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', maxWidth: '320px' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px', background: '#10b981', color: '#fff',
              border: 'none', borderRadius: '12px', padding: '10px 24px',
              fontSize: '14px', cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');

// Hide the inline HTML splash screen as soon as React is ready to paint
const hideSplash = () => {
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.style.transition = 'opacity 0.3s ease';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }
};

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App onReady={hideSplash} />
    </ErrorBoundary>
  </StrictMode>,
)
