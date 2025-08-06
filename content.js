// Content script - executed in target webpage
console.log('UOA Course Exporter: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractCourses') {
        const courses = extractCourseData();
        sendResponse({ success: true, courses: courses });
    } else if (request.action === 'debugPageStructure') {
        const debugInfo = debugPageStructure();
        sendResponse({ success: true, debugInfo: debugInfo });
    }
});

// Extract course data function
function extractCourseData() {
    const courses = [];
    const seenCourses = new Set(); // For deduplication
    
    // Weekday mapping
    const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    
    // Find course tables - more precise selector
    const courseTables = document.querySelectorAll('table.uoa_gridborder_cal');
    
    courseTables.forEach(table => {
        // Record course occupancy for each time slot
        const timeSlotOccupancy = new Map(); // Store time slot to occupied td count mapping
        
        // Process each row of data
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(tr => {
            const rowCourses = processTableRowWithOccupancy(tr, weekDays, seenCourses, timeSlotOccupancy);
            courses.push(...rowCourses);
        });
    });
    
    // Sort by course code and time
    courses.sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code);
        }
        return a.time.localeCompare(b.time);
    });
    
    return courses;
}

// Extract table header mapping
function extractHeaderMap(table) {
    const headerMap = new Map(); // Store column index to weekday mapping
    const headerRow = table.querySelector('tr');
    
    if (!headerRow) return headerMap;
    
    const headerCells = headerRow.querySelectorAll('td, th');
    let dayIndex = 0;
    
    for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i];
        
        // Skip time column
        if (cell.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        // Parse header text to get weekday
        const headerText = cell.textContent?.trim() || '';
        const dayMap = {
            'Monday': 'MO', 'Mon': 'MO',
            'Tuesday': 'TU', 'Tue': 'TU',
            'Wednesday': 'WE', 'Wed': 'WE',
            'Thursday': 'TH', 'Thu': 'TH',
            'Friday': 'FR', 'Fri': 'FR',
            'Saturday': 'SA', 'Sat': 'SA',
            'Sunday': 'SU', 'Sun': 'SU'
        };
        
        for (const [key, value] of Object.entries(dayMap)) {
            if (headerText.includes(key)) {
                headerMap.set(dayIndex, value);
                break;
            }
        }
        
        dayIndex++;
    }
    
    return headerMap;
}

// Process single table row (calculate weekday by td count)
function processTableRowWithOccupancy(tr, weekDays, seenCourses, timeSlotOccupancy) {
    const rowCourses = [];
    const tds = tr.querySelectorAll('td');
    let dayIdx = -1;
    
    // Get current row time information
    const timeCell = tr.querySelector('td.uoa_timecol_cal span');
    const currentTime = timeCell ? timeCell.textContent.trim() : '';
    
    // Calculate the starting weekday for current row
    // Each tr should have 7 tds (Monday to Sunday), if only 5 tds, it means 2 are occupied, should start from Tuesday
    const expectedTds = 7; // Expected td count (excluding time column)
    const actualTds = tds.length ; // Actual td count (excluding time column)
    const missingTds = expectedTds - actualTds; // Missing td count
    
    // Record current row course occupancy
    let currentRowOccupancy = 0;
    
    for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        
        // Skip time column
        if (td.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        // Process course cells
        if (td.className.includes('uoa_cal_ENRL_stat')) {
            dayIdx++;
            currentRowOccupancy++;
            
            // Calculate correct weekday index: start from missing td count
            const adjustedDayIdx = dayIdx + missingTds;
            
            const courseData = extractCourseFromCellSimple(td, adjustedDayIdx, weekDays);
            
            if (courseData) {
                // Create unique identifier for deduplication
                const courseKey = `${courseData.code}-${courseData.time}-${courseData.room}-${courseData.building}-${courseData.weekday}`;
                
                if (!seenCourses.has(courseKey)) {
                    seenCourses.add(courseKey);
                    rowCourses.push(courseData);
                }
            }
        } else {
            // If not a course cell, still increment date index
            dayIdx++;
        }
    }
    
    // Update time slot occupancy (record missing td count)
    if (currentTime && missingTds > 0) {
        timeSlotOccupancy.set(currentTime, missingTds);
    }
    
    return rowCourses;
}

