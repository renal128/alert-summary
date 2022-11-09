const createCell = function (tag, value) {
    const cellNode = document.createElement(tag);
    const cellTextNode = document.createTextNode(value);
    cellNode.appendChild(cellTextNode);
    return cellNode;
}

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}).join('')

const getRowBrightness = function (numAlerts) {
    if (numAlerts == 1) {
        return 255;
    } else if (numAlerts > 21) {
        return 55;
    } else {
        return 255 - 10 * numAlerts;
    }
}

const dateFormatOptions = { 
    weekday: 'short', 
    month: 'numeric', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric',
    timeZone: 'PST',
    timeZoneName: 'short'
};

const buildReportButton = document.getElementById("buildReportButton");
const copyButton = document.getElementById("copyButton");
const rawInputField = document.getElementById("rawInput");
const resultsTable = document.getElementById("resultsTable");

const tableHeader = document.createElement("tr");
tableHeader.appendChild(createCell("th", "Alert Name"));
tableHeader.appendChild(createCell("th", "Total"));
tableHeader.appendChild(createCell("th", "Triggered"));
tableHeader.appendChild(createCell("th", "Warn"));
tableHeader.appendChild(createCell("th", "Last Date (PT)"));
tableHeader.appendChild(createCell("th", "Status"));
tableHeader.appendChild(createCell("th", "Notes"));

buildReportButton.onclick = function () {
    console.log("hello");
    const rawInput = rawInputField.value;
    const lines = rawInput.split("\n");
    const timeRegex = /[0-9]:[0-9][0-9]/g;
    const ddUrlRegex = /https:\/\/app\.datadoghq\.com\/monitors\/\d+\?.+&to_ts=(\d+).*/;

    let alerts = {};
    let alertText = null;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = lines[i - 1];
        const prevLineHasTime = !!prevLine.match(timeRegex);
        if (prevLineHasTime) {
            let triggered = 0;
            let warn = 0;
            let status = ''
            if (line.startsWith("Triggered: ")) {
                alertText = line.substring(11);
                triggered = 1;
                status = 'triggered';
            } else if (line.startsWith("Warn: ")) {
                alertText = line.substring(6);
                warn = 1;
                status = 'warn';
            } else if (line.startsWith("Recovered: ")) {
                alertText = line.substring(11);
                status = 'recovered';
            }

            if (status) {
                if (!(alertText in alerts)) {
                    alerts[alertText] = { 
                        "text": alertText, 
                        "triggered": 0, 
                        "warn": 0, 
                        "last_status": "", 
                        "last_ts": null
                    };
                }
                alerts[alertText]["triggered"] += triggered;
                alerts[alertText]["warn"] += warn;
                alerts[alertText]["last_status"] = status;
                alerts[alertText]["prev_ts"] = alerts[alertText]["last_ts"];
                alerts[alertText]["last_ts"] = null;
            }
        }
        if (alertText != null && alertText in alerts && line.match(ddUrlRegex)) {
            alerts[alertText]["url"] = line;
            alerts[alertText]["last_ts"] = line.match(ddUrlRegex)[1];
        }
    }
    console.log(alerts);

    let newRowsData = [];
    let sumTriggered = 0;
    let sumWarn = 0;
    let alertsArray = [];
    for (const [alertText, alertData] of Object.entries(alerts)) {
        alertsArray.push(alertData)
        sumWarn += alertData["warn"];
        sumTriggered += alertData["triggered"];
    }
    let sumTotal = sumWarn + sumTriggered;

    alertsArray.sort((a, b) => {
        const aTotal = a["warn"] + a["triggered"]
        const bTotal = b["warn"] + b["triggered"]
        if (aTotal != bTotal)
            return bTotal - aTotal;
        if (a["triggered"] > b["triggered"])
            return 1
        return 0
    });

    let newRows = [tableHeader];
    for (var i = 0; i < alertsArray.length; i++) {
        const alert = alertsArray[i];
        const alertName = alert["text"];
        const total = alert["warn"] + alert["triggered"];
        const triggered = alert["triggered"];
        const warn = alert["warn"];
        const status = alert["last_status"];
        const url = alert["url"];
        const prevTs = alert["prev_ts"];
        const lastTs = alert["last_ts"];

        let dateString = "missing";
        if (lastTs) {
            const date = new Date(+lastTs);
            dateString = date.toLocaleDateString('en-us', dateFormatOptions);
        } else if (prevTs) {
            const date = new Date(+prevTs);
            dateString = "[prev] " + date.toLocaleDateString('en-us', dateFormatOptions);
        }

        const row = document.createElement("tr");
        
        if (url) {
            const nameEl = document.createElement("a");
            nameEl.setAttribute('href', url);
            nameEl.appendChild(document.createTextNode(alertName));
            const cell = document.createElement("td");
            cell.appendChild(nameEl);
            row.appendChild(cell);
        } else {
            row.appendChild(createCell("td", alertName));
        }
        row.appendChild(createCell("td", total));
        row.appendChild(createCell("td", triggered));
        row.appendChild(createCell("td", warn));
        row.appendChild(createCell("td", dateString));
        row.appendChild(createCell("td", status));
        row.appendChild(createCell("td", ""));
        const brightness = getRowBrightness(total);
        row.style.backgroundColor = rgbToHex(255, brightness, brightness);
        newRows.push(row);
    }
    var footerRow = document.createElement("tr");
    footerRow.appendChild(createCell("td", "Sum"));
    footerRow.appendChild(createCell("td", sumTotal));
    footerRow.appendChild(createCell("td", sumTriggered));
    footerRow.appendChild(createCell("td", sumWarn));
    footerRow.appendChild(createCell("td", ""));
    footerRow.appendChild(createCell("td", ""));
    footerRow.appendChild(createCell("td", ""));
    newRows.push(footerRow);
    resultsTable.replaceChildren(...newRows);
}

copyButton.onclick = function () {
    const range = document.createRange();
    const sel = window.getSelection();
    // unselect any element in the page
    sel.removeAllRanges();

    try {
      range.selectNodeContents(resultsTable);
      sel.addRange(range);
    } catch (e) {
      range.selectNode(resultsTable);
      sel.addRange(range);
    }

    document.execCommand('copy');
}

