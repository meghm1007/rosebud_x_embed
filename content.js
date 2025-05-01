// Wait for page to load
document.addEventListener('DOMContentLoaded', initGameFrame);
// Also try on window load in case DOMContentLoaded already fired
window.addEventListener('load', initGameFrame);
// Listen for URL changes on Twitter/X to detect when navigating to posts
window.addEventListener('load', () => {
  // Set up more robust URL change detection
  setupUrlChangeDetection();
  // Check current URL on initial load
  checkForXPostAndExtractLinks();
});

// Array of Rosebud games to randomly choose from
const ROSEBUD_GAMES = [
  'https://rosebud.ai/p/6b51a6f1-288b-4579-9b81-068d49c81b1f', // Original FPS game
  'https://rosebud.ai/p/800a3295-ea07-4c80-a4f1-10fd8db24088', // the SkySurfer
  'https://rosebud.ai/p/49792577-8bc5-41aa-b87f-5f3a27f19d54', // Jumping Orbits
  'https://rosebud.ai/p/a3148c46-ba80-433e-9ea5-5be4e38e6bd5', // Rosie vs Bugs Race
  'https://rosebud.ai/p/d01a91fd-da61-4e4e-b410-b35c2f2ec6b7', // Mister Elastic
  'https://rosebud.ai/p/aab470b0-3a6f-4779-a933-27ab03855589', // Tetra Blast!
  'https://rosebud.ai/p/2a929c95-7bc2-42a6-9dca-d624a7b24f77', // KARTKART
  'https://rosebud.ai/p/24a9c782-62f8-4ffd-8e0b-256c29ae0713', // Rogue Race
  'https://rosebud.ai/p/1a506f9b-b242-46a7-88ae-041ce77a99eb', // Jumpja
  'https://rosebud.ai/p/928c3a65-3e78-4e19-8f78-4a6e03c9f528'  // Fury Race : 1000km battle
];

// Function to get a random game URL that's different from the current one
function getRandomGame() {
  // Get the current game URL from the iframe if available
  let currentGameUrl = '';
  if (gameContainer) {
    const gameFrame = gameContainer.querySelector('iframe');
    if (gameFrame && gameFrame.src) {
      currentGameUrl = gameFrame.src;
    }
  }
  
  // If we don't have a current game URL, also check localStorage
  if (!currentGameUrl) {
    currentGameUrl = localStorage.getItem('rosebudGameUrl') || '';
  }
  
  // Create a copy of the games array that excludes the current game
  const availableGames = ROSEBUD_GAMES.filter(game => 
    !currentGameUrl.includes(game) && 
    !game.includes(extractGameId(currentGameUrl))
  );
  
  // If all games are filtered out (unlikely), use the full list
  const gamesPool = availableGames.length > 0 ? availableGames : ROSEBUD_GAMES;
  
  // Get a random game from the available options
  const randomIndex = Math.floor(Math.random() * gamesPool.length);
  return gamesPool[randomIndex];
}

