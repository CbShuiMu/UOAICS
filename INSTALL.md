# Installation and Usage Guide

## Quick Start

### 1. Download Project
Make sure you have downloaded the complete project folder containing the following files:
- `manifest.json`
- `popup.html`
- `popup.js`
- `content.js`
- `background.js`
- `icons/` folder
- `README.md`

### 2. Install Chrome Extension

1. **Open Chrome Browser**

2. **Access Extension Management Page**
   - Enter in address bar: `chrome://extensions/`
   - Or click menu → More tools → Extensions

3. **Enable Developer Mode**
   - Find the "Developer mode" toggle in the top right corner
   - Click to enable (toggle will turn blue)

4. **Load Extension**
   - Click "Load unpacked extension" button
   - Select the folder containing all project files
   - Click "Select Folder"

5. **Verify Installation**
   - Extension should appear in the extension list
   - Extension icon should appear in Chrome toolbar

### 3. Test Extension Functionality

#### Method 1: Using Test Page
1. Open `test-ics.html` file in browser (recommended for testing ICS format)
2. Click the extension icon
3. Click "Extract Course Information"
4. View extracted course information (including weekdays)
5. Click "Export to ICS" to download file
6. Try importing to Google Calendar to verify format

**Note**: If you encounter issues, you can click the "Debug Page Structure" button to analyze page structure

**New Feature**: `test-ics.html` is specifically designed for testing Google Calendar compatibility

#### Method 2: Using Real Website
1. Visit University of Auckland student portal: https://www.student.auckland.ac.nz/
2. Login to your student account
3. Navigate to course calendar page
4. Use extension to extract course information

## Detailed Usage Steps

### Step 1: Access Course Page
- Ensure you're on the University of Auckland student portal course calendar page
- Page should contain course timetable

### Step 2: Extract Course Information
1. Click the extension icon in Chrome toolbar
2. Click "Extract Course Information" in the popup window
3. Wait for processing to complete
4. View the extracted course list

### Step 3: Export ICS File
1. Confirm course information is correct (including weekdays)
2. Click "Export to ICS" button
3. Choose save location
4. File will be named `uoa_courses.ics`
5. ICS file will contain weekly recurring course events

### Step 4: Import Calendar
1. Open your calendar application (such as Google Calendar, Outlook, etc.)
2. Import the downloaded ICS file
3. Courses will be automatically added to your calendar

## Troubleshooting

### Extension Cannot Install
**Problem**: No response after clicking "Load unpacked extension"
**Solution**:
- Ensure developer mode is enabled
- Check if project folder contains all necessary files
- Ensure `manifest.json` file format is correct

### Unable to Extract Course Information
**Problem**: Shows "No course data found" after clicking extract button
**Solution**:
- Ensure you're on the correct University of Auckland page
- Wait for page to fully load
- Check browser console for error messages
- Try refreshing page and extracting again

### ICS File Format Error
**Problem**: Downloaded ICS file cannot be imported to Google Calendar
**Solution**:
- Check if course time format is correct
- Ensure all necessary fields have been extracted
- Try opening ICS file with text editor to check format
- Use `test-ics.html` test page to verify format
- Ensure ICS file contains VTIMEZONE definition

### Extension Icon Not Displaying
**Problem**: Extension is installed but no icon in toolbar
**Solution**:
- Click the extension icon (puzzle piece icon) in Chrome toolbar
- Find the extension and click the pin icon to pin to toolbar
- Or reinstall the extension

## Advanced Configuration

### Custom Icons
If you want to use custom icons:
1. Prepare 16x16, 48x48, 128x128 pixel PNG images
2. Replace files in `icons/` folder
3. Reload extension

### Modify Permissions
If you need to modify extension permissions:
1. Edit `manifest.json` file
2. Modify `permissions` and `host_permissions` sections
3. Reload extension

## Development Debugging

### View Console Logs
1. Right-click extension icon
2. Select "Inspect popup"
3. View log information in Console tab

### Debug Content Script
1. Press F12 on target page to open developer tools
2. View Console tab
3. Look for logs starting with "UOA Course Exporter"

### Reload Extension
After modifying code:
1. Visit `chrome://extensions/`
2. Find the extension
3. Click "Reload" button

## Important Notes

1. **Privacy Security**: Extension only extracts data when you actively click
2. **Data Usage**: Extracted course information is only used to generate ICS files, will not be uploaded or stored
3. **Website Compatibility**: If University of Auckland website structure changes, extension may need updates
4. **Academic Integrity**: Please comply with University of Auckland's terms of use and academic integrity policies

## Getting Help

If you encounter problems:
1. Check browser console for error messages
2. Verify extension is properly installed
3. Confirm you're using it on the correct webpage
4. Try reinstalling the extension

---

**Important Reminder**: This extension is for learning and personal use only, please comply with relevant laws and school policies. 