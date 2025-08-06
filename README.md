# UOA Course Calendar Exporter

A Chrome browser extension for extracting course information from the University of Auckland student portal and exporting it to ICS calendar format.

## Features

- 🎓 Automatically extract University of Auckland course information
- 📅 Generate standard ICS calendar files
- 🖱️ Simple and easy-to-use user interface
- 🔄 Support for dynamically loaded course content
- 📱 Modern UI design

## Installation Instructions

### Developer Mode Installation

1. Open Chrome browser
2. Visit `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked extension"
5. Select this project folder
6. Extension installation complete!

## Usage

1. **Visit University of Auckland Student Portal**
   - Login to https://www.student.auckland.ac.nz/
   - Navigate to the course calendar page
   - or
   - Just go to https://www.student.auckland.ac.nz/psc/ps/EMPLOYEE/SA/c/UOA_MENU_FL.UOA_VW_CAL_FL.GBL (Weekly Calendar View and 12 hour)

2. **Extract Course Information**
   - Click the extension icon in the Chrome toolbar
   - Click the "Extract Course Information" button
   - The extension will automatically scan the page and extract course information
   - If you encounter issues, you can click the "Debug Page Structure" button to view page structure analysis

3. **Export ICS File**
   - After extraction is complete, click the "Export to ICS" button
   - Choose save location, file will be downloaded automatically

## Project Structure

```
UOAICS/
├── manifest.json          # Extension configuration file
├── popup.html             # Popup window interface
├── popup.js               # Popup window logic
├── content.js             # Content script (executed in target page)
├── background.js          # Background service worker
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # Project documentation
```

## Technical Implementation

### Course Information Extraction

The extension extracts course information through the following methods:

1. **Primary Selector**: `td.uoa_gridborder_cal.uoa_cal_ENRL_stat`
2. **Backup Selectors**: Multiple backup selectors ensure compatibility
3. **Data Parsing**: Parse course time, code, room, and building information

### ICS File Generation

The generated ICS file contains:
- Standard iCalendar format
- Course time information
- Room and building location
- Unique event ID

### Supported Course Format

The extension can parse course information in the following format:
```
12:00PM - 3:00PM
GLMI 709
260-223
OGGB
```

## Permission Requirements

The extension requires the following permissions:
- `activeTab`: Access current tab
- `scripting`: Execute scripts in target page
- `downloads`: Download generated ICS files
- `host_permissions`: Access University of Auckland website

## Development Guide

### Local Development

1. Clone the project to local
2. Load the extension in Chrome extension management page
3. Click "Reload" button after modifying code

### Debugging

- Open Chrome Developer Tools
- View Console tab for debug information
- Use Chrome extension's "Inspect popup" feature to debug popup

## Important Notes

1. **Icon Files**: Currently using placeholder files, need to replace with real PNG icons for actual use
2. **Course Time**: The extension assumes courses are in the current semester, may need adjustment based on actual semester
3. **Website Compatibility**: If the University of Auckland website structure changes, selectors may need to be updated

## Troubleshooting

### Common Issues

1. **Unable to Extract Course Information**
   - Ensure you're on the correct University of Auckland student portal page
   - Check if the page is fully loaded
   - View error messages in browser console

2. **ICS File Format Error**
   - Ensure course time format is correct
   - Check the generated ICS file content

3. **Extension Cannot Install**
   - Ensure developer mode is enabled
   - Check if manifest.json file format is correct

## Changelog

### v1.4.0
- Fixed course duplicate extraction issue
- Resolved weekday showing as "Unknown" problem
- Optimized course extraction logic to avoid duplicate data
- Ensure each course is extracted only once with correct weekday

### v1.3.0
- Fixed ICS format compatibility issues
- Added complete VTIMEZONE definition
- Fixed DTSTAMP and CREATED field format
- Improved DESCRIPTION field escaping
- Ensured Google Calendar compatibility

### v1.2.0
- Added automatic weekday detection feature
- Implemented weekly recurring ICS events (RRULE:FREQ=WEEKLY)
- Used New Zealand timezone (Pacific/Auckland)
- Improved time parsing logic
- Optimized course cell positioning algorithm

### v1.1.0
- Fixed course information extraction issues
- Improved HTML parsing logic, support for `<br>` tags
- Added backup parsing methods
- Enhanced debugging functionality
- Fixed multiple space handling issues

### v1.0.0
- Initial version release
- Support for basic course information extraction
- ICS file export functionality
- Modern UI interface

## License

This project is for learning and personal use only.

## Contributing

Welcome to submit Issues and Pull Requests to improve this project!

---

**Note**: This extension is for educational purposes only, please comply with the University of Auckland's terms of use. 