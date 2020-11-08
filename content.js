
var checkIdDivPresent = document.getElementById('OutOfSiteBlockingDivOverlay');

if(!checkIdDivPresent){

let overlayDiv = document.createElement('div');
overlayDiv.id = 'OutOfSiteBlockingDivOverlay';
overlayDiv.style.position = "fixed";
overlayDiv.style.width = overlayDiv.style.height = "100%";
overlayDiv.style.top = overlayDiv.style.left = 0;
overlayDiv.style.filter="blur(5px)";
overlayDiv.style.zIndex = 1001;


let infoDiv = document.createElement('div');
infoDiv.id = 'OutOfSiteBlockingDivOverlayMsg';
infoDiv.style.position = "fixed";
infoDiv.style.width =  infoDiv.style.height = "100%";
infoDiv.style.top = infoDiv.style.left = 0;
infoDiv.style.zIndex = 1002;
infoDiv.innerHTML = "<p style='font-size:large;font-family: Verdana, Geneva, Tahoma, sans-serif;font-weight: 600;background-color:#2b2e2c;'><span style='margin-left:40%;color:beige'>This Page is Blocked by Out Of Site Extension</span></p>"

overlayDiv.innerHTML = document.body.innerHTML;
document.body.innerHTML = "";
document.body.appendChild(overlayDiv);
document.body.appendChild(infoDiv);
document.body.style.overflow="hidden";

}
