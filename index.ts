import {auth} from "firebase-admin/lib/auth";
import GetUsersResult = auth.GetUsersResult;

const puppeteer = require('puppeteer');
let browser;
const dotenv = require('dotenv');
dotenv.config();
const nodeFetch = require('node-fetch');
const fs = require('fs');
let path = require('path');

let checkLarge = true;

let enabled = true;
let logText = fs.readFileSync("./log.txt");
let vaxLog = fs.readFileSync("./vaxLog.txt");

const mailgun = require("mailgun-js");
const mg = mailgun({apiKey: process.env.apiKey, domain: process.env.domain});


let admin = require("firebase-admin");

let serviceAccount = require("./covaxspotter.json");

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

//create an express server
const express = require('express');
const app = express();
let cors = require('cors');
app.use(cors());
app.use(express.static('portal/dist/portal'));
app.use(express.json());

//serve the live and historical files
app.get('/live.json', function(req, res) {
    res.sendFile(path.join(__dirname + '/live.json'));
});
app.use('/historical', express.static(path.join(__dirname, 'historical')));


//Endpoints for enabling and disabling specific functions
app.get('/enable', function(req, res) {
    log("Enabling");
    enabled = true;
    res.send("OK");
});

app.get('/disable', function(req, res) {
    log("Disabling");
    enabled = false;
    res.send("OK");
});
app.get('/disableLarge', function(req, res) {
    log("Disabling Large");
    checkLarge = false;
    res.send("OK");
});
app.get('/enableLarge', function(req, res) {
    log("Enabling Large");
    checkLarge = true;
    res.send("OK");
});

app.get("/log", function(req, res){
    res.send(logText.toString().split("\n").join("<br>"));
});
app.get("/vaxLog", function(req, res){
    res.send(vaxLog.toString().split("\n").join("<br>"));
});
app.get("/settings", function(req, res){
    res.send(JSON.stringify({
        enabled: enabled,
        checkLarge: checkLarge,
    }));
});

app.get("/clearLog", function(req, res){
    logText = "";
    res.send("OK");
});
app.get("/clearVaxLog", function(req, res){
    vaxLog = "";
    res.send("OK");
});

//open the express app on port 2021
app.listen(2021);

let liveData: VaxLocation[] = [];
let counter = -1;

//run the function now and every two minutes
load();
setInterval(load,120000);

async function load(){
    counter = (counter+1)%15;
    if(!enabled){
        log("DISABLED, not running");
        return;
    }
    liveData = JSON.parse(fs.readFileSync("./live.json", {encoding: 'utf8'})).data ?? [];

    //fetch new data
    if(checkLarge){
        browser = await puppeteer.launch();
        log("Starting full search");
        await Promise.all([getThornton(),getOther()]);
        await browser.close();
    }
    else{
        log("Starting quick search");
        await getOther();
    }
    log("Done");

    let now = (new Date()).toISOString();
    let date = now.split("T")[0];
    let time = now.split("T")[1];
    let historical = {};
    if (fs.existsSync("./historical/"+date+".json")) {
        historical = JSON.parse(fs.readFileSync("./historical/"+date+".json", {encoding: 'utf8'}));
    }
    let data = {
        updated: now,
        data: liveData,
    }
    historical[time] = liveData.filter(e => e.available);

    //save historical data and live data to files
    fs.writeFileSync("./live.json",JSON.stringify(data));
    fs.writeFileSync("./historical/"+date+".json",JSON.stringify(historical));

    //save logs to files
    fs.writeFileSync("./log.txt",logText);
    fs.writeFileSync("./vaxLog.txt",vaxLog);
}

async function getOther(){
    try{
        let res = await nodeFetch('https://www.vaccinespotter.org/api/v0/states/CO.json', {
            method: 'get',
        });
        let json = await res.json();
        if(json.features.length==0){
            return;
        }
        //loop through each location
        for(let store of json.features){
            let address = store.properties.address;
            if(store.properties.provider=="centura"){
                address = store.properties.name;
            }
            // If this location exists, fetch it from the old data, otherwise create the object.
            let data: VaxLocation = liveData.find(e => e.id == store.properties.provider.toString()+store.properties.id.toString());
            if(data==null){
                data = {
                    city: store.properties.city,
                    address: store.properties.address,
                    id: store.properties.provider.toString()+store.properties.id.toString(),
                    zip: store.properties.postal_code,
                    providerShort: store.properties.provider,
                    provider: store.properties.provider_brand_name,
                    name: store.properties.name,
                    url: store.properties.url,
                    appointments: [],
                    available: false,
                };
                liveData.push(data);
            }
            data.appointments = store.properties.appointments ?? [];
            //if there are appointments and there were not appointments last time, send a message
            if(store.properties.appointments_available==true && !(data.available)) {
                notifyAvailable(data);
            }
            data.available = store.properties.appointments_available ?? false;
            if(data.available){
                data.lastAvailable = (new Date()).toISOString();
            }
        }
    }
    catch (e) {
        log("Unable to finish Other:\n"+e.message);
    }
}

