// Background service worker
console.log('UOA Course Exporter: Background service worker loaded');

// Listen for extension installation events
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('UOA Course Exporter installed');
        
        // Can set default configuration or show welcome page here
        chrome.storage.local.set({
            'firstRun': true,
            'version': '1.0.0'
        });
    } else if (details.reason === 'update') {
        console.log('UOA Course Exporter updated');
    }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'downloadICS') {
        // Handle ICS file download
        chrome.downloads.download({
            url: request.dataUrl,
            filename: request.filename || 'uoa_courses.ics',
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('Download started with ID:', downloadId);
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        
        return true; // Keep message channel open
    }
    
    if (request.action === 'getTabInfo') {
        // Get current tab information
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                sendResponse({ 
                    success: true, 
                    tab: tabs[0],
                    isUOAPortal: tabs[0].url.includes('student.auckland.ac.nz')
                });
            } else {
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
        
        return true; // Keep message channel open
    }
});

// Listen for tab update events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('student.auckland.ac.nz')) {
        console.log('UOA portal page loaded:', tab.url);
        
        // Can inject content script or perform other operations here
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: () => {
                console.log('UOA Course Exporter: Page ready for course extraction');
            }
        }).catch(error => {
            console.error('Error injecting script:', error);
        });
    }
});

// Listen for download completion events
chrome.downloads.onChanged.addListener((downloadDelta) => {
    if (downloadDelta.state && downloadDelta.state.current === 'complete') {
        console.log('Download completed:', downloadDelta.id);
    }
});

// Error handling
chrome.runtime.onSuspend.addListener(() => {
    console.log('UOA Course Exporter: Service worker suspended');
}); 