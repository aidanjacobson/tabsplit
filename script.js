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
    await downloadConfig();
    updateAll();
    populatePeople();
}

var hides = [];
window.onload = function() {
    hides = document.getElementsByClassName("page");
    switchToPage(mainPage);
    main();
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
    var name = prompt("Enter name of person");
    var id = name;
    createNewPerson(id, name);
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
    if (this<0) {
        return "-$" + (-this);
    } else if (plus) {
        return "+$" + this;
    } else {
        return "$" + this;
    }
}

var lastPerson = "";
function personClick(id) {
    lastPerson = id;
    switchToPage(personPage);
    personName.innerText = config.people[id].name;
    personBalance.innerText = config.people[id].current.balance.formatPrice();
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
    config.people[lastPerson].transactions[lastIndex].balance = +transAmount.value;
    config.people[lastPerson].transactions[lastIndex].label = transLabel.value;
    updateAll();
    personClick(lastPerson);
}

function initiateTransaction(positive) {
    var id = lastPerson;
    switchToPage(completeTransaction);
    actionType.innerText = positive ? "pay" : "get paid by";
    actionPerson.innerText = config.people[id].name;
    actionAmount.value = "";
    actionAmount.setAttribute("data-sign", positive?"+":"-");
    actionAmount.focus();
}

function submitTransaction() {
    var amount = +actionAmount.value;
    if (actionAmount.getAttribute("data-sign") == "-") amount *= -1;
    var label = prompt("Enter a transaction Label");
    var timestamp = Date.now();
    config.people[lastPerson].transactions.push({balance:amount,label:label,timestamp:timestamp});
    updateAll();
    personClick(lastPerson);
}

function deleteTrans() {
    if (confirm("Are you sure?")) {
        config.people[lastPerson].transactions.splice(lastIndex, 1);
        personClick(lastPerson);
    }
}