// Process single table row (backward compatibility)
function processTableRow(tr, headerMap, weekDays, seenCourses) {
    const rowCourses = [];
    const tds = tr.querySelectorAll('td');
    let dayIdx = -1;
    
    for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        
        // Skip time column
        if (td.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        // Process course cells
        if (td.className.includes('uoa_cal_ENRL_stat')) {
            dayIdx++;
            
            const courseData = extractCourseFromCell(td, dayIdx, headerMap, weekDays);
            
            if (courseData) {
                // Create unique identifier for deduplication
                const courseKey = `${courseData.code}-${courseData.time}-${courseData.room}-${courseData.building}-${courseData.weekday}`;
                
                if (!seenCourses.has(courseKey)) {
                    seenCourses.add(courseKey);
                    rowCourses.push(courseData);
                }
            }
        } else {
            // If not a course cell, still increment date index
            dayIdx++;
        }
    }
    
    return rowCourses;
}

// Extract course information from single cell (simplified version, no header mapping dependency)
function extractCourseFromCellSimple(td, dayIdx, weekDays) {
    // Find course link
    let link = td.querySelector('a');
    if (!link) {
        const span = td.querySelector('span');
        if (span) {
            link = span.querySelector('a');
        }
    }
    
    if (!link) return null;
    
    // Parse course information
    let html = link.innerHTML;
    html = html.replace(/<br\s*\/?>/gi, '|||');
    html = html.replace(/<[^>]+>/g, '');
    const lines = html.split('|||').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 4) return null;
    
    // Directly use index to calculate weekday
    let weekday = weekDays[dayIdx] || 'Unknown';
    
    return {
        time: lines[0],
        code: lines[1].replace(/\s+/g, ' '),
        room: lines[2],
        building: lines[3],
        weekday: weekday,
        rawText: html
    };
}

// Extract course information from single cell (backward compatibility)
function extractCourseFromCell(td, dayIdx, headerMap, weekDays) {
    // Find course link
    let link = td.querySelector('a');
    if (!link) {
        const span = td.querySelector('span');
        if (span) {
            link = span.querySelector('a');
        }
    }
    
    if (!link) return null;
    
    // Parse course information
    let html = link.innerHTML;
    html = html.replace(/<br\s*\/?>/gi, '|||');
    html = html.replace(/<[^>]+>/g, '');
    const lines = html.split('|||').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 4) return null;
    
    // Use header mapping to get weekday, fallback to default index if no mapping
    let weekday = headerMap.get(dayIdx) || weekDays[dayIdx] || 'Unknown';
    
    return {
        time: lines[0],
        code: lines[1].replace(/\s+/g, ' '),
        room: lines[2],
        building: lines[3],
        weekday: weekday,
        rawText: html
    };
}

// Debug page structure function
function debugPageStructure() {
    const debugInfo = {
        totalCells: 0,
        courseCells: 0,
        cellsWithSpan: 0,
        cellsWithLinks: 0,
        sampleData: [],
        weekdays: []
    };
    
    // Count all table cells
    const allCells = document.querySelectorAll('td');
    debugInfo.totalCells = allCells.length;
    
    // Find course tables
    const courseTables = document.querySelectorAll('table.uoa_gridborder_cal');
    const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    
    courseTables.forEach(table => {
        // Record course occupancy for each time slot
        const timeSlotOccupancy = new Map(); // Store time slot to occupied td count mapping
        
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(tr => {
            processTableRowForDebugWithOccupancy(tr, weekDays, debugInfo, timeSlotOccupancy);
        });
    });
    
    return debugInfo;
}

