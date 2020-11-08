var currentlyRunning = false;

function addSite(event){

event.preventDefault();


    if(!document.getElementById('siteAdd').value || !document.getElementById('siteAdd').value.trim()){
        alert("Please Enter a Site Name and Duration (minutes) if applicable");
        return;
    }

    let message = {
        operation: "addSite"
    }

    let siteData = document.getElementById('siteAdd').value.split(":");

    if(siteData.length == 1){
        message.site = siteData[0].trim().toUpperCase();
        message.duration = -1;
    }

    else if(siteData.length == 2 && siteData[0].trim().length > 0 && siteData[1].trim().length > 0 && !isNaN(siteData[1].trim())){
        message.site = siteData[0].trim().toUpperCase();
        message.duration = parseInt(siteData[1].trim());
    }

    else{
        alert("Please Enter a Site Name and Duration (minutes) if applicable in the valid format - Name : Duration in minutes");
        return;
    }

    callBackgroundScript(message);
}

function removeSite(event){

    event.preventDefault();

    if(!document.getElementById('siteRemove').value || !document.getElementById('siteRemove').value.trim()){
        alert("Please Enter a Site Name to Remove");
        return;
    }

    let message = {
        operation: "removeSite",
        site: document.getElementById('siteRemove').value.trim().toUpperCase()
    }

    callBackgroundScript(message);



}

function showSites(event){

    event.preventDefault();

    let message = {
        operation: "showSites"
    }

    callBackgroundScript(message);

}

function reset(event){

    event.preventDefault();

    let confirmed = confirm('This will erase all Site Usage data and settings from the Extension. Do you wish to proceed ?');

    if(!confirmed){
        return;
    }

    let message = {
        operation: "reset"
    }

    callBackgroundScript(message);

}

function start(event){

    event.preventDefault();

    if(!currentlyRunning){

    currentlyRunning = true;
    document.getElementById('start').disabled = true;
    document.getElementById('stop').disabled = false;
    document.getElementById('add').disabled = true;
    document.getElementById('remove').disabled = true;
    document.getElementById('show').disabled = false;
    document.getElementById('removeAll').disabled = true;
    document.getElementById('trackOnly').disabled = true;
    }

    else{
        alert("Some Error Occurred. Couldn't Start Monitoring");
        return;
    }

    let message = {
        operation: "start",
        trackOnly: document.getElementById('trackOnly').checked
    }

    callBackgroundScript(message);

}

function stop(event){

    event.preventDefault();

    if(currentlyRunning){

        currentlyRunning = false;
        document.getElementById('start').disabled = false;
        document.getElementById('stop').disabled = true;
        document.getElementById('add').disabled = false;
        document.getElementById('remove').disabled = false;
        document.getElementById('show').disabled = false;
        document.getElementById('removeAll').disabled = false;
        document.getElementById('trackOnly').disabled = false;

    }

    else{
        alert("Some Error Occurred. Couldn't Stop Monitoring");
        return;
    }

    let message = {
        operation: "stop"
    }

    callBackgroundScript(message);

}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    if(request.operation == 'ShowMessage'){
      var opts = {};
      opts.type = "basic";
      opts.iconUrl = chrome.runtime.getURL("icon.png");
      opts.title = request.title;
      opts.message = request.message;

      chrome.notifications.create("", opts,function(){
      });

      sendResponse({success:true});
    }
    });


function callBackgroundScript(message){
    chrome.runtime.sendMessage(message, function(response) {
        if(response.success){
            console.log("Request Sent Successfully to Background Script : "+message);
        }
        else{
            console.log('Error ocurred calling Background Script : '+message);
            throw new Error('Unable to Add Site');
        }
      });

};

function showStats(event){

    event.preventDefault();

    chrome.tabs.create({"url":chrome.runtime.getURL('statistics.html')});
}

document.getElementById('add').onclick = addSite;
document.getElementById('remove').onclick = removeSite;
document.getElementById('start').onclick = start;
document.getElementById('stop').onclick = stop;
document.getElementById('show').onclick = showSites;
document.getElementById('removeAll').onclick = reset;
document.getElementById('showStats').onclick = showStats;

$('[data-toggle="tooltip"]').tooltip();


chrome.runtime.sendMessage({operation:"status"}, function(response) {

let status = response.currentlyRunning;

if(status){

    currentlyRunning = true;
    document.getElementById('start').disabled = true;
    document.getElementById('stop').disabled = false;
    document.getElementById('add').disabled = true;
    document.getElementById('remove').disabled = true;
    document.getElementById('show').disabled = false;
    document.getElementById('removeAll').disabled = true;
    document.getElementById('trackOnly').disabled = true;

    document.getElementById('trackOnly').checked = response.currentStat[response.currentId].trackOnly;

}

else{
    
    currentlyRunning = false;
    document.getElementById('start').disabled = false;
    document.getElementById('stop').disabled = true;
    document.getElementById('add').disabled = false;
    document.getElementById('remove').disabled = false;
    document.getElementById('show').disabled = false;
    document.getElementById('removeAll').disabled = false;
    document.getElementById('trackOnly').disabled = false;
    document.getElementById('trackOnly').checked = false;
}


});