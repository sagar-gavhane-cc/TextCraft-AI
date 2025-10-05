// Vite HMR connection handler
const MAX_RETRIES = 5;
let retryCount = 0;
let retryInterval = null;

function checkViteConnection() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(true);
        } else {
          reject(new Error(`Failed to connect: ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('GET', 'http://localhost:5173/@vite/client', true);
    xhr.timeout = 2000; // 2 seconds timeout
    xhr.send();
  });
}

function updateStatus(message, isError = false) {
  const statusElement = document.getElementById('connection-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : 'success';
  }
}

function retryConnection() {
  if (retryCount >= MAX_RETRIES) {
    updateStatus(`Failed to connect after ${MAX_RETRIES} attempts. Please restart the dev server.`, true);
    clearInterval(retryInterval);
    return;
  }
  
  retryCount++;
  updateStatus(`Attempting to connect (${retryCount}/${MAX_RETRIES})...`);
  
  checkViteConnection()
    .then(() => {
      updateStatus('Connected! Reloading extension...', false);
      clearInterval(retryInterval);
      setTimeout(() => {
        chrome.runtime.reload();
      }, 1000);
    })
    .catch(err => {
      console.error('Connection failed:', err);
    });
}

document.addEventListener('DOMContentLoaded', function() {
  const reloadButton = document.getElementById('reload-button');
  if (reloadButton) {
    reloadButton.addEventListener('click', function() {
      chrome.runtime.reload();
    });
  }
  
  // Start checking connection
  retryConnection();
  retryInterval = setInterval(retryConnection, 3000);
});

export default {};
