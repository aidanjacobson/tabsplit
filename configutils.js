var config = {
    name: "Aidan",
    balance: 0,
    people: {},
    daysToKeep: 14
};
async function configLoaded() {
    return true;
}

//config = {"name":"Aidan","balance":-10,"people":{"Tyler":{"name":"Tyler","current":{"balance":-10,"timestamp":1673241836422},"transactions":[{"balance":0,"timestamp":1664601836422,"label":"Balance as of 9/30/2022"},{"balance":-10,"timestamp":1673241792378,"label":"movie"}]}},"daysToKeep":14}

const setURL = "https://aidanjacobson.duckdns.org:9999/storage/set";
const getURL = "https://aidanjacobson.duckdns.org:9999/storage/get";

function retrieveConfig() {
    return new Promise(function(resolve) {
        var x = new XMLHttpRequest();
        x.open("GET", encodeURL(getURL));
        x.onload = function() {
            resolve(JSON.parse(x.responseText));
        }
        x.setRequestHeader("Security-key", localStorage.dkey);
        x.send();
    });
}

async function downloadConfig() {
    config = await retrieveConfig();
}

var configClone = "{}";

function uploadConfig() {
    return new Promise(function(resolve) {
        if (configsEqual(config, JSON.parse(configClone))) {
            console.log("skipped");
            return;
        };
        var x = new XMLHttpRequest();
        x.crossorigin = '';
        x.open("POST", encodeURL(setURL));
        x.onload = function() {
            resolve();
        }
        x.setRequestHeader("Content-Type", "application/json");
        x.setRequestHeader("Security-key", localStorage.dkey);
        x.send(JSON.stringify(process(config)));
        console.log("From", configClone);
        console.log("To", JSON.stringify(config))
        configClone = JSON.stringify(config);
        console.log("Uploaded config", JSON.parse(JSON.stringify(config)));
        console.trace();
    });
}

function encodeURL(url) {
    //return `https://cors-anywhere.herokuapp.com/${url}`;
    return url; // pass thru
}

function configsEqual(config1, config2) {
/*
    if (config1.name != config2.name) return false;
    if (config1.balance != config2.balance) return false;
    var people1 = Object.keys(config1.people);
    var people2 = Object.keys(config2.people);
    if (people1.length != people2.length) return false;
    for (var i = 0; i < people1.length; i++) {
        if (people2.indexOf(people1[i]) == -1) return false;
        if (!transactionListsAreEqual(config1.people[people1[i]].transactions, config2.people[people1[i]].transactions)) return false;
    }
    return true;
*/
    return false;
}

function transactionListsAreEqual(tList1, tList2) {
    if (tList1.length != tList2.length) return false;
    for (var i = 0; i < tList1.length; i++) {
        if (!transactionsAreEqual(tList1[i], tList2[i])) return false;
    }
    return true;
}

function transactionsAreEqual(t1, t2) {
    return t1.balance == t2.balance && t1.label == t2.label && t1.timestamp == t2.timestamp;
}

function process(config) {
    config.simple={};
    var keys = Object.keys(config.people);
    for (var i= 0; i< keys.length; i++) {
      config.simple[config.people[keys[i]].name] = config.people[keys[i]].current.balance;
    }
    return config;
}
