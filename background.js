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
});

// Listen for installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('RosebudX extension installed or updated');
}); 