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
    await configLoaded();
    updateAll();
    populatePeople();
}
window.onload = function() {
    main();
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

Number.prototype.formatPrice = function() {
    if (this<0) {
        return "-$" + (-this);
    } else {
        return "$" + this;
    }
}

function personClick(id) {
    mainPage.setAttribute("hidden", true);
    personPage.removeAttribute("hidden");
    personName.innerText = config.people[id].name;
    personBalance.innerText = config.people[id].current.balance.formatPrice();
}

function backToMain() {
    personPage.setAttribute("hidden", true);
    mainPage.removeAttribute("hidden");
}