// Helper function to extract game ID from URL
function extractGameId(url) {
  if (!url) return '';
  
  // Try to extract the game ID from the URL
  const match = url.match(/\/p\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : '';
}

// Track if frame has been created
let frameCreated = false;
let gameContainer = null;

// Track game visibility state
let isGameVisible = localStorage.getItem('gameVisibility') !== 'false';

// Track tab mute state
let isTabMuted = localStorage.getItem('rosebudTabMuted') === 'true';

// Default container dimensions
const defaultWidth = '300px';
const defaultHeight = '300px';

// Size presets
const SIZE_MODES = {
  NORMAL: 'normal',
  LARGE: 'large',
  EXTRA_LARGE: 'extraLarge'
};

// Size dimensions for each mode
const SIZE_DIMENSIONS = {
  [SIZE_MODES.NORMAL]: { width: '300px', height: '300px' },
  [SIZE_MODES.LARGE]: { width: '600px', height: '450px' },
  [SIZE_MODES.EXTRA_LARGE]: { width: '800px', height: '600px' }
};

// Track container dimensions with localStorage
let containerSizeMode = localStorage.getItem('rosebudGameSizeMode') || SIZE_MODES.NORMAL;

// Function to save container size mode to localStorage
function saveContainerSizeMode(sizeMode) {
  localStorage.setItem('rosebudGameSizeMode', sizeMode);
  console.log('Saved size mode:', sizeMode);
}

// Function to apply size mode to container
function applySizeMode(container, sizeMode) {
  const dimensions = SIZE_DIMENSIONS[sizeMode];
  container.style.width = dimensions.width;
  container.style.height = dimensions.height;
  containerSizeMode = sizeMode;
  saveContainerSizeMode(sizeMode);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'toggleGame') {
    // If visibility is explicitly provided, use it, otherwise toggle
    if (request.visibility !== undefined) {
      isGameVisible = request.visibility;
    } else {
      isGameVisible = !isGameVisible;
    }
    
    // Save state to localStorage
    localStorage.setItem('gameVisibility', isGameVisible);
    
    // Toggle game visibility
    toggleGameVisibility();
    
    // Respond with new state
    sendResponse({success: true, isVisible: isGameVisible});
  } 
  else if (request.action === 'getGameState') {
    // Return current visibility state and mute state
    sendResponse({isVisible: isGameVisible, isMuted: isTabMuted});
  }
  return true; // Keep the message channel open for async response
});

// Function to find and extract links from current X post
function checkForXPostAndExtractLinks() {
  const url = window.location.href;
  // Check if current URL matches X post pattern (x.com/username/status/id)
  if (url.match(/https?:\/\/(x|twitter)\.com\/[^\/]+\/status\/\d+/)) {
    console.log('X Post detected:', url);
    
    // Run immediately
    runTcoLinkExtraction();
    
    // And then run multiple times with delays to catch when content loads
    const delays = [500, 1000, 2000, 3000, 5000];
    delays.forEach(delay => {
      setTimeout(runTcoLinkExtraction, delay);
    });
    
    // Wait for content to load for the rosebud specific checks
    setTimeout(() => {
      // Look for specific div using the selector
      const targetDiv = document.querySelector('div.css-175oi2r.r-1kqtdi0.r-1867qdf.r-1phboty.r-rs99b7.r-18u37iz.r-1udh08x.r-o7ynqc.r-6416eg.r-1ny4l3l');
      
      if (targetDiv) {
        // Find the <a> inside the div
        const link = targetDiv.querySelector('a')?.href;

        // Look for the <span> containing "rosebud.ai"
        const spans = targetDiv.querySelectorAll('span');
        let hasRosebud = false;

        spans.forEach(span => {
          if (span.innerText.includes('rosebud.ai')) {
            hasRosebud = true;
          }
        });

        // Logic
        if (hasRosebud) {
          console.log('rosebud game: ' + link);
          
          // If we found a rosebud game link, you might want to do something with it
          // For example, update the iframe source or trigger game loading
          if (link && gameContainer) {
            const gameFrame = gameContainer.querySelector('iframe');
            if (gameFrame) {
              gameFrame.src = link;
              
              // Show the game container if it's hidden
              gameContainer.style.display = 'flex';
            }
          }
          
        } else if (link) {
          console.log('no rosebud game available');
        } else {
          console.log('no rosebud game available');
        }
      } else {
        console.log('Main div not found.');
        
        // Also try the old method as a fallback
        tryLegacyExtraction();
      }
    }, 1500); // Give time for the tweet to fully load
  }
}

// Function to run the t.co extraction code exactly as it would run in console
function runTcoLinkExtraction() {
  // Method 1: Direct function call
  extractTcoLinks();
  
  // Method 2: Inject and execute script in the page context
  // This runs the code exactly as if it was typed in the console
  const script = document.createElement('script');
  script.textContent = `
    // Step 1: Get all <a> elements from the whole document
    const tcoLinks = Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.includes('t.co'));

    // Step 2: Output the array
    console.log("INJECTED SCRIPT: t.co links found:", tcoLinks);

    // Step 3: Output the first t.co link
    if (tcoLinks.length > 0) {
      console.log("INJECTED SCRIPT: First t.co link:", tcoLinks[0]);
    } else {
      console.log("INJECTED SCRIPT: No t.co links found.");
    }
  `;
  document.head.appendChild(script);
  script.remove(); // Clean up after execution
}

