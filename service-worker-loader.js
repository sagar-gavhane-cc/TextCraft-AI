try {
  import('http://localhost:5173/@vite/env')
    .catch(e => console.error('Failed to load Vite env:', e));
  import('http://localhost:5173/@crx/client-worker')
    .catch(e => console.error('Failed to load CRX client worker:', e));
} catch (e) {
  console.error('Error in service worker loader:', e);
}
