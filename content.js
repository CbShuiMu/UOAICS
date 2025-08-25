// Content script - executed in target webpage
console.log('UOA Course Exporter: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'extractCourses') {
        try {
            const courses = extractCourseData();
            console.log('Extracted courses:', courses);
            sendResponse({ success: true, courses: courses });
        } catch (error) {
            console.error('Error in extractCourseData:', error);
            sendResponse({ success: false, error: error.message });
        }
    } else {
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
});

// Extract course data function
function extractCourseData() {
    console.log('Starting course extraction...');
    
    const courses = [];
    const seenCourses = new Set(); // For deduplication
    
    // Weekday mapping
    const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    
    // Find course tables - more precise selector
    const courseTables = document.querySelectorAll('table.uoa_gridborder_cal');
    console.log('Found course tables:', courseTables.length);
    
    if (courseTables.length === 0) {
        console.log('No course tables found. Available tables:', document.querySelectorAll('table'));
    }
    
    courseTables.forEach((table, tableIndex) => {
        console.log(`Processing table ${tableIndex + 1}`);
        
        // Record course occupancy for each time slot
        const timeSlotOccupancy = new Map(); // Store time slot to occupied td count mapping
        
        // Process each row of data
        const rows = table.querySelectorAll('tr');
        console.log(`Table ${tableIndex + 1} has ${rows.length} rows`);
        
        rows.forEach((tr, rowIndex) => {
            const rowCourses = processTableRowWithOccupancy(tr, weekDays, seenCourses, timeSlotOccupancy);
            if (rowCourses.length > 0) {
                console.log(`Row ${rowIndex + 1} found ${rowCourses.length} courses`);
            }
            courses.push(...rowCourses);
        });
    });
    
    console.log(`Total courses found: ${courses.length}`);
    
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
    
    // Get current row time information
    const timeCell = tr.querySelector('td.uoa_timecol_cal span');
    const currentTime = timeCell ? timeCell.textContent.trim() : '';
    
    // Get actual td count (excluding time column)
    const actualTds = tds.length - 1; // Subtract time column
    
    // Calculate which weekdays are available for this row
    // Start with all weekdays and remove those affected by previous spans
    let availableWeekdays = [...weekDays];
    
    // Check if this row is affected by previous spans from timeSlotOccupancy
    if (timeSlotOccupancy && timeSlotOccupancy.size > 0) {
        // Get all previous spans that affect this row
        const previousSpans = Array.from(timeSlotOccupancy.entries());
        
        // For each previous span, remove the affected weekdays
        previousSpans.forEach(([timeSlot, spanInfos]) => {
            // spanInfos is now an array of spans
            if (Array.isArray(spanInfos)) {
                spanInfos.forEach(spanInfo => {
                    if (spanInfo.affectedWeekdays && spanInfo.remainingRows > 0) {
                        spanInfo.affectedWeekdays.forEach(weekday => {
                            const index = availableWeekdays.indexOf(weekday);
                            if (index !== -1) {
                                availableWeekdays.splice(index, 1);
                            }
                        });
                        // Decrease the remaining rows count
                        spanInfo.remainingRows--;
                    }
                });
            }
        });
    }
    
    // If we have fewer available weekdays than actual tds, adjust
    if (availableWeekdays.length < actualTds) {
        // This shouldn't happen in normal cases, but handle it gracefully
        availableWeekdays = availableWeekdays.slice(0, actualTds);
    }
    
    // Track current spans for this row (multiple courses can have spans)
    let currentSpans = [];
    let dayIdx = 0;
    
    for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        
        // Skip time column
        if (td.className.includes('uoa_timecol_cal')) {
            continue;
        }
        
        // Process course cells
        if (td.className.includes('uoa_cal_ENRL_stat')) {
            // Get the weekday for this position
            const currentWeekday = availableWeekdays[dayIdx] || 'Unknown';
            
            // Get span attribute (rowspan, not colspan)
            const span = td.getAttribute('rowspan');
            const spanValue = span ? parseInt(span) : 1;
            
            // If this cell has a span, record it for future rows
            if (spanValue > 1) {
                const spanInfo = {
                    spanValue: spanValue,
                    startWeekday: currentWeekday,
                    affectedWeekdays: [currentWeekday], // Only affect the current weekday
                    remainingRows: spanValue - 1 // Track how many more rows this span affects
                };
                currentSpans.push(spanInfo);
            }
            
            const courseData = extractCourseFromCellSimple(td, dayIdx, availableWeekdays);
            
            if (courseData) {
                // Create unique identifier for deduplication
                const courseKey = `${courseData.code}-${courseData.time}-${courseData.room}-${courseData.building}-${courseData.weekday}`;
                
                if (!seenCourses.has(courseKey)) {
                    seenCourses.add(courseKey);
                    rowCourses.push(courseData);
                }
            }
            
            dayIdx++;
        } else {
            // If not a course cell, still increment day index
            dayIdx++;
        }
    }
    
    // Update time slot occupancy with span information
    if (currentTime && currentSpans.length > 0) {
        timeSlotOccupancy.set(currentTime, currentSpans);
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
function extractCourseFromCellSimple(td, dayIdx, availableWeekdays) {
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
    
    // Use the available weekdays array to get the correct weekday
    let weekday = availableWeekdays[dayIdx] || 'Unknown';
    
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



