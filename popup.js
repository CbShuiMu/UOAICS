// Store extracted course information
let extractedCourses = [];

// DOM elements
const statusEl = document.getElementById('status');
const loadingEl = document.getElementById('loading');
const extractBtn = document.getElementById('extractBtn');
const debugBtn = document.getElementById('debugBtn');
const exportBtn = document.getElementById('exportBtn');
const courseInfoEl = document.getElementById('courseInfo');
const courseListEl = document.getElementById('courseList');

// Update status display
function updateStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Show/hide loading state
function setLoading(loading) {
    loadingEl.style.display = loading ? 'block' : 'none';
    extractBtn.disabled = loading;
}

// Display course information
function displayCourses(courses) {
    if (courses.length === 0) {
        courseListEl.innerHTML = '<p>No courses found</p>';
    } else {
        courseListEl.innerHTML = courses.map(course => `
            <div class="course-item">
                <strong>${course.code}</strong><br>
                Time: ${course.time}<br>
                Room: ${course.room}<br>
                Building: ${course.building}<br>
                Weekday: ${course.weekday || 'Unknown'}
            </div>
        `).join('');
    }
    courseInfoEl.style.display = 'block';
}

// Extract course information button event
extractBtn.addEventListener('click', async () => {
    setLoading(true);
    updateStatus('Extracting course information...', 'info');
    
    try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if on correct website
        if (!tab.url.includes('student.auckland.ac.nz')) {
            updateStatus('Please navigate to the UOA student portal first', 'error');
            setLoading(false);
            return;
        }
        
        // Send message to content script to extract course data
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractCourses' });
        
        if (response && response.success && response.courses) {
            extractedCourses = response.courses;
            updateStatus(`Found ${extractedCourses.length} courses`, 'success');
            displayCourses(extractedCourses);
            exportBtn.disabled = false;
        } else {
            updateStatus('No course data found on this page', 'error');
        }
    } catch (error) {
        console.error('Error extracting courses:', error);
        updateStatus('Error extracting courses: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

// Export ICS button event
exportBtn.addEventListener('click', async () => {
    if (extractedCourses.length === 0) {
        updateStatus('No courses to export', 'error');
        return;
    }
    
    setLoading(true);
    updateStatus('Generating ICS file...', 'info');
    
    try {
        const icsContent = generateICS(extractedCourses);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        
        // Download file
        await chrome.downloads.download({
            url: url,
            filename: 'uoa_courses.ics',
            saveAs: true
        });
        
        updateStatus('ICS file exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting ICS:', error);
        updateStatus('Error exporting ICS: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

// Debug page structure button event
debugBtn.addEventListener('click', async () => {
    setLoading(true);
    updateStatus('Analyzing page structure...', 'info');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to content script to debug page structure
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'debugPageStructure' });
        
        if (response && response.success && response.debugInfo) {
            const debugInfo = response.debugInfo;
            updateStatus(`Found ${debugInfo.totalCells} total cells, ${debugInfo.courseCells} course cells`, 'success');
            
            // Display debug information
            courseListEl.innerHTML = `
                <div class="course-item">
                    <strong>Debug Information:</strong><br>
                    Total table cells: ${debugInfo.totalCells}<br>
                    Course cells found: ${debugInfo.courseCells}<br>
                    Cells with span: ${debugInfo.cellsWithSpan}<br>
                    Cells with links: ${debugInfo.cellsWithLinks}<br>
                    Weekdays found: ${debugInfo.weekdays.join(', ')}<br>
                    <br>
                    <strong>Sample Course Data:</strong><br>
                    ${debugInfo.sampleData.map(item => 
                        `${item.time} | ${item.code} | ${item.room} | ${item.building} | ${item.weekday}`
                    ).join('<br>')}
                </div>
            `;
            courseInfoEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error debugging page:', error);
        updateStatus('Error analyzing page: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});





// Generate ICS file content
function generateICS(courses) {
    const now = new Date();
    
    // Format UTC time
    function formatUTC(date) {
        return date.getUTCFullYear().toString() +
               (date.getUTCMonth() + 1).toString().padStart(2, '0') +
               date.getUTCDate().toString().padStart(2, '0') + 'T' +
               date.getUTCHours().toString().padStart(2, '0') +
               date.getUTCMinutes().toString().padStart(2, '0') +
               date.getUTCSeconds().toString().padStart(2, '0') + 'Z';
    }
    
    // Format local time
    function formatLocal(date, hour, min) {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const h = hour.toString().padStart(2, '0');
        const mi = min.toString().padStart(2, '0');
        return `${y}${m}${d}T${h}${mi}00`;
    }
    
    const icsHeader = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//UOA Course Exporter//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VTIMEZONE',
        'TZID:Pacific/Auckland',
        'TZURL:http://tzurl.org/zoneinfo-outlook/Pacific/Auckland',
        'X-LIC-LOCATION:Pacific/Auckland',
        'BEGIN:DAYLIGHT',
        'TZOFFSETFROM:+1200',
        'TZOFFSETTO:+1300',
        'TZNAME:NZDT',
        'DTSTART:19700927T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=-1SU',
        'END:DAYLIGHT',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:+1300',
        'TZOFFSETTO:+1200',
        'TZNAME:NZST',
        'DTSTART:19700405T030000',
        'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU',
        'END:STANDARD',
        'END:VTIMEZONE'
    ];
    const icsFooter = ['END:VCALENDAR'];

    // ICS events
    const events = courses.map((course, index) => {
        // Parse time string
        const timeMatch = course.time.match(/(\d{1,2}):(\d{2})(AM|PM)\s*-\s*(\d{1,2}):(\d{2})(AM|PM)/i);
        if (!timeMatch) return null;
        let [, sh, sm, sap, eh, em, eap] = timeMatch;
        sh = parseInt(sh); eh = parseInt(eh);
        if (sap.toUpperCase() === 'PM' && sh !== 12) sh += 12;
        if (sap.toUpperCase() === 'AM' && sh === 12) sh = 0;
        if (eap.toUpperCase() === 'PM' && eh !== 12) eh += 12;
        if (eap.toUpperCase() === 'AM' && eh === 12) eh = 0;

        // Use current week's Monday as baseline, calculate the day of this week
        const today = new Date();
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Sunday is 7
        const courseDayIdx = ['MO','TU','WE','TH','FR','SA','SU'].indexOf(course.weekday);
        const diff = courseDayIdx + 1 - dayOfWeek;
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + diff);

        const dtstart = formatLocal(eventDate, sh, parseInt(sm));
        const dtend = formatLocal(eventDate, eh, parseInt(em));
        const dtstamp = formatUTC(now);
        const created = formatUTC(now);

        const uid = `uoa-course-${index}-${Date.now()}@uoa-exporter`;
        
        // Escape special characters in description
        const description = `Room: ${course.room}\\nBuilding: ${course.building}`;

        return [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `CREATED:${created}`,
            `DTSTART;TZID=Pacific/Auckland:${dtstart}`,
            `DTEND;TZID=Pacific/Auckland:${dtend}`,
            `RRULE:FREQ=WEEKLY;BYDAY=${course.weekday}`,
            `SUMMARY:${course.code}`,
            `DESCRIPTION:${description}`,
            `LOCATION:${course.building} ${course.room}`,
            'END:VEVENT'
        ].join('\r\n');
    }).filter(Boolean);

    return [...icsHeader, ...events, ...icsFooter].join('\r\n');
} 