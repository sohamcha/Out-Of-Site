var currentlyRunning = false;
var currentSiteList = {};
var currentStat = {};
var currentId = null;
var currentUpdateInterval = null;
var currentRefreshInterval = null;
var lockedStateInterval = null;
var prevRecvdSite = null;
var currentRecvdSite = null;
var isLocked = false;
var INTERVAL_REFRESH = 1;
var INTERVAL_UPDATE = 5;
var INTERVAL_LOCKCHECK = 15;
const COLOR_BLUE = '#4688F1';
const COLOR_RED = '#FF0000';
const COLOR_YELLOW = '#99944e';
const COLOR_GREEN = '#30c246';

function getDate(date){
  if(!date){
    date = new Date();
  }
  return date.getDate()+"-"+date.getMonth()+"-"+date.getFullYear()+":"+date.getTime();
}

class SiteUsage{

  constructor(site){
    this.site = site;
    this.heartbeat = 0;
    this.isBlocked = false;
  }

}

class SiteData{

  constructor(site,duration,order){
    this.site = site;
    this.duration = duration;
    this.order = order;
  }

}

function firstTimeInit(callback){
  chrome.storage.local.set({listOfSites: {}}, function() {
    chrome.storage.local.set({stats: {}}, function(){
      chrome.storage.local.set({InitDone: true}, function(){
        chrome.storage.local.set({currentId:""},function(){
          console.log('CurrentId Reset');
          console.log('OOS Init Completed');
          if(callback){
            callback();
          }
          return;
        });
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(function(){
  console.log('OOS Installed');
  firstTimeInit();

});

chrome.runtime.onSuspend.addListener(function(){
  if(currentUpdateInterval)
  clearInterval(currentUpdateInterval);
  if(currentRefreshInterval)
  clearInterval(currentRefreshInterval);
  if(lockedStateInterval)
  clearInterval(lockedStateInterval);
  currentId = null;
  currentStat = {};
  currentSiteList = {};
  prevRecvdSite = null;
  currentRecvdSite = null;
  isLocked = false;
  currentUpdateInterval = null;
  currentRefreshInterval = null;
  lockedStateInterval = null;
});

chrome.runtime.onStartup.addListener(function() {
    console.log('OOS Starting Up');
    chrome.storage.local.get('InitDone',function(result){
      if(result && result.InitDone){
        chrome.storage.local.set({currentId:""},function(){
         chrome.storage.local.get('listOfSites',function(result){
          if(currentUpdateInterval)
          clearInterval(currentUpdateInterval);
          if(currentRefreshInterval)
          clearInterval(currentRefreshInterval);
          if(lockedStateInterval)
          clearInterval(lockedStateInterval);
          currentUpdateInterval = null;
          currentRefreshInterval = null;
          lockedStateInterval = null;
          prevRecvdSite = null;
          currentRecvdSite = null;
          isLocked = false;
          currentId = null;
          currentSiteList = result.listOfSites;
          currentStat = {};
          console.log('CurrentId Reset and List Of Sites cached');
          return;
        });
        });
      }
      else{
        firstTimeInit();
      }
    })
    
  });

  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

      if(request.operation == 'addSite'){

        let message = {};
          message.operation = "ShowMessage";
          message.title = "Site Management";

        chrome.storage.local.get('listOfSites',function(result){
          let listOfSites = result.listOfSites;

          if(listOfSites && listOfSites[request.site]){
          message.message = "Site Updated Successfully : "+request.site;
          }
          else{ 
          message.message = "Site Added Successfully : "+request.site;
          }

          listOfSites[request.site] = new SiteData(request.site,request.duration,Object.keys(listOfSites).length + 1);
          chrome.storage.local.set({"listOfSites": listOfSites}, function() {   
          currentSiteList = listOfSites;                 
          chrome.runtime.sendMessage(message, function(response) {  
          });
          });
        });

        sendResponse({success:true});

      }

      else if(request.operation == 'showSites'){

        chrome.storage.local.get('listOfSites',function(result){
          /*let message = {};
          message.operation = "ShowMessage";
          message.title = "Site Management";
          message.message = formatSiteList(result.listOfSites); */
          if(Object.keys(result.listOfSites).length > 0){
            alert(formatSiteList(result.listOfSites));
            }
            else{
              alert('No Sites Added');
            }
          /*
          chrome.runtime.sendMessage(message, function(response) {  
          });
          */
        });

        sendResponse({success:true});

      }

      else if(request.operation == 'removeSite'){

        let message = {};
        message.operation = "ShowMessage";
        message.title = "Site Management";

      chrome.storage.local.get('listOfSites',function(result){
        let listOfSites = result.listOfSites;

        if(listOfSites && listOfSites[request.site]){
        message.message = "Site Removed Successfully : "+request.site;
        }
        else{ 
        message.message = "Site Not Present : "+request.site;
        }

        let deleteOrder = listOfSites[request.site].order;
        delete listOfSites[request.site];

        for(let site in listOfSites){
          if(listOfSites[site].order > deleteOrder){
            listOfSites[site].order--;
          }
        }

        chrome.storage.local.set({"listOfSites": listOfSites}, function() {   
        currentSiteList = listOfSites;                 
        chrome.runtime.sendMessage(message, function(response) {  
        });
        });
      });

      sendResponse({success:true});

      }

      else if(request.operation == 'reset'){

        let message = {};
        message.operation = "ShowMessage";
        message.title = "Site Management";
        message.message = "Reset Successful. All settings purged";

        doPurge(message);

        sendResponse({success:true});

      }

      else if(request.operation == 'start'){

        currentlyRunning = true;

        let trackOnly = request.trackOnly;

        let message = {};
        message.operation = "ShowMessage";
        message.title = "OOS Startup";
        message.message = "Monitoring Started Successfully";

        currentId = getDate();
        currentStat[currentId] = {"uptime":0,"sites":{},"trackOnly":trackOnly};
        let sites = Object.keys(currentSiteList);

        if(sites.length == 0){
          console.log('No Sites Configured, hence not Starting Monitoring');
          sendResponse({success:true});
          message.message = "Monitoring couldn't be Started as no sites configured. Please Stop and Add few sites and Start again.";
          chrome.runtime.sendMessage(message, function(response) {  
          });
          return;
        }

        chrome.browserAction.setBadgeText({text: 'ON'});
        chrome.browserAction.setBadgeBackgroundColor({color: COLOR_BLUE});

        for(let i = 0;i<sites.length;i++){
          currentStat[currentId]["sites"][sites[i]] = new SiteUsage(sites[i]);
        }

        currentRefreshInterval = setInterval(()=>{

          if(isLocked){
            //  console.log('System is currently Locked. Not recording Usage - '+new Date());
            prevRecvdSite = null;
            return;
          }

          chrome.windows.getLastFocused({}, (window)=>{

          if ((!window) || (window && ((window.id && window.state == 'minimized') || !window.focused))){
          //  console.log('Window is Minimized or Out of Focus. Not Logging Usage - '+new Date());
            prevRecvdSite = null;
            return;
          }

          currentStat[currentId]["uptime"]++;

          let focussedWindowId = window.id;

          chrome.tabs.query({active:true,windowId:focussedWindowId}, (tabs)=>{
            if(tabs && tabs.length > 0 && tabs[0].url){             
              let domain = new URL(tabs[0].url).hostname;
              if(domain){
                let siteName = sites.filter((site)=>domain.toUpperCase().indexOf(site) != -1);
                if(siteName.length > 0){

                  siteName.sort((site1,site2)=>currentSiteList[site1].order - currentSiteList[site2].order);

                  siteName = siteName[0];

                  currentRecvdSite = siteName;

                  if(currentStat[currentId]["sites"][siteName].isBlocked){
                  //  console.log("You are trying to Access a Blocked Site @ "+siteName+" at "+new Date());
                    
                    chrome.browserAction.setBadgeText({text: 'ON'});
                    chrome.browserAction.setBadgeBackgroundColor({color: COLOR_RED});

                    prevRecvdSite = currentRecvdSite;
                    chrome.tabs.executeScript(tabs[0].id,{
                      file: 'content.js'
                      });
                    return;
                  }

                  if(prevRecvdSite != currentRecvdSite){
                    chrome.browserAction.setBadgeText({text: 'ON'});
                    chrome.browserAction.setBadgeBackgroundColor({color: COLOR_GREEN});
                    prevRecvdSite = currentRecvdSite;
                    return;
                  }

                  currentStat[currentId]["sites"][siteName].heartbeat++;


                  if(!trackOnly && currentSiteList[siteName].duration >= 0){
                  let spentTimeInSeconds = (currentStat[currentId]["sites"][siteName].heartbeat) * INTERVAL_REFRESH;
                  let duration = currentSiteList[siteName].duration * 60;
                  let diff = duration - spentTimeInSeconds;

                  setBadgeColorAndTime(diff);

                  if(diff == 1800){  // 30 min notification
                    let message = {};
                    message.title = "OOS Alert";
                    message.message = "You have 30 minutes remaining from you alloted time in "+domain;
                    sendNotification(message);
                    console.log("OOS Alert - 30 Minutes remaining for "+domain+" at "+new Date());
                  }

                  else if(diff == 900){ // 15 min notification
                    let message = {};
                    message.title = "OOS Alert";
                    message.message = "You have 15 minutes remaining from you alloted time in "+domain;
                    sendNotification(message);
                    console.log("OOS Alert - 15 Minutes remaining for "+domain+" at "+new Date());
                  }

                  else if(diff == 300){ // 5 min notification
                    let message = {};
                    message.title = "OOS Alert";
                    message.message = "You have 5 minutes remaining from you alloted time in "+domain;
                    sendNotification(message);
                    console.log("OOS Alert - 5 Minutes remaining for "+domain+" at "+new Date());
                  }

                  else if(diff == 60){ // 1 min notification
                    let message = {};
                    message.title = "OOS Alert";
                    message.message = "You have 1 minutes remaining from you alloted time in "+domain;
                    sendNotification(message);
                    console.log("OOS Alert - 1 Minute remaining for "+domain+" at "+new Date());
                  }

                  else if(diff <= 0 ){ // block site

                      if(!currentStat[currentId]["sites"][siteName].isBlocked)
                      currentStat[currentId]["sites"][siteName].isBlocked = true;

                      console.log('Executing Script for '+domain+' at Tab id = '+tabs[0].id);
                      chrome.tabs.executeScript(tabs[0].id,{
                      file: 'content.js'
                      },()=>{
                      let message = {};
                      message.title = "OOS Site Block Notification";
                      message.message = domain+" has been Blocked as it has exceeded the alloted access duration";
                      sendNotification(message);
                      console.log("OOS Alert - "+domain+" has been blocked at "+new Date());
                      chrome.browserAction.setBadgeBackgroundColor({color: COLOR_RED});
                    });

                  
                  }
                }
                else{
                  chrome.browserAction.setBadgeText({text: 'ON'});
                  chrome.browserAction.setBadgeBackgroundColor({color: COLOR_GREEN});
                }

                //  console.log('Received Heartbeat for site : '+siteName+' at '+new Date());
                }
                else{
                  chrome.browserAction.setBadgeText({text: 'ON'});
                  chrome.browserAction.setBadgeBackgroundColor({color: COLOR_BLUE});
                  prevRecvdSite = null;
                }
              }
              else{
                chrome.browserAction.setBadgeText({text: 'ON'});
                chrome.browserAction.setBadgeBackgroundColor({color: COLOR_BLUE});
                prevRecvdSite = null;
              }
            }
            else{
              chrome.browserAction.setBadgeText({text: 'ON'});
              chrome.browserAction.setBadgeBackgroundColor({color: COLOR_BLUE});
              prevRecvdSite = null;
            }

          });

        });

        },INTERVAL_REFRESH*1000);

        currentUpdateInterval = setInterval(()=>{

          chrome.storage.local.get('stats',(result)=>{
            let stats = result.stats;
            if(currentId){
            stats[currentId] = currentStat[currentId];
            chrome.storage.local.set({"stats":stats},()=>{
          //  console.log('OOS Data Updated Successfully');
            })
            }
          });

        },INTERVAL_UPDATE*1000);
        

// This functionality is handled by window.focused property itself for both out of focus and locked state
/** 
        lockedStateInterval = setInterval(()=>{
        chrome.idle.queryState(INTERVAL_LOCKCHECK, (state)=>{
          if(state == 'locked'){
          //  console.log('System is Locked - Checked at '+new Date());
            isLocked = true;
          }
          else{
          //  console.log('System is Unlocked - Checked at '+new Date());
            isLocked = false;
          }
        });
        },INTERVAL_LOCKCHECK*1000);

**/
        
        console.log('OOS - Tracking Started Successfully at '+new Date());

        sendResponse({success:true});

        chrome.runtime.sendMessage(message, function(response) {  
        });

      }

      else if(request.operation == 'stop'){

        chrome.browserAction.setBadgeText({text: ''});
        chrome.browserAction.setBadgeBackgroundColor({color: COLOR_BLUE}); 

        currentlyRunning = false;

        let message = {};
        message.operation = "ShowMessage";
        message.title = "OOS Shutdown";
        message.message = "Monitoring Stopped Successfully";

        if(currentUpdateInterval)
        clearInterval(currentUpdateInterval);

        if(currentRefreshInterval)
        clearInterval(currentRefreshInterval);

        if(lockedStateInterval)
        clearInterval(lockedStateInterval);

        currentUpdateInterval = null;
        currentRefreshInterval = null;
        lockedStateInterval = null;
        prevRecvdSite = null;
        currentRecvdSite = null;
        isLocked = false;
        currentId = null;
        currentStat = {};

        console.log('OOS - Tracking Stopped Successfully at '+new Date());

        sendResponse({success:true});

        chrome.runtime.sendMessage(message, function(response) {  
        });

      }

      else if(request.operation == 'status'){
        console.log("Current Status : Currently Running : "+currentlyRunning);
        sendResponse({success:true, "currentlyRunning":currentlyRunning,"currentStat":currentStat,"currentId":currentId});
      }

      else{
        console.log('Invalid Request Received');
        sendResponse({success:false});
      }

    });

  
  function doPurge(message){

    firstTimeInit(()=>{
      if(currentUpdateInterval)
      clearInterval(currentUpdateInterval);
      if(currentRefreshInterval)
      clearInterval(currentRefreshInterval);
      if(lockedStateInterval)
      clearInterval(lockedStateInterval);
      currentUpdateInterval = null;
      currentRefreshInterval = null;
      lockedStateInterval = null;
      prevRecvdSite = null;
      currentRecvdSite = null;
      isLocked = false;
      currentId = null;
      currentSiteList = {};
      currentStat = {};
      currentlyRunning = false;
      chrome.runtime.sendMessage(message, function(response) {  
      });
    });

  }

  function sendNotification(request,callback){
  var opts = {};
      opts.type = "basic";
      opts.iconUrl = chrome.runtime.getURL("icon.png");
      opts.title = request.title;
      opts.message = request.message;

      chrome.notifications.create("", opts,function(){
        if(callback)
        callback();
      });
    }

  function formatSiteList(list){

      let sites = Object.keys(list);

      sites.sort((site1,site2)=>list[site1].order - list[site2].order);

      let formatString = "Current Site List : \n\n";
  
      for(let i = 0;i<sites.length;i++){

        let duration = list[sites[i]].duration;

      //  if(i==sites.length - 1){
          formatString+=(" "+list[sites[i]].site + (duration >= 0 ? " ( "+duration+" minutes )" : ""));
     /*   }
        else{
        formatString+=(" "+list[sites[i]].site + (duration >= 0 ? " ( "+duration+" minutes ), " : ", "));
        } */
        formatString+="\n";
      }
  
      return formatString;
      
  }


  function setBadgeColorAndTime(diff){

    if(diff > 0){

    let dateObj = new Date(diff * 1000);

    let timeText = dateObj.getUTCMinutes().toString().padStart(2,"0") + ":" +  dateObj.getUTCSeconds().toString().padStart(2,"0");

    if(diff > 1800){
    chrome.browserAction.setBadgeText({text: 'ON'});
    chrome.browserAction.setBadgeBackgroundColor({color: COLOR_GREEN});
    }

    else if(diff <= 1800 && diff > 300){
      chrome.browserAction.setBadgeText({text: timeText});
      chrome.browserAction.setBadgeBackgroundColor({color: COLOR_YELLOW});
    }


    else{
      chrome.browserAction.setBadgeText({text: timeText});
      chrome.browserAction.setBadgeBackgroundColor({color: COLOR_RED});
    }

  }

    else{
      chrome.browserAction.setBadgeText({text: 'ON'});
      chrome.browserAction.setBadgeBackgroundColor({color: COLOR_RED});
    }

    return;

  }

// Added to detect if screen is locked and if it is, do not record heartbeat and uptime.
// chrome.idle.setDetectionInterval(15);