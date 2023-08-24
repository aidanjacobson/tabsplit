/*
    Config format:
        {
            name: String
            daysToKeep: Number
            people: {
                "personid": {
                    name: String
                    current: {
                        balance: Number
                        timestamp: Number
                    }
                    transactions: [
                        {
                            balance: Number
                            timestamp: Number
                            label: String
                        }
                    ]
                }
            }
            balance: Number
        }
*/

function updateAll() {
    var people = getPeopleList();
    for (var i = 0; i < people.length; i++) {
        update(people[i]);
    }
    calculateTotalBalance();
}

async function main() {
    //await configLoaded();
    checkReadOnly();
    await downloadConfig();
    updateAll();
    populatePeople();
}

function checkReadOnly() {
    var params = new URLSearchParams(location.search);
    if (params.has("key")) {
        readOnlyMode = true;
    }
    if (readOnlyMode) {
        var personID = atob(params.get("key"));
        getURL = "https://aidanjacobson.duckdns.org:9999/storage/person/" + personID;
    }
}

var hides = [];

var readOnlyMode = false;

window.onload = async function() {
    hides = document.getElementsByClassName("page");
    await main();
    switchToPage(mainPage);
}

function switchToPage(page) {
    for (var i = 0; i < hides.length; i++) {
        hides[i].hide();
    }
    page.show();
    if (page == mainPage) {
        updateAll();
    }
}
HTMLElement.prototype.hide = function() {
    this.setAttribute("hidden", true);
}
HTMLElement.prototype.show = function() {
    this.removeAttribute("hidden");
}

function getPeopleList() {
    return Object.keys(config.people);
}

function createNewPerson(id, name) {
    if (config.people[id]) return false;
    config.people[id] = {
        name: name,
        current: {
            balance: 0,
            timestamp: Date.now()
        },
        transactions: []
    };
    uploadConfig();
    return true;
}

function calculateCurrent(id) {
    var balance = 0;
    for (var i = 0; i < config.people[id].transactions.length; i++) {
        balance += config.people[id].transactions[i].balance;
    }
    config.people[id].current.balance = balance;
    config.people[id].current.timestamp = Date.now();
}

function consolidateOldTransactions(id) {
    var millisDifference = config.daysToKeep*24*60*60*1000;
    var startDate = Date.now()-millisDifference;
    var initialBalance = 0;
    var outputTransactions = [];
    for (var i = 0; i < config.people[id].transactions.length; i++) {
        if (config.people[id].transactions[i].timestamp < startDate) {
            initialBalance += config.people[id].transactions[i].balance;
        } else {
            outputTransactions.push(config.people[id].transactions[i].cloneTransaction());
        }
    }
    var initialTransaction = {
        balance: initialBalance,
        timestamp: startDate,
        label: `Balance as of ${timestampToDateString(startDate)}`
    }
    outputTransactions.unshift(initialTransaction);
    config.people[id].transactions = outputTransactions;
}

function update(id) {
    consolidateOldTransactions(id);
    calculateCurrent(id);
    uploadConfig();
}

Object.prototype.cloneTransaction = function() {
    return {
        balance: this.balance,
        timestamp: this.timestamp,
        label: this.label
    }
}

function timestampToDateString(timestamp) {
    var date = new Date(timestamp);
    var day = date.getDate();
    var month = date.getMonth()+1;
    var year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function addTransaction(id, amount, label) {
    config.people[id].transactions.push({timestamp:Date.now(),balance:amount,label:label});
    update(id);
    calculateTotalBalance();
    populatePeople();
}

function doNewPerson() {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        return;
    }
    var name = prompt("Enter name of person");
    var id = name;
    createNewPerson(id, name);
    personClick(id);
    populatePeople();
}

function calculateTotalBalance() {
    var people = getPeopleList();
    var current = 0;
    for (var i = 0; i < people.length; i++) {
        current += config.people[people[i]].current.balance;
    }
    config.balance = current;
    currentBalance.innerHTML = current.formatPrice();
    uploadConfig();
}