// Function to extract all t.co links from the page
function extractTcoLinks() {
  // Step 1: Get all <a> elements from the whole document
  const tcoLinks = Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .filter(href => href.includes('t.co'));

  // Step 2: Output the array
  console.log("EXTENSION SCRIPT: t.co links found:", tcoLinks);

  // Step 3: Output the first t.co link
  if (tcoLinks.length > 0) {
    console.log("EXTENSION SCRIPT: First t.co link:", tcoLinks[0]);
  } else {
    console.log("EXTENSION SCRIPT: No t.co links found.");
  }
  
  return tcoLinks;
}

// Legacy method for extracting links
function tryLegacyExtraction() {
  // Look for tweet container
  const tweetContainer = document.querySelector('[data-testid="tweet"]');
  if (!tweetContainer) {
    console.log('Tweet container not found yet, might still be loading');
    return;
  }
  
  // Find all links in the post
  const links = tweetContainer.querySelectorAll('a[href]');
  const externalLinks = [];
  
  // Process links
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Get the full URL (handle relative links)
    let fullUrl = href;
    if (href.startsWith('/')) {
      fullUrl = `https://x.com${href}`;
    }
    
    // Check if the URL is an external link (not x.com or twitter.com internal paths)
    const isXInternal = href.startsWith('/') || 
                        href.includes('twitter.com/') || 
                        href.includes('x.com/') ||
                        href.includes('pic.twitter');
    
    // Filter out profile links, hashtags, and media
    const isProfileOrHashtag = href.match(/\/(hashtag|[^\/]+)\/?(status)?$/);
    
    // Only include external links
    if (!isXInternal && !isProfileOrHashtag) {
      externalLinks.push(fullUrl);
    } else if (href.includes('t.co/')) {
      // Capture t.co links (Twitter's URL shortener)
      console.log('Found t.co link:', href);
      externalLinks.push(fullUrl);
      
      // Try to get the actual link that t.co redirects to
      const linkText = link.textContent.trim();
      if (linkText && !linkText.includes('t.co/')) {
        console.log('  → Likely redirects to:', linkText);
      }
    }
  });
  
  // Look for rosebud.ai in the tweet text
  const tweetContent = tweetContainer.querySelector('[data-testid="tweetText"]');
  let foundRosebudGame = false;
  
  if (tweetContent) {
    // Check if rosebud.ai is mentioned
    if (tweetContent.textContent.includes('rosebud.ai')) {
      console.log('Found rosebud.ai mention in tweet');
      
      // Find a potential rosebud game link
      for (const link of externalLinks) {
        if (link.includes('rosebud.ai')) {
          console.log('rosebud game: ' + link);
          foundRosebudGame = true;
          
          // Update the iframe if we found a rosebud game link
          if (gameContainer) {
            const gameFrame = gameContainer.querySelector('iframe');
            if (gameFrame) {
              gameFrame.src = link;
              gameContainer.style.display = 'flex';
            }
          }
          
          break;
        }
      }
      
      if (!foundRosebudGame) {
        console.log('rosebud.ai mentioned but no game link found');
      }
    } else {
      console.log('no rosebud game available');
    }
  }
}

// Set up comprehensive URL change detection
function setupUrlChangeDetection() {
  // Method 1: Monitor history API changes
  observeUrlChanges();
  
  // Method 2: Use a MutationObserver to detect DOM changes that might indicate navigation
  setupMutationObserver();
  
  // Method 3: Regular interval checking for URL changes
  let lastUrl = location.href;
  setInterval(() => {
    if (lastUrl !== location.href) {
      console.log('URL changed from interval check:', lastUrl, 'to', location.href);
      lastUrl = location.href;
      checkForXPostAndExtractLinks();
    }
  }, 500);
}

