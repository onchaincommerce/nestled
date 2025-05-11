'use client';

export default function EmergencyReset() {
  // Using dangerouslySetInnerHTML to inject a complete HTML page
  // This bypasses Next.js rendering to ensure it loads even if the rest of the app is broken
  return (
    <div dangerouslySetInnerHTML={{ __html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Emergency Reset - Nestled</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            padding: 24px;
          }
          h1 {
            color: #ef4444;
            font-size: 24px;
            margin-top: 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
          }
          button {
            background-color: #ef4444;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          }
          .success {
            background-color: #d1fae5;
            color: #065f46;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            display: none;
          }
          .error {
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            display: none;
          }
          .steps {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 6px;
            margin: 16px 0;
          }
          .steps ol {
            margin: 0;
            padding-left: 20px;
          }
          a {
            color: #3b82f6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Nestled Emergency Reset</h1>
          <p>This page will help reset your browser's data for Nestled when you're experiencing issues.</p>
          
          <div id="status" class="success"></div>
          <div id="error" class="error"></div>
          
          <div class="steps">
            <h3>What this does:</h3>
            <ol>
              <li>Unregisters all service workers for this site</li>
              <li>Clears all site cookies</li>
              <li>Clears site localStorage and sessionStorage</li>
              <li>Redirects you to the home page with a fresh state</li>
            </ol>
          </div>
          
          <button id="resetButton">Reset Nestled</button>
          <button id="homeButton">Go Home</button>
          
          <div class="steps">
            <h3>If this page doesn't work:</h3>
            <ol>
              <li>Open your browser settings</li>
              <li>Find Site Settings or Cookies and Site Data</li>
              <li>Search for "nestled.vercel.app"</li>
              <li>Clear all site data</li>
              <li>Try accessing <a href="https://nestled.vercel.app">nestled.vercel.app</a> again</li>
            </ol>
          </div>
        </div>
        
        <script>
          // Simple script to handle emergency reset
          document.getElementById('resetButton').addEventListener('click', async function() {
            const statusEl = document.getElementById('status');
            const errorEl = document.getElementById('error');
            
            try {
              statusEl.style.display = 'block';
              statusEl.textContent = 'Unregistering service workers...';
              
              // Unregister all service workers
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                  await registration.unregister();
                }
                statusEl.textContent = 'Service workers unregistered. Clearing site data...';
              }
              
              // Clear cookies
              document.cookie.split(';').forEach(cookie => {
                document.cookie = cookie.trim().split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
              });
              
              // Clear storage
              localStorage.clear();
              sessionStorage.clear();
              
              // Success
              statusEl.textContent = 'Reset complete! Redirecting in 3 seconds...';
              
              // Redirect with cache-busting parameter
              setTimeout(() => {
                window.location.href = '/?reset=' + Date.now();
              }, 3000);
              
            } catch (err) {
              // Show error
              errorEl.style.display = 'block';
              errorEl.textContent = 'Error: ' + (err.message || 'Unknown error');
              statusEl.style.display = 'none';
            }
          });
          
          document.getElementById('homeButton').addEventListener('click', function() {
            window.location.href = '/?reset=' + Date.now();
          });
        </script>
      </body>
      </html>
    ` }} />
  );
} 