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

// Track if frame has been created
let frameCreated = false;
let gameContainer = null;

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
  // Only create the frame once
  if (frameCreated) return;
  
  // Create container for our game frame
  gameContainer = document.createElement('div');
  gameContainer.id = 'rosebud-game-container';
  gameContainer.className = 'rosebud-game-container';
  
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
  gameFrame.src = 'https://rosebud.ai/p/6b51a6f1-288b-4579-9b81-068d49c81b1f';
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
  controlsDiv.appendChild(resizeButton);
  controlsDiv.appendChild(closeButton);
  gameContainer.appendChild(controlsDiv);
  gameContainer.appendChild(urlInputContainer);
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
    iframe.src = url;
    
    // Clear any error styling
    input.style.borderColor = '';
    input.title = '';
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