// Observe URL changes using History API
function observeUrlChanges() {
  // Monitor history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    console.log('URL changed from pushState:', location.href);
    checkForXPostAndExtractLinks();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    console.log('URL changed from replaceState:', location.href);
    checkForXPostAndExtractLinks();
  };
  
  // Also listen for popstate events
  window.addEventListener('popstate', () => {
    console.log('URL changed from popstate:', location.href);
    checkForXPostAndExtractLinks();
  });
}

// Set up MutationObserver to detect DOM changes that might indicate navigation
function setupMutationObserver() {
  // The observer will look for changes that suggest a navigation has occurred
  const observer = new MutationObserver((mutations) => {
    // Check for specific navigation elements or content changes
    // For Twitter/X, main content changes might indicate navigation
    const contentChanged = mutations.some(mutation => {
      return mutation.target && mutation.target.id === 'react-root' || 
             mutation.target && mutation.target.closest('[data-testid="primaryColumn"]');
    });
    
    if (contentChanged) {
      console.log('Content change detected, checking if URL changed');
      // Some platforms update the URL slightly after content changes
      setTimeout(() => {
        checkForXPostAndExtractLinks();
      }, 100);
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

function initGameFrame() {
  // Don't create multiple frames
  if (frameCreated) return;
  frameCreated = true;
  
  // Create container for the game
  gameContainer = document.createElement('div');
  gameContainer.className = 'rosebud-game-container';
  
  // Set initial dimensions from localStorage size mode
  const initialDimensions = SIZE_DIMENSIONS[containerSizeMode];
  gameContainer.style.width = initialDimensions.width;
  gameContainer.style.height = initialDimensions.height;
  
  // Set initial visibility based on stored preference
  if (!isGameVisible) {
    gameContainer.style.display = 'none';
  }
  
  // Add CSS styles for spacing between buttons
  const style = document.createElement('style');
  style.textContent = `
    .rosebud-controls button, .rosebud-controls div {
      margin-right: 8px;
    }
    .rosebud-controls button:last-child {
      margin-right: 0;
    }
    .rosebud-size-btn {
      margin-right: 4px;
    }
    .rosebud-size-btn.active {
      background-color: #4a90e2;
      color: white;
    }
    .rosebud-mute-btn.muted {
      background-color: #e24a4a;
      color: white;
    }
  `;
  document.head.appendChild(style);
  
  // Create controls for the game container
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'rosebud-controls';
  controlsDiv.style.display = 'flex';
  controlsDiv.style.alignItems = 'center';
  
  const dragHandle = document.createElement('div');
  dragHandle.className = 'rosebud-drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'Drag to move';
  
  const minimizeButton = document.createElement('button');
  minimizeButton.className = 'rosebud-minimize-btn';
  minimizeButton.textContent = '−';
  minimizeButton.title = 'Minimize game';
  
  // Create size buttons
  const normalSizeButton = document.createElement('button');
  normalSizeButton.className = 'rosebud-size-btn rosebud-normal-size-btn';
  normalSizeButton.textContent = '□';
  normalSizeButton.title = 'Normal size';
  
  const largeSizeButton = document.createElement('button');
  largeSizeButton.className = 'rosebud-size-btn rosebud-large-size-btn';
  largeSizeButton.textContent = '▢';
  largeSizeButton.title = 'Large size';
  
  const extraLargeSizeButton = document.createElement('button');
  extraLargeSizeButton.className = 'rosebud-size-btn rosebud-xlarge-size-btn';
  extraLargeSizeButton.textContent = '⬛';
  extraLargeSizeButton.title = 'Extra large size';
  
  // Create mute button
  const muteButton = document.createElement('button');
  muteButton.className = 'rosebud-mute-btn';
  muteButton.textContent = '🔊';
  muteButton.title = 'Toggle sound';
  
  // Set initial mute button state based on localStorage
  updateMuteButtonState(muteButton);
  
  // Apply tab muting on load if previously muted
  if (isTabMuted) {
    // Use chrome.tabs API to mute the current tab
    chrome.runtime.sendMessage({
      action: 'toggleTabMute',
      muted: true
    }).catch(err => {
      console.log('Could not send initial mute message to background script', err);
    });
  }
  
  // Highlight the current size button
  updateSizeButtonsState([normalSizeButton, largeSizeButton, extraLargeSizeButton], containerSizeMode);
  
  const nextGameButton = document.createElement('button');
  nextGameButton.className = 'rosebud-next-game-btn';
  nextGameButton.textContent = '→';
  nextGameButton.title = 'Play next random game';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'rosebud-close-btn';
  closeButton.textContent = '×';
  closeButton.title = 'Close game';
  
  // Create URL input container
  const urlInputContainer = document.createElement('div');
  urlInputContainer.className = 'rosebud-url-container';
  
  // Create input for custom Rosebud game URL
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'rosebud-url-input';
  urlInput.placeholder = 'Enter a rosebud.ai game link...';
  
  // Create load button
  const loadButton = document.createElement('button');
  loadButton.className = 'rosebud-load-btn';
  loadButton.textContent = 'Load Game';
  loadButton.title = 'Load Rosebud game';
  
  // Add URL input and load button to container
  urlInputContainer.appendChild(urlInput);
  urlInputContainer.appendChild(loadButton);
  
  // Create iframe for game with default game
  const gameFrame = document.createElement('iframe');
  
  // Check if there's a stored game URL from a previous refresh
  const storedGameUrl = localStorage.getItem('rosebudGameUrl');
  if (storedGameUrl && isValidRosebudUrl(storedGameUrl)) {
    gameFrame.src = storedGameUrl;
    // Optionally, update the input field with the stored URL
    urlInput.value = storedGameUrl;
    // Clear the stored URL to prevent it from being used again on future page loads
    localStorage.removeItem('rosebudGameUrl');
  } else {
    // Use a random game from our list
    gameFrame.src = getRandomGame();
  }
  
  gameFrame.frameBorder = '0';
  gameFrame.allowFullscreen = true;
  gameFrame.allow = 'autoplay; fullscreen *; geolocation; microphone; camera; midi; monetization; xr-spatial-tracking; gamepad; gyroscope; accelerometer; xr; cross-origin-isolated';
  gameFrame.sandbox = 'allow-forms allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-top-navigation';
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'rosebud-resize-handle';
  resizeHandle.title = 'Drag to resize';
  
  // Add elements to DOM
  controlsDiv.appendChild(dragHandle);
  controlsDiv.appendChild(minimizeButton);
  controlsDiv.appendChild(normalSizeButton);
  controlsDiv.appendChild(largeSizeButton);
  controlsDiv.appendChild(extraLargeSizeButton);
  controlsDiv.appendChild(muteButton);
  controlsDiv.appendChild(nextGameButton);
  controlsDiv.appendChild(closeButton);
  gameContainer.appendChild(controlsDiv);
  gameContainer.appendChild(urlInputContainer);
  gameContainer.appendChild(gameFrame);
  gameContainer.appendChild(resizeHandle);
  document.body.appendChild(gameContainer);
  
  // Setup drag functionality
  setupDrag(gameContainer, dragHandle);
  
  // Setup resize functionality
  setupResize(gameContainer, resizeHandle);
  
  // Setup button functionality
  setupButtons(gameContainer, minimizeButton, normalSizeButton, largeSizeButton, extraLargeSizeButton, closeButton, nextGameButton, muteButton);
  
  // Setup URL input functionality
  setupUrlInput(urlInput, loadButton, gameFrame);
}

// Setup URL input validation and loading
function setupUrlInput(input, button, iframe) {
  button.addEventListener('click', () => {
    loadGameFromInput(input, iframe);
  });
  
  // Also allow pressing Enter to load the game
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      loadGameFromInput(input, iframe);
    }
  });
}

// Validate and load game URL
function loadGameFromInput(input, iframe) {
  const url = input.value.trim();
  
  // Check if it's a valid Rosebud.ai URL
  if (isValidRosebudUrl(url)) {
    console.log('Loading Rosebud game:', url);
    
    // Store the URL in localStorage before refreshing
    localStorage.setItem('rosebudGameUrl', url);
    
    // Refresh the page to avoid CORS issues
    window.location.reload();
  } else {
    // Show error
    console.log('Invalid Rosebud URL:', url);
    input.style.borderColor = 'red';
    input.title = 'Please enter a valid rosebud.ai game URL';
    
    // Shake the input to indicate error
    input.classList.add('shake');
    setTimeout(() => {
      input.classList.remove('shake');
    }, 500);
  }
}

// Validate if URL is from Rosebud.ai
function isValidRosebudUrl(url) {
  // Basic validation - must be a rosebud.ai URL
  return url && (
    url.startsWith('https://rosebud.ai/') || 
    url.startsWith('http://rosebud.ai/') ||
    url.startsWith('https://www.rosebud.ai/') ||
    url.startsWith('http://www.rosebud.ai/')
  );
}

// Make the container draggable
function setupDrag(container, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function on mouse move
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    container.style.top = (container.offsetTop - pos2) + "px";
    container.style.left = (container.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Make the container resizable
function setupResize(container, handle) {
  let startX, startY, startWidth, startHeight;
  
  handle.addEventListener('mousedown', initResize, false);
  
  function initResize(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(container).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
    document.addEventListener('mousemove', resizeElement, false);
    document.addEventListener('mouseup', stopResize, false);
  }
  
  function resizeElement(e) {
    // Calculate new size
    const newWidth = startWidth + e.clientX - startX;
    const newHeight = startHeight + e.clientY - startY;
    
    // Enforce minimum size
    const minWidth = 250;
    const minHeight = 200;
    
    // Set new size if it's above minimum
    if (newWidth > minWidth) {
      container.style.width = newWidth + 'px';
    }
    
    if (newHeight > minHeight) {
      container.style.height = newHeight + 'px';
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', resizeElement, false);
    document.removeEventListener('mouseup', stopResize, false);
    
    // After manual resize, we'll set to custom mode
    containerSizeMode = 'custom';
    saveContainerSizeMode(containerSizeMode);
  }
}

// Setup minimize and close buttons
function setupButtons(container, minimizeBtn, normalSizeBtn, largeSizeBtn, extraLargeSizeBtn, closeBtn, nextGameBtn, muteBtn) {
  let minimized = false;
  const sizeButtons = [normalSizeBtn, largeSizeBtn, extraLargeSizeBtn];
  
  minimizeBtn.addEventListener('click', () => {
    toggleMinimize(container, minimizeBtn);
  });
  
  // Normal size button
  normalSizeBtn.addEventListener('click', () => {
    if (!minimized) {
      applySizeMode(container, SIZE_MODES.NORMAL);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.NORMAL);
    } else {
      // If minimized, expand first
      toggleMinimize(container, minimizeBtn);
      // Then apply size
      applySizeMode(container, SIZE_MODES.NORMAL);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.NORMAL);
    }
  });
  
  // Large size button
  largeSizeBtn.addEventListener('click', () => {
    if (!minimized) {
      applySizeMode(container, SIZE_MODES.LARGE);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.LARGE);
    } else {
      // If minimized, expand first
      toggleMinimize(container, minimizeBtn);
      // Then apply size
      applySizeMode(container, SIZE_MODES.LARGE);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.LARGE);
    }
  });
  
  // Extra large size button
  extraLargeSizeBtn.addEventListener('click', () => {
    if (!minimized) {
      applySizeMode(container, SIZE_MODES.EXTRA_LARGE);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.EXTRA_LARGE);
    } else {
      // If minimized, expand first
      toggleMinimize(container, minimizeBtn);
      // Then apply size
      applySizeMode(container, SIZE_MODES.EXTRA_LARGE);
      updateSizeButtonsState(sizeButtons, SIZE_MODES.EXTRA_LARGE);
    }
  });
  
  // Add event listener for the next game button
  nextGameBtn.addEventListener('click', () => {
    loadNextRandomGame();
  });
  
  closeBtn.addEventListener('click', () => {
    // Hide the game container
    container.style.display = 'none';
    
    // Update visibility state in localStorage
    isGameVisible = false;
    localStorage.setItem('gameVisibility', isGameVisible);
    
    // Unmute the tab when hiding the game
    if (isTabMuted) {
      isTabMuted = false;
      localStorage.setItem('rosebudTabMuted', isTabMuted);
      updateMuteButtonState(muteBtn);
      
      // Tell background script to unmute the tab
      chrome.runtime.sendMessage({
        action: 'toggleTabMute',
        muted: false
      }).catch(err => {
        console.log('Could not send unmute message to background script', err);
      });
    }
    
    // Notify popup about state change if needed
    chrome.runtime.sendMessage({
      action: 'gameStateChanged',
      isVisible: isGameVisible
    }).catch(err => {
      // Ignore errors when popup is not open
      console.log('Could not notify popup, it might be closed');
    });
  });
  
  muteBtn.addEventListener('click', () => {
    toggleMute(container, muteBtn);
  });
}

