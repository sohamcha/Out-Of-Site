var masterStats = {};
var INTERVAL_REFRESH = 1;

var colorSwitcherBg = [
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 206, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)',
    'rgb(227, 119, 86)',
    'rgb(111, 227, 152)',
    'rgb(227, 151, 230)',
    'rgb(134, 142, 252)'
]


Chart.defaults.global.defaultFontColor = 'beige';
Chart.defaults.global.defaultFontFamily = "'Verdana', 'Geneva', 'Tahoma', sans-serif";
Chart.defaults.global.defaultFontSize = 15;


function refreshDataset(){

    chrome.storage.local.get('stats',(result)=>{

        var stats = result.stats;
        
        var sessions = Object.keys(stats);
        
        sessions = sessions.map((session)=>{
        
        return {
        id:session,
        date:session.split(":")[0],
        time:new Date(parseFloat(session.split(":")[1])),
        data:stats[session]
        };
        });
        
        sessions.sort((p,q)=>q.time - p.time);
        
        masterStats = stats;
        
        console.log(sessions);
        
        let selectBtn = document.getElementById("dataset");
        selectBtn.innerHTML = "";
        let defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.innerText = '--SELECT A SESSION--';
        selectBtn.appendChild(defaultOpt);

        for(let i = 0;i<sessions.length;i++){

            let option = document.createElement('option');
            option.value = sessions[i].id;
            option.innerHTML = sessions[i].time;

            if(i == 0){
                option.selected = 'selected';                
            }

            selectBtn.appendChild(option);

        }

        drawGraph();
        
        });
}

function drawGraph(){

    let selectBtn = document.getElementById("dataset");
    let dataset = selectBtn.options[selectBtn.selectedIndex].value;

    if(window.currentChart){
        window.currentChart.destroy();
    }

    if(selectBtn.length <= 1){
        alert('No Usage Data available to generate statistics');
        return;
    }

    if(!dataset){
        alert('Please select a valid dataset');
        return;
    }

    let sites = Object.keys(masterStats[dataset]["sites"]);
    let uptime = masterStats[dataset]["uptime"];
    let data = [];

    for(let i=0;i<sites.length;i++){
        let heartbeat = masterStats[dataset]["sites"][sites[i]].heartbeat;
        data.push(parseInt((heartbeat*INTERVAL_REFRESH) / 60));
    }


    sites = JSON.parse(JSON.stringify(sites));

    sites = sites.map((site)=>{

        if(site.length > 1){
            return site.substring(0,1).toUpperCase() + site.substring(1,site.length).toLowerCase();
        }

        else{
            return site.toUpperCase();
        }

    });

    sites.push("Browser Access");
    data.push(parseInt((uptime*INTERVAL_REFRESH)/60));

    let bgColorArr = [];
    let borderColorArr = [];

    for(let i=0;i<sites.length;i++){
        bgColorArr.push(colorSwitcherBg[i%(colorSwitcherBg.length)]);
        borderColorArr.push(colorSwitcherBg[i%(colorSwitcherBg.length)]);
    }

    var ctx = document.getElementById('myChart').getContext('2d');

    window.currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sites,
            datasets: [{
                label: 'OSS Site Usage Graph',
                data: data,
                backgroundColor: bgColorArr,
                borderColor: borderColorArr,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    },
                    scaleLabel:{
                        display:true,
                        labelString:"DURATION (In Minutes)"
                    }
                }],
                xAxes: [{
                    scaleLabel:{
                        display:true,
                        labelString:"SITES"
                    }
                }]
            }
        }
    });
}

document.getElementById('dataset').onchange = drawGraph;
document.getElementById('refresh').onclick = refreshDataset;
refreshDataset();
$('[data-toggle="tooltip"]').tooltip();