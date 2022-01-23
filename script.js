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

const buildReportButton = document.getElementById("buildReportButton");
const copyButton = document.getElementById("copyButton");
const rawInputField = document.getElementById("rawInput");
const resultsTable = document.getElementById("resultsTable");

const tableHeader = document.createElement("tr");
tableHeader.appendChild(createCell("th", "Alert Name"));
tableHeader.appendChild(createCell("th", "Total"));
tableHeader.appendChild(createCell("th", "Triggered"));
tableHeader.appendChild(createCell("th", "Warn"));
tableHeader.appendChild(createCell("th", "Notes"));

buildReportButton.onclick = function () {
    console.log("hello");
    const rawInput = rawInputField.value;
    const lines = rawInput.split("\n");
    const regex = /[0-9]:[0-9][0-9]/g;

    let alerts = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = lines[i - 1];
        const prevLineHasTime = !!prevLine.match(regex);
        if (prevLineHasTime) {
            let triggered = 0;
            let warn = 0;
            let alertText = '';
            if (line.startsWith("Triggered: ")) {
                alertText = line.substring(11);
                triggered = 1;
            } else if (line.startsWith("Warn: ")) {
                alertText = line.substring(6);
                warn = 1;
            }

            if (triggered || warn) {
                if (!(alertText in alerts)) {
                    alerts[alertText] = { "triggered": 0, "warn": 0 };
                }
                alerts[alertText]["triggered"] += triggered;
                alerts[alertText]["warn"] += warn;
            }
        }
    }
    console.log(alerts);

    let newRowsData = [];
    let sumTriggered = 0;
    let sumWarn = 0;
    for (const [alertText, data] of Object.entries(alerts)) {
        const t = data["triggered"];
        const w = data["warn"];
        newRowsData.push([alertText, t + w, t, w]);
        sumWarn += w;
        sumTriggered += t;
    }
    let sumTotal = sumWarn + sumTriggered;

    newRowsData.sort((a, b) => {
        if (a[1] != b[1])
            return b[1] - a[1];
        if (a[0] > b[0])
            return 1
        return 0
    });

    let newRows = [tableHeader];
    for (var i = 0; i < newRowsData.length; i++) {
        const alertName = newRowsData[i][0];
        const total = newRowsData[i][1];
        const warn = newRowsData[i][2];
        const triggered = newRowsData[i][3];

        const row = document.createElement("tr");
        row.appendChild(createCell("td", alertName));
        row.appendChild(createCell("td", total));
        row.appendChild(createCell("td", triggered));
        row.appendChild(createCell("td", warn));
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
    newRows.push(footerRow);
    resultsTable.replaceChildren(...newRows);
}

copyButton.onclick = function () {
    var range = document.createRange();
    range.selectNode(resultsTable);
    window.getSelection().addRange(range);
    document.execCommand('copy');
}