// Toggle minimize state
function toggleMinimize(container, minimizeBtn) {
  const iframe = container.querySelector('iframe');
  const isMinimized = iframe.style.display === 'none';
  
  if (isMinimized) {
    // Expand
    container.style.height = container.dataset.prevHeight || '300px';
    iframe.style.display = 'block';
    minimizeBtn.textContent = '−';
  } else {
    // Store current height before minimizing
    container.dataset.prevHeight = container.style.height;
    // Minimize
    container.style.height = '30px';
    iframe.style.display = 'none';
    minimizeBtn.textContent = '+';
  }
}

// Toggle game visibility
function toggleGameVisibility() {
  if (!gameContainer) return;
  
  if (isGameVisible) {
    gameContainer.style.display = 'flex';
  } else {
    gameContainer.style.display = 'none';
    
    // Unmute the tab when hiding the game via the popup toggle
    if (isTabMuted) {
      isTabMuted = false;
      localStorage.setItem('rosebudTabMuted', isTabMuted);
      
      // Find and update the mute button if it exists
      const muteBtn = gameContainer.querySelector('.rosebud-mute-btn');
      if (muteBtn) {
        updateMuteButtonState(muteBtn);
      }
      
      // Tell background script to unmute the tab
      chrome.runtime.sendMessage({
        action: 'toggleTabMute',
        muted: false
      }).catch(err => {
        console.log('Could not send unmute message to background script', err);
      });
    }
  }
}