// Process single table row for debugging (calculate weekday by td count)
function processTableRowForDebugWithOccupancy(tr, weekDays, debugInfo, timeSlotOccupancy) {
    const tds = tr.querySelectorAll('td');
    let dayIdx = -1;
    
    // Get current row time information
    const timeCell = tr.querySelector('td.uoa_timecol_cal span');
    const currentTime = timeCell ? timeCell.textContent.trim() : '';
    
    // Calculate the starting weekday for current row
    // Each tr should have 7 tds (Monday to Sunday), if only 5 tds, it means 2 are occupied, should start from Tuesday
    const expectedTds = 7; // Expected td count (excluding time column)
    const actualTds = tds.length - 1; // Actual td count (excluding time column)
    const missingTds = expectedTds - actualTds; // Missing td count
    
    for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        
        if (td.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        if (td.className.includes('uoa_cal_ENRL_stat')) {
            dayIdx++;
            debugInfo.courseCells++;
            
            // Check if there's a span
            if (td.querySelector('span')) {
                debugInfo.cellsWithSpan++;
            }
            
            // Check if there's a link
            let link = td.querySelector('a');
            if (!link) {
                const span = td.querySelector('span');
                if (span) {
                    link = span.querySelector('a');
                }
            }
            
            if (link) {
                debugInfo.cellsWithLinks++;
                
                // Calculate correct weekday index: start from missing td count
                const adjustedDayIdx = dayIdx + missingTds;
                let weekday = weekDays[adjustedDayIdx] || 'Unknown';
                
                if (!debugInfo.weekdays.includes(weekday)) {
                    debugInfo.weekdays.push(weekday);
                }
                
                // Try to parse course data
                let html = link.innerHTML;
                html = html.replace(/<br\s*\/?>/gi, '|||');
                html = html.replace(/<[^>]+>/g, '');
                const lines = html.split('|||').map(line => line.trim()).filter(line => line.length > 0);
                
                if (lines.length >= 4 && debugInfo.sampleData.length < 3) {
                    debugInfo.sampleData.push({
                        time: lines[0],
                        code: lines[1].replace(/\s+/g, ' '),
                        room: lines[2],
                        building: lines[3],
                        weekday: weekday
                    });
                }
            }
        } else {
            dayIdx++;
        }
    }
    
    // Update time slot occupancy (record missing td count)
    if (currentTime && missingTds > 0) {
        timeSlotOccupancy.set(currentTime, missingTds);
    }
}

// Process single table row for debugging (backward compatibility)
function processTableRowForDebug(tr, headerMap, weekDays, debugInfo) {
    const tds = tr.querySelectorAll('td');
    let dayIdx = -1;
    
    for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        
        if (td.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        if (td.className.includes('uoa_cal_ENRL_stat')) {
            dayIdx++;
            debugInfo.courseCells++;
            
            // Check if there's a span
            if (td.querySelector('span')) {
                debugInfo.cellsWithSpan++;
            }
            
            // Check if there's a link
            let link = td.querySelector('a');
            if (!link) {
                const span = td.querySelector('span');
                if (span) {
                    link = span.querySelector('a');
                }
            }
            
            if (link) {
                debugInfo.cellsWithLinks++;
                
                // Use header mapping to get weekday, fallback to default index if no mapping
                let weekday = headerMap.get(dayIdx) || weekDays[dayIdx] || 'Unknown';
                
                if (!debugInfo.weekdays.includes(weekday)) {
                    debugInfo.weekdays.push(weekday);
                }
                
                // Try to parse course data
                let html = link.innerHTML;
                html = html.replace(/<br\s*\/?>/gi, '|||');
                html = html.replace(/<[^>]+>/g, '');
                const lines = html.split('|||').map(line => line.trim()).filter(line => line.length > 0);
                
                if (lines.length >= 4 && debugInfo.sampleData.length < 3) {
                    debugInfo.sampleData.push({
                        time: lines[0],
                        code: lines[1].replace(/\s+/g, ' '),
                        room: lines[2],
                        building: lines[3],
                        weekday: weekday
                    });
                }
            }
        } else {
            dayIdx++;
        }
    }
}

