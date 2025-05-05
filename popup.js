document.addEventListener('DOMContentLoaded', function() {
  // Notify background script that popup is opened to clear the badge
  chrome.runtime.sendMessage({ action: 'popupOpened' });
  
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
  
  // Add capture link button after the load button
  const captureBtn = document.createElement('button');
  captureBtn.className = 'load-btn';
  captureBtn.style.backgroundColor = '#5e17eb';
  captureBtn.style.marginLeft = '5px';
  captureBtn.textContent = 'Capture';
  captureBtn.title = 'Capture the latest t.co link from the current page';
  
  // Insert the capture button after the load button
  loadGameBtn.parentNode.insertBefore(captureBtn, loadGameBtn.nextSibling);
  
  // Add event listener for the capture button
  captureBtn.addEventListener('click', function() {
    // Query the active tab to send a message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        // Send message to content script to get the latest t.co link
        chrome.tabs.sendMessage(
          tabs[0].id,
          {action: 'forceCaptureLinks'},
          function(response) {
            if (response && response.tcoLink) {
              handleNewTcoLink(response.tcoLink);
              gameUrlInput.value = response.tcoLink;
            } else {
              // Check if we have any stored links
              checkForTcoLinks();
            }
          }
        );
      }
    });
  });
  
  // Current game URL
  let currentGameUrl = '';
  
  // Check for t.co links from the current page
  checkForTcoLinks();
  
  // Listen for t.co link updates from background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'tcoLinkUpdated') {
      console.log('Popup received updated t.co link:', request.tcoLink);
      console.log('Possible game:', request.possibleGame);
      if (request.contextInfo) {
        console.log('Context info:', request.contextInfo);
      }
      
      // Handle the link with context info
      handleNewTcoLink(request.tcoLink, request.possibleGame, request.contextInfo);
    }
    return true;
  });
  
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
    
    // Handle t.co links specially
    if (gameUrl.includes('t.co/')) {
      // Show loading state
      loadGameBtn.textContent = 'Loading...';
      loadGameBtn.disabled = true;
      
      // Try to resolve the t.co link
      resolveTcoLink(gameUrl).then(resolvedUrl => {
        loadGameBtn.textContent = 'Load';
        loadGameBtn.disabled = false;
        
        if (resolvedUrl && isValidRosebudUrl(resolvedUrl)) {
          // Update the input with the resolved URL for transparency
          gameUrlInput.value = resolvedUrl;
          
          // Load the game
          loadGameInPopup(resolvedUrl);
          errorMessage.style.display = 'none';
          
          // Save this URL for next time
          localStorage.setItem('popupGameUrl', resolvedUrl);
          currentGameUrl = resolvedUrl;
        } else {
          // If the resolved URL is not a Rosebud game, try using the t.co link directly
          if (resolvedUrl && !isValidRosebudUrl(resolvedUrl)) {
            errorMessage.textContent = 'Link does not point to a Rosebud game';
            errorMessage.style.display = 'block';
          } else {
            loadGameInPopup(gameUrl);
            errorMessage.style.display = 'none';
            localStorage.setItem('popupGameUrl', gameUrl);
            currentGameUrl = gameUrl;
          }
        }
      }).catch(error => {
        console.error('Error resolving t.co link:', error);
        loadGameBtn.textContent = 'Load';
        loadGameBtn.disabled = false;
        
        // Try using the t.co link directly as a fallback
        loadGameInPopup(gameUrl);
        errorMessage.style.display = 'none';
        localStorage.setItem('popupGameUrl', gameUrl);
        currentGameUrl = gameUrl;
      });
    } else {
      // Standard handling for non-t.co links
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
    if (!url) return false;
    
    // Accept t.co links (which we'll try to resolve)
    if (url.includes('t.co/')) {
      return true;
    }
    
    // Basic validation - must be a rosebud.ai URL
    const isRosebudDomain = 
      url.startsWith('https://rosebud.ai/') || 
      url.startsWith('http://rosebud.ai/') ||
      url.startsWith('https://www.rosebud.ai/') ||
      url.startsWith('http://www.rosebud.ai/') ||
      // Also accept app.rosebud.ai domain
      url.startsWith('https://app.rosebud.ai/') ||
      url.startsWith('http://app.rosebud.ai/');
      
    // Check if it's a game URL (contains /p/ or similar pattern)
    const isGameUrl = 
      url.includes('/p/') || 
      url.includes('/play/') || 
      url.includes('rosebud.ai/g/');
      
    return isRosebudDomain || isGameUrl;
  }
  
  // Function to check for t.co links from the current page
  function checkForTcoLinks() {
    // First try chrome.storage.local (persists across popup sessions)
    chrome.storage.local.get(['lastTcoLink', 'tcoLinkTimestamp', 'possibleGame', 'contextInfo'], function(result) {
      if (result.lastTcoLink) {
        console.log('Found t.co link in chrome storage:', result.lastTcoLink);
        console.log('Possible game:', result.possibleGame);
        if (result.contextInfo) {
          console.log('Context info:', result.contextInfo);
        }
        
        // Check if the link was found recently (within last 30 seconds)
        const isRecent = result.tcoLinkTimestamp && 
                        (Date.now() - result.tcoLinkTimestamp < 30000);
        
        if (isRecent) {
          handleNewTcoLink(result.lastTcoLink, result.possibleGame, result.contextInfo);
        }
      } else {
        // Fall back to localStorage (less reliable across popup sessions)
        const localTcoLink = localStorage.getItem('lastTcoLink');
        if (localTcoLink) {
          console.log('Found t.co link in localStorage:', localTcoLink);
          handleNewTcoLink(localTcoLink);
        }
      }
    });
  }
  
  // Function to handle a new t.co link
  function handleNewTcoLink(tcoLink, possibleGame = false, contextInfo = null) {
    if (!tcoLink) return;
    
    console.log('Handling new t.co link:', tcoLink);
    
    // Update the input field with the t.co link
    gameUrlInput.value = tcoLink;
    
    // Get the link status element
    const linkStatusElement = document.getElementById('link-status');
    
    // Show status
    linkStatusElement.innerHTML = '<span class="loading-spinner"></span> Processing t.co link...';
    
    // Visual notification - create or update game indicator
    let gameIndicator = document.getElementById('game-indicator');
    if (!gameIndicator) {
      gameIndicator = document.createElement('div');
      gameIndicator.id = 'game-indicator';
      gameIndicator.className = 'game-indicator loading';
      
      // Insert at the top of the content
      const content = document.querySelector('.content');
      content.insertBefore(gameIndicator, content.firstChild);
    } else {
      // Reset classes and set to loading
      gameIndicator.className = 'game-indicator loading';
    }
    
    // Set initial indicator state
    gameIndicator.innerHTML = (possibleGame ? 
      '<i class="fas fa-gamepad"></i> Possible Game Detected! Verifying...' : 
      '<span class="loading-spinner"></span> Checking link...');
    
    // Attempt to resolve the t.co link
    resolveTcoLink(tcoLink).then(resolvedUrl => {
      console.log('Resolved t.co link to:', resolvedUrl);
      
      if (isValidRosebudUrl(resolvedUrl)) {
        // Update the game indicator
        gameIndicator.className = 'game-indicator success';
        gameIndicator.innerHTML = '<i class="fas fa-gamepad"></i> Rosebud Game Detected!';
        
        linkStatusElement.innerHTML = '<i class="fas fa-check"></i> Rosebud game found! Loading...';
        linkStatusElement.style.color = '#5e17eb';
        
        // Update the input with the resolved URL for transparency
        gameUrlInput.value = resolvedUrl;
        
        // Load the game automatically
        setTimeout(() => {
          loadGameInPopup(resolvedUrl);
          localStorage.setItem('popupGameUrl', resolvedUrl);
          
          // Clear the status after loading
          setTimeout(() => {
            linkStatusElement.textContent = '';
          }, 2000);
        }, 500);
      } 
      else if (resolvedUrl) {
        // We resolved the URL but it's not a Rosebud game
        gameIndicator.className = 'game-indicator error';
        gameIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Not a Rosebud Game';
        
        linkStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Link does not lead to a Rosebud game.';
        linkStatusElement.style.color = '#990000';
        
        // Show the resolved URL anyway for debugging
        gameUrlInput.value = resolvedUrl;
        
        // Clear the status after a delay
        setTimeout(() => {
          linkStatusElement.textContent = '';
        }, 5000);
      }
      else {
        // Failed to resolve, keep the t.co link and try to load it directly
        gameIndicator.className = 'game-indicator warning';
        gameIndicator.innerHTML = '<i class="fas fa-info-circle"></i> Trying Direct Load';
        
        linkStatusElement.innerHTML = '<i class="fas fa-info-circle"></i> Using t.co link directly...';
        
        // Try loading the t.co link directly
        loadGameInPopup(tcoLink);
        localStorage.setItem('popupGameUrl', tcoLink);
        
        // Clear the status after loading
        setTimeout(() => {
          linkStatusElement.textContent = '';
        }, 2000);
      }
    }).catch(error => {
      console.error('Error resolving t.co link:', error);
      
      gameIndicator.className = 'game-indicator error';
      gameIndicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error Resolving Link';
      
      linkStatusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error resolving link. Trying direct load...';
      linkStatusElement.style.color = '#990000';
      
      // Try loading the t.co link directly as a fallback
      loadGameInPopup(tcoLink);
      localStorage.setItem('popupGameUrl', tcoLink);
      
      // Clear the status after a delay
      setTimeout(() => {
        linkStatusElement.textContent = '';
      }, 3000);
    });
  }
  
  // Function to resolve a t.co link to its destination URL
  function resolveTcoLink(tcoUrl) {
    return new Promise((resolve, reject) => {
      // Send the URL to background to fetch
      chrome.runtime.sendMessage({
        action: 'resolveTcoLink',
        url: tcoUrl
      }, response => {
        if (response && response.resolvedUrl) {
          resolve(response.resolvedUrl);
        } else {
          // If we can't resolve via background, try using the t.co directly
          // This will likely work if the t.co link points directly to a Rosebud game
          resolve(tcoUrl);
        }
      });
    });
  }
}); 