// Helper function to update size button states
function updateSizeButtonsState(sizeButtons, activeMode) {
  // Remove active class from all buttons
  sizeButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Add active class to the correct button
  if (activeMode === SIZE_MODES.NORMAL) {
    sizeButtons[0].classList.add('active');
  } else if (activeMode === SIZE_MODES.LARGE) {
    sizeButtons[1].classList.add('active');
  } else if (activeMode === SIZE_MODES.EXTRA_LARGE) {
    sizeButtons[2].classList.add('active');
  }
}

// Function to toggle tab mute state
function toggleMute(container, muteBtn) {
  // Toggle mute state
  isTabMuted = !isTabMuted;
  
  // Save state to localStorage
  localStorage.setItem('rosebudTabMuted', isTabMuted);
  
  // Update button appearance
  updateMuteButtonState(muteBtn);
  
  // Use chrome.tabs API to mute/unmute the current tab
  chrome.runtime.sendMessage({
    action: 'toggleTabMute',
    muted: isTabMuted
  }).catch(err => {
    console.log('Could not send mute message to background script', err);
  });
}

// Function to update mute button appearance based on state
function updateMuteButtonState(muteBtn) {
  if (isTabMuted) {
    muteBtn.textContent = '🔇';
    muteBtn.classList.add('muted');
    muteBtn.title = 'Unmute sound';
  } else {
    muteBtn.textContent = '🔊';
    muteBtn.classList.remove('muted');
    muteBtn.title = 'Mute sound';
  }
}

// Function to load the next random game
function loadNextRandomGame() {
  const randomGameUrl = getRandomGame();
  console.log('Loading next random game:', randomGameUrl);
  
  // Store the URL and current mute state in localStorage before refreshing
  localStorage.setItem('rosebudGameUrl', randomGameUrl);
  localStorage.setItem('rosebudTabMuted', isTabMuted);
  
  // Refresh the page to avoid CORS issues
  window.location.reload();
}

// Call init when page has loaded
if (document.readyState === 'complete') {
  initGameFrame();
} 