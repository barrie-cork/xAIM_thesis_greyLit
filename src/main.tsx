import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Create a simple demo page to showcase our components
function App() {
  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-neutral-900">Grey Literature Search App</h1>
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-neutral-900">Design System</h2>
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-medium text-neutral-900">Colors</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-neutral-600">Primary</h4>
                  <div className="space-y-2">
                    <div className="h-8 rounded bg-primary-500" />
                    <div className="h-8 rounded bg-primary-600" />
                    <div className="h-8 rounded bg-primary-700" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-neutral-600">Secondary</h4>
                  <div className="space-y-2">
                    <div className="h-8 rounded bg-secondary-500" />
                    <div className="h-8 rounded bg-secondary-600" />
                    <div className="h-8 rounded bg-secondary-700" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-neutral-600">Neutral</h4>
                  <div className="space-y-2">
                    <div className="h-8 rounded bg-neutral-200" />
                    <div className="h-8 rounded bg-neutral-300" />
                    <div className="h-8 rounded bg-neutral-400" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 