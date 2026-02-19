
export const buildFinalHtml = (projectFiles: Record<string, string>, entryPath: string = 'index.html', projectConfig?: any) => {
  const supabaseConfig = projectConfig?.supabase_url ? `
    window.StudioDatabase = {
      url: "${projectConfig.supabase_url}",
      key: "${projectConfig.supabase_key}"
    };
    console.log('Database Bridge: Active');
  ` : `window.StudioDatabase = null;`;

  const polyfill = `
    <script>
      ${supabaseConfig}
      window.onerror = function(message, source, lineno, colno, error) {
        window.parent.postMessage({
          type: 'RUNTIME_ERROR',
          error: { message, line: lineno, source: source ? source.split('/').pop() : 'index.html' }
        }, '*');
        return false;
      };
      if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
    </script>
  `;

  // Robust Entry Point Search
  let entryHtml = projectFiles[entryPath] || 
                  projectFiles['app/index.html'] || 
                  projectFiles['index.html'] || 
                  projectFiles['app/main.html'] ||
                  Object.values(projectFiles).find(c => c.includes('<body') || c.includes('<div')) ||
                  '<div id="app" style="color: #52525b; font-size: 12px; font-weight: 900; text-transform: uppercase; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b;">System Initializing...</div>';
  
  // Clean up relative assets/scripts for injection
  let processedHtml = entryHtml
    .replace(/<link[^>]+href=["'](?!\w+:\/\/)[^"']+["'][^>]*>/gi, '')
    .replace(/<script[^>]+src=["'](?!\w+:\/\/)[^"']+["'][^>]*><\/script>/gi, '');

  const cssContent = Object.entries(projectFiles)
    .filter(([path, content]) => path.endsWith('.css') && content.length > 0)
    .map(([path, content]) => `/* --- FILE: ${path} --- */\n${content}`)
    .join('\n');
    
  const jsContent = Object.entries(projectFiles)
    .filter(([path, content]) => path.endsWith('.js') && content.length > 0)
    .map(([path, content]) => `// --- FILE: ${path} ---\ntry {\n${content}\n} catch(e) { console.error("Error in ${path}:", e); }\n`)
    .join('\n');
  
  const headInjection = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { height: 100%; margin: 0; padding: 0; background-color: #09090b !important; color: #f4f4f5; font-family: sans-serif; }
      ::-webkit-scrollbar { display: none; }
      ${cssContent}
    </style>
    ${polyfill}
  `;

  const finalScript = `<script>\n${jsContent}\n</script>`;

  if (!processedHtml.toLowerCase().includes('<html')) {
    return `<!DOCTYPE html><html lang="en"><head>${headInjection}</head><body>${processedHtml}${finalScript}</body></html>`;
  }

  if (processedHtml.includes('</head>')) {
    processedHtml = processedHtml.replace('</head>', `${headInjection}</head>`);
  } else {
    processedHtml = processedHtml.replace('<body', `<head>${headInjection}</head><body`);
  }

  if (processedHtml.includes('</body>')) {
    processedHtml = processedHtml.replace('</body>', `${finalScript}</body>`);
  } else {
    processedHtml = processedHtml + finalScript;
  }

  return processedHtml;
};
