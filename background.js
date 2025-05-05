// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle tab mute toggling
  if (request.action === 'toggleTabMute') {
    // Get the tab ID that sent the message
    const tabId = sender.tab.id;
    
    // Update the tab's muted state
    chrome.tabs.update(tabId, { muted: request.muted }).then(() => {
      console.log(`Tab ${tabId} muted state set to ${request.muted}`);
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error toggling tab mute:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  // Handle new t.co link found
  if (request.action === 'newTcoLinkFound') {
    console.log('Background script received t.co link:', request.tcoLink);
    
    // Store the t.co link in local storage accessible to popup
    chrome.storage.local.set({
      lastTcoLink: request.tcoLink,
      allTcoLinks: request.allLinks,
      tcoLinkTimestamp: Date.now(),
      possibleGame: request.possibleGame,
      contextInfo: request.contextInfo || {}
    });
    
    // Set badge text based on context - use "GAME" if it seems like a game, otherwise just "✓"
    const badgeText = request.possibleGame ? "GAME" : "✓";
    
    // Set a badge on the extension icon to indicate a game is ready
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: request.possibleGame ? "#5e17eb" : "#990000" });
    
    // Broadcast to any open popups
    chrome.runtime.sendMessage({
      action: 'tcoLinkUpdated',
      tcoLink: request.tcoLink,
      possibleGame: request.possibleGame,
      contextInfo: request.contextInfo
    });
    
    return true;
  }
  
  // Handle t.co link resolution
  if (request.action === 'resolveTcoLink') {
    console.log('Attempting to resolve t.co link:', request.url);
    
    // Use XMLHttpRequest instead of fetch to better handle redirects
    const xhr = new XMLHttpRequest();
    xhr.open('GET', request.url, true);
    
    // We're only interested in the final URL, so don't actually complete the request
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 2) { // HEADERS_RECEIVED
        // Get the final URL after all redirects
        const resolvedUrl = xhr.responseURL || request.url;
        console.log('Resolved t.co link to:', resolvedUrl);
        xhr.abort(); // Don't need to complete the request
        sendResponse({ success: true, resolvedUrl: resolvedUrl });
      }
    };
    
    xhr.onerror = function(error) {
      console.error('Error resolving t.co link:', error);
      sendResponse({ success: false, error: 'Failed to resolve URL' });
    };
    
    try {
      xhr.send();
    } catch (error) {
      console.error('Exception resolving t.co link:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep the message channel open for async response
  }
  
  // Clear badge when popup is opened
  if (request.action === 'popupOpened') {
    chrome.action.setBadgeText({ text: "" });
    return true;
  }
});

// Listen for installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('RosebudX extension installed or updated');
  
  // Clear any existing badge
  chrome.action.setBadgeText({ text: "" });
}); 