//load thornton data in, so that it knows which urls it has seen before
let {thorntonUrlCache, thorntonDateCache} = JSON.parse(fs.readFileSync("./thornton.json"));
async function getThornton(){
    try{
        // console.log("Starting Thornton");
        const page = await browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
        });
        await page.goto('https://www.thorntonco.gov/public-safety/fire-department/Pages/vaccination-clinics.aspx');

        //scrape the urls and dates from the page
        let {dates, urls} = await page.evaluate(() => {

            let dateList: string[] = [];
            let urlList: string[] = [];

            let table = document.getElementsByTagName("table").length>0 ? document.getElementsByTagName("table")[0] : null;
            if(table!=null){
                for(let i=1; i<table.rows.length; i++){
                    if(table.rows[i].getElementsByTagName("a").length>0){
                        urlList.push(table.rows[i].getElementsByTagName("a")[0].href);
                        dateList.push(table.rows[i].cells[0].innerText.replace("\n",""));
                    }
                }
            }

            return {dates: dateList, urls: urlList};
        });
        for(let i=0; i<urls.length; i++){
            //loops through each url and checks if it has seen the url before. If it is a new url, send a message.
            if(thorntonUrlCache.indexOf(urls[i])==-1){
                notifyAvailable({
                    city: "Thornton",
                    address: "11151 Colorado Boulevard",
                    id: "thorntonfd",
                    zip: "80233",
                    provider: "Thornton Fire Department",
                    providerShort: "thorntonfd",
                    name: "Thornton Fire Department",
                    url: urls[i],
                    appointments: [],
                    available: true,
                });
                thorntonUrlCache.push(urls[i]);
                thorntonDateCache.push(dates[i]);
                fs.writeFileSync("./thornton.json",JSON.stringify({thorntonDateCache,thorntonUrlCache}));
            }
        }
    }
    catch (e) {
        log("Unable to finish Thornton:\n"+e.message);
    }
}

async function notifyAvailable(loc: VaxLocation){
    vaxLog+="\n"+(new Date()).toISOString()+": Vaccines available at "+loc.id;
    log("Vaccines available at "+loc.id);
    const snapshot = await admin.firestore().collection("settings").where(loc.id,"==",true).get();
    if (snapshot.empty) {
        return;
    }
    //get a list of everyone that signed up to be notified about this location
    let uids = snapshot.docs.map((d) => {return {uid: d.id}});
    let result: GetUsersResult = await admin.auth().getUsers(uids);
    let emails = result.users.map((user) => user.email);
    let title = loc.provider+": "+loc.address+", "+loc.city+", "+loc.zip;
    //make sure the email is formatted properly
    if(loc.providerShort == "centura" || loc.providerShort == "cvs"){
        title = loc.provider+": "+loc.name;
    }
    else if(loc.providerShort == "thorntonfd"){
        title = loc.name;
    }
    title = "Vaccines are available at "+title;
    let body = title+"\nSign up: "+loc.url+"\n\n";
    let jj = loc.appointments.filter((a) => a.vaccine_types?.indexOf("jj")>-1);
    let moderna = loc.appointments.filter((a) => a.vaccine_types?.indexOf("moderna")>-1);
    let pfizer = loc.appointments.filter((a) => a.vaccine_types?.indexOf("pfizer")>-1);
    //Count how many of each vaccine are available
    if(pfizer.length>0){
        body+="Pfizer available: "+pfizer.length+"\n";
    }
    if(moderna.length>0){
        body+="Moderna available: "+moderna.length+"\n";
    }
    if(jj.length> 0){
        body+="J&J available: "+jj.length+'\n'
    }
    //send the email to each person
    for(let email of emails){
        const data = {
            from: process.env.email,
            to: email,
            subject: title,
            text: body
        };
        mg.messages().send(data, function (error, body) {
            log("Email sent to "+email+" for "+loc.id);
        });
    }
}
function log(text){
    console.log(new Date(),text);
    logText+="\n"+(new Date()).toISOString()+": "+text.toString();
}

interface VaxLocation{
    id: string
    address: string,
    name: string,
    provider: string,
    url: string,
    available: boolean,
    providerShort: string,
    appointments: Appointment[],
    zip: string,
    city: string
    lastAvailable?: string,
}


interface Appointment{
    time: string,
    type: string,
    vaccine_types: string[],
}
