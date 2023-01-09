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

var pantryID = "96b6d70a-432f-4f33-92cd-8dea3ea18376";
var basketName = "config";
function retrieveConfig() {
    return new Promise(function(resolve) {
        var x = new XMLHttpRequest();
        x.open("GET", `https://getpantry.cloud/apiv1/pantry/${pantryID}/basket/${basketName}`);
        x.onload = function() {
            resolve(JSON.parse(x.responseText));
        }
        x.send();
    });
}

async function downloadConfig() {
    config = await retrieveConfig();
}

function uploadConfig() {
    return new Promise(function(resolve) {
        var x = new XMLHttpRequest();
        x.withCredentials = true;
        x.open("PUT", `https://getpantry.cloud/apiv1/pantry/${pantryID}/basket/${basketName}`);
        x.onload = function() {
            resolve();
        }
        x.setRequestHeader("Content-Type", "application/json");
        x.send(JSON.stringify(config));
    });
}