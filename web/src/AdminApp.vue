<template>
  <div class="admin-app">
    <!-- Header -->
    <header class="admin-header">
      <div class="header-content">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <div class="logo-text">
            <span class="logo-title">Nimiq Arcade</span>
            <span class="logo-subtitle">Admin Portal</span>
          </div>
        </div>
        
        <nav class="nav-links">
          <a href="/" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Arcade
          </a>
          <a href="https://github.com/nimiq/web-client" target="_blank" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            Docs
          </a>
        </nav>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="admin-main">
      <div class="container">
        <!-- Page Title -->
        <div class="page-header">
          <h1 class="page-title">Package Uploader</h1>
          <p class="page-description">
            Upload game packages to the Nimiq blockchain. Packages are split into chunks 
            and stored as transactions, then registered in the catalog for discovery.
          </p>
        </div>
        
        <!-- Upload Component -->
        <AdminUploader />
        
        <!-- Help Section -->
        <div class="help-section">
          <h2>How It Works</h2>
          <div class="help-grid">
            <div class="help-card">
              <div class="help-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <h3>1. Prepare Package</h3>
              <p>Create a ZIP file containing your game files. For DOS games, include run.json for configuration.</p>
            </div>
            
            <div class="help-card">
              <div class="help-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
              <h3>2. Configure</h3>
              <p>Set the RPC endpoint, wallet addresses, game title, version, and platform type.</p>
            </div>
            
            <div class="help-card">
              <div class="help-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>3. Upload</h3>
              <p>The file is chunked, each chunk sent as a transaction, then registered in the catalog.</p>
            </div>
          </div>
          
          <div class="requirements">
            <h3>Requirements</h3>
            <ul>
              <li><strong>Nimiq Node:</strong> Running with RPC enabled and consensus established</li>
              <li><strong>Wallet:</strong> Unlocked account with NIM balance for transaction fees</li>
              <li><strong>Cartridge Address:</strong> Unique address for storing game data</li>
              <li><strong>File Size:</strong> Maximum 6MB per package</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="admin-footer">
      <p>Nimiq Arcade Admin &bull; Decentralized Gaming on the Blockchain</p>
    </footer>
  </div>
</template>

<script setup>
import AdminUploader from './components/AdminUploader.vue'
</script>

<style>
/* Global Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0f;
  color: #e5e5e5;
  min-height: 100vh;
}

/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
</style>

<style scoped>
.admin-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245, 175, 2, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(99, 102, 241, 0.1), transparent),
    #0a0a0f;
}

/* Header */
.admin-header {
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 36px;
  height: 36px;
  color: #f5af02;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.logo-subtitle {
  font-size: 0.7rem;
  font-weight: 500;
  color: #f5af02;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.nav-link svg {
  width: 18px;
  height: 18px;
}

/* Main Content */
.admin-main {
  flex: 1;
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #f5af02);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
}

.page-description {
  color: #9ca3af;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Help Section */
.help-section {
  margin-top: 3rem;
  padding-top: 3rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.help-section h2 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #fff;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.help-card {
  background: rgba(26, 26, 36, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.help-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  background: rgba(245, 175, 2, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-icon svg {
  width: 24px;
  height: 24px;
  color: #f5af02;
}

.help-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #fff;
}

.help-card p {
  font-size: 0.875rem;
  color: #9ca3af;
  line-height: 1.5;
}

.requirements {
  background: rgba(26, 26, 36, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
}

.requirements h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #fff;
}

.requirements ul {
  list-style: none;
}

.requirements li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.875rem;
  color: #9ca3af;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.requirements li:last-child {
  border-bottom: none;
}

.requirements li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: #f5af02;
}

.requirements li strong {
  color: #e5e5e5;
}

/* Footer */
.admin-footer {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-size: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-description {
    font-size: 1rem;
  }
  
  .admin-main {
    padding: 1rem;
  }
}
</style>

