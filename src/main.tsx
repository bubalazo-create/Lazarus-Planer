import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import './index.css'


const savedTheme = localStorage.getItem('lazarus_theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
}

ReactDOM.createRoot(document.getElementById('root')!).render(

  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
