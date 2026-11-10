import React from 'react';
import ReactDOM from 'react-dom/client';
import "./styles/index.css";
import "./styles/shared-components.css";
import "./styles/interaction-layout.css";
import "./styles/theme-and-status.css";
import "./styles/auth.css";
import "./styles/auth-showcase.css";
import "./styles/auth-responsive.css";
import "./styles/dashboard.css";
import "./styles/profile.css";
import "./styles/layout.css";
import "./styles/tracker-layout.css";
import "./styles/profile-layout.css";
import "./styles/public-profile-layout.css";
import "./styles/own-profile-layout.css";
import "./styles/profile-responsive.css";
import { supabase } from "./shared/lib/supabase";
import App from './App';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-screen flex min-h-screen items-center justify-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-2xl font-bold">The app could not load</h1>
            <p className="mt-3 text-sm text-muted">
              Reload the page to try again. If this keeps happening, contact
              support and include the browser console error.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary mt-6 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Reload app
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

// Initialize Supabase client globally for auth checks
window.supabase = supabase;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
