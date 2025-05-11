'use client';

export default function BarePage() {
  // Using dangerouslySetInnerHTML to inject a very simple HTML page with no dependencies
  return (
    <div dangerouslySetInnerHTML={{ __html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nestled - Minimal Page</title>
        <style>
          body {
            font-family: sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #111827;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: white;
            border-radius: 8px;
            padding: 24px;
          }
          h1 {
            color: #ef4444;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 16px;
            background-color: #ef4444;
            color: white;
            text-decoration: none;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Nestled</h1>
          <p>This is a minimal page to test if the site is accessible.</p>
          <p>If you can see this page, the site's server is functioning correctly.</p>
          <p>The issue is likely with the service worker or browser cache.</p>
          
          <a href="/emergency-reset">Reset Your Browser Data</a>
        </div>
      </body>
      </html>
    ` }} />
  );
} 