function populatePeople() {
    var display = document.getElementById("peopleCards");
    display.innerHTML = "";
    var people = getPeopleList();
    for (var i = 0; i < people.length; i++) {
        var personCardString = `<div class="personCard" onclick="personClick('${people[i]}')"><span>${config.people[people[i]].name}</span><br><span>${config.people[people[i]].current.balance.formatPrice()}</span></div>`;
        display.innerHTML += personCardString;
    }
}

Number.prototype.formatPrice = function(plus=false) {
    var num = this;
    num = Math.floor(num*100)/100;
    if (num<0) {
        return "-$" + (-num);
    } else if (plus) {
        return "+$" + num;
    } else {
        return "$" + num;
    }
}

var lastPerson = "";
function personClick(id) {
    lastPerson = id;
    switchToPage(personPage);
    personName.innerText = config.people[id].name;
    var bal = config.people[id].current.balance.formatPrice();
    personBalance.innerText = bal == "$0" ? "$0 (click to delete person)" : bal;
    loadTransactions(id);
}

function backToMain() {
    switchToPage(mainPage);
    personPage.setAttribute("hidden", true);
    mainPage.removeAttribute("hidden");
    populatePeople();
}

function loadTransactions(id) {
    transactions.innerHTML = "";
    for (var i = 0; i < config.people[id].transactions.length; i++) {
        var transaction = config.people[id].transactions[i];
        var topString = `${transaction.balance.formatPrice(true)} - ${timestampToDateString(transaction.timestamp)}`;
        var bottomString = transaction.label;
        var className = transaction.balance < 0 ? "negative" : "positive";
        var elementString = `<div onclick="displayTransaction('${id}', ${i})" class="transaction ${className}">${topString}<br>${bottomString}</div>`;
        transactions.innerHTML = elementString + transactions.innerHTML;
    }
}

var lastIndex = 0;
function displayTransaction(id, index) {
    lastIndex = index;
    var transaction = config.people[id].transactions[index];
    switchToPage(transactionPage);
    transDate.innerText = `Transaction Date: ${timestampToDateString(transaction.timestamp)}`;
    transAmount.value = transaction.balance;
    transLabel.value = transaction.label;
}

function backToPerson() {
    doTransactionUpdate();
}

function doTransactionUpdate() {
    if (readOnlyMode) {
        updateAll();
        personClick(lastPerson);
        return;
    }
    config.people[lastPerson].transactions[lastIndex].balance = +transAmount.value;
    config.people[lastPerson].transactions[lastIndex].label = transLabel.value;
    updateAll();
    personClick(lastPerson);
    uploadConfig();
}

function initiateTransaction(positive) {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        return;
    }
    var id = lastPerson;
    switchToPage(completeTransaction);
    actionType.innerText = positive ? "pay" : "get paid by";
    actionPerson.innerText = config.people[id].name;
    actionAmount.value = "";
    actionAmount.setAttribute("data-sign", positive?"+":"-");
    actionAmount.focus();
}

function submitTransaction() {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        updateAll();
        personClick(lastPerson);
        return;
    }
    var amount = +actionAmount.value;
    if (actionAmount.getAttribute("data-sign") == "-") amount *= -1;
    var label = prompt("Enter a transaction Label");
    var timestamp = Date.now();
    config.people[lastPerson].transactions.push({balance:amount,label:label,timestamp:timestamp});
    updateAll();
    personClick(lastPerson);
    uploadConfig();
}

function deleteTrans() {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        return;
    }
    if (confirm("Are you sure?")) {
        config.people[lastPerson].transactions.splice(lastIndex, 1);
        updateAll();
        personClick(lastPerson);
        uploadConfig();
    }
}

async function deletePerson(id) {
    delete config.people[id];
    await uploadConfig();
}

function changeName() {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        return;
    }
    var newName = prompt("Enter new name", config.people[lastPerson].name);
    if (newName && newName != "") {
        config.people[lastPerson].name = newName;
        personName.innerText = newName;
        uploadConfig();
    }
}

async function doAttemptDelete() {
    if (readOnlyMode) {
        alert("Error: you are in readonly mode and cannot make changes");
        return;
    }
    if (personBalance.innerText == "$0 (click to delete person)" && confirm(`Are you sure you want to delete ${personName.innerText}?`)) {
        await deletePerson(lastPerson);
        populatePeople();
        switchToPage(mainPage);
    }  
}
