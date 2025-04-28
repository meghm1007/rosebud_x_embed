// Wait for page to load
document.addEventListener('DOMContentLoaded', initGameFrame);
// Also try on window load in case DOMContentLoaded already fired
window.addEventListener('load', initGameFrame);
// Listen for URL changes on Twitter/X to detect when navigating to posts
window.addEventListener('load', () => {
  observeUrlChanges();
  // Check current URL on initial load
  checkForXPostAndExtractLinks();
});

// Track if frame has been created
let frameCreated = false;
let gameContainer = null;

// Function to find and extract links from current X post
function checkForXPostAndExtractLinks() {
  const url = window.location.href;
  // Check if current URL matches X post pattern (x.com/username/status/id)
  if (url.match(/https?:\/\/(x|twitter)\.com\/[^\/]+\/status\/\d+/)) {
    console.log('X Post detected:', url);
    
    // Wait for content to load
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

// Observe URL changes using History API
function observeUrlChanges() {
  // Monitor history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    checkForXPostAndExtractLinks();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    checkForXPostAndExtractLinks();
  };
  
  // Also listen for popstate events
  window.addEventListener('popstate', () => {
    checkForXPostAndExtractLinks();
  });
}

function initGameFrame() {
  // Only create the frame once
  if (frameCreated) return;
  
  // Create container for our game frame
  gameContainer = document.createElement('div');
  gameContainer.id = 'rosebud-game-container';
  gameContainer.className = 'rosebud-game-container';
  
  // Create iframe for game
  const gameFrame = document.createElement('iframe');
  gameFrame.src = 'https://rosebud.ai/p/6b51a6f1-288b-4579-9b81-068d49c81b1f';
  gameFrame.frameBorder = '0';
  gameFrame.allowFullscreen = true;
  gameFrame.allow = 'autoplay; fullscreen *; geolocation; microphone; camera; midi; monetization; xr-spatial-tracking; gamepad; gyroscope; accelerometer; xr; cross-origin-isolated';
  gameFrame.sandbox = 'allow-forms allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-top-navigation';
  
  // Create controls for the game container
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'rosebud-controls';
  
  const dragHandle = document.createElement('div');
  dragHandle.className = 'rosebud-drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'Drag to move';
  
  const minimizeButton = document.createElement('button');
  minimizeButton.className = 'rosebud-minimize-btn';
  minimizeButton.textContent = '−';
  minimizeButton.title = 'Minimize game';
  
  const resizeButton = document.createElement('button');
  resizeButton.className = 'rosebud-resize-btn';
  resizeButton.textContent = '⤡';
  resizeButton.title = 'Toggle size';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'rosebud-close-btn';
  closeButton.textContent = '×';
  closeButton.title = 'Close game';
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'rosebud-resize-handle';
  resizeHandle.title = 'Drag to resize';
  
  // Add elements to DOM
  controlsDiv.appendChild(dragHandle);
  controlsDiv.appendChild(minimizeButton);
  controlsDiv.appendChild(resizeButton);
  controlsDiv.appendChild(closeButton);
  gameContainer.appendChild(controlsDiv);
  gameContainer.appendChild(gameFrame);
  gameContainer.appendChild(resizeHandle);
  document.body.appendChild(gameContainer);
  
  // Mark as created
  frameCreated = true;
  
  // Setup drag functionality
  setupDrag(gameContainer, dragHandle);
  
  // Setup resize functionality
  setupResize(gameContainer, resizeHandle);
  
  // Setup button functionality
  setupButtons(gameContainer, minimizeButton, resizeButton, closeButton);
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
  }
}

// Setup minimize and close buttons
function setupButtons(container, minimizeBtn, resizeBtn, closeBtn) {
  let minimized = false;
  let enlarged = false;
  let originalWidth = '300px';
  let originalHeight = '300px';
  
  minimizeBtn.addEventListener('click', () => {
    toggleMinimize(container, minimizeBtn);
  });
  
  resizeBtn.addEventListener('click', () => {
    if (enlarged) {
      // Return to original size
      container.style.width = originalWidth;
      container.style.height = originalHeight;
      resizeBtn.textContent = '⤡';
      resizeBtn.title = 'Enlarge game';
    } else {
      // Store original size if not minimized
      if (!minimized) {
        originalWidth = container.style.width || '300px';
        originalHeight = container.style.height || '300px';
      }
      // Enlarge to preset large size
      container.style.width = '600px';
      container.style.height = '450px';
      resizeBtn.textContent = '⊙';
      resizeBtn.title = 'Restore size';
      
      // If was minimized, un-minimize it
      if (minimized) {
        toggleMinimize(container, minimizeBtn);
      }
    }
    enlarged = !enlarged;
  });
  
  closeBtn.addEventListener('click', () => {
    container.style.display = 'none';
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
  if (!frameCreated) {
    initGameFrame();
  } else if (gameContainer) {
    if (gameContainer.style.display === 'none') {
      gameContainer.style.display = 'flex';
    } else {
      gameContainer.style.display = 'none';
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'toggleGame') {
    toggleGameVisibility();
  }
});

// Call init when page has loaded
if (document.readyState === 'complete') {
  initGameFrame();
} 