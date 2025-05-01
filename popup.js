document.addEventListener('DOMContentLoaded', function() {
  // Get toggle element
  const toggleElement = document.getElementById('toggle-game');
  
  // Initialize toggle state from localStorage or default to true
  let isActive = localStorage.getItem('gameVisibility') !== 'false';
  
  // Set initial toggle state in UI
  updateToggleUI();
  
  // Listen for state changes from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'gameStateChanged' && request.isVisible !== undefined) {
      isActive = request.isVisible;
      localStorage.setItem('gameVisibility', isActive);
      updateToggleUI();
      
      // If game is now hidden, also update the mute state in localStorage
      if (!isActive) {
        localStorage.setItem('rosebudTabMuted', 'false');
      }
    }
    return true; // Keep the message channel open for async response
  });
  
  // Check with content script for current visibility state
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: 'getGameState'},
        function(response) {
          if (response && response.isVisible !== undefined) {
            isActive = response.isVisible;
            localStorage.setItem('gameVisibility', isActive);
            updateToggleUI();
          }
        }
      );
    }
  });

  // Add click event listener
  toggleElement.addEventListener('click', function() {
    // Toggle active class
    isActive = !isActive;
    
    // Save state to localStorage
    localStorage.setItem('gameVisibility', isActive);
    
    // Update UI
    updateToggleUI();
    
    // Send message to content script to toggle game visibility
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {action: 'toggleGame', visibility: isActive}
        );
      }
    });
  });
  
  // Helper function to update UI based on state
  function updateToggleUI() {
    if (isActive) {
      toggleElement.classList.add('active');
    } else {
      toggleElement.classList.remove('active');
    }
  }
  
  // Get popup game elements
  const gameUrlInput = document.getElementById('game-url-input');
  const loadGameBtn = document.getElementById('load-game-btn');
  const popupGameFrame = document.getElementById('popup-game-frame');
  const errorMessage = document.getElementById('error-message');
  
  // Current game URL
  let currentGameUrl = '';
  
  // Restore last played game URL if available
  const lastPopupGameUrl = localStorage.getItem('popupGameUrl');
  if (lastPopupGameUrl) {
    gameUrlInput.value = lastPopupGameUrl;
    // Optional: Auto-load the last game
    loadGameInPopup(lastPopupGameUrl);
  }
  
  // Add event listener for the load game button
  loadGameBtn.addEventListener('click', function() {
    const gameUrl = gameUrlInput.value.trim();
    if (isValidRosebudUrl(gameUrl)) {
      loadGameInPopup(gameUrl);
      errorMessage.style.display = 'none';
      // Save this URL for next time
      localStorage.setItem('popupGameUrl', gameUrl);
      // Save current URL
      currentGameUrl = gameUrl;
    } else {
      errorMessage.style.display = 'block';
      popupGameFrame.style.display = 'none';
    }
  });
  
  // Also allow pressing Enter to load the game
  gameUrlInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      loadGameBtn.click();
    }
  });
  
  // Function to load a game in the popup iframe
  function loadGameInPopup(url) {
    popupGameFrame.src = url;
    popupGameFrame.style.display = 'block';
    currentGameUrl = url;
  }
  
  // Function to validate Rosebud URL
  function isValidRosebudUrl(url) {
    // Basic validation - must be a rosebud.ai URL
    return url && (
      url.startsWith('https://rosebud.ai/') || 
      url.startsWith('http://rosebud.ai/') ||
      url.startsWith('https://www.rosebud.ai/') ||
      url.startsWith('http://www.rosebud.ai/')
    );
  }
}); 