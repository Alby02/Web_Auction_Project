import {config as Set} from "dotenv";
import express from "express";
import expressWs from "express-ws"; //@wll0/express-ws
import http from "http";
import https from "https";

import "./middleware.js";
import router from "./pages.js";

if (process.env.NODE_ENV !== 'production')
{
    Set(); 
}

const port = process.env.PORT || 3000;

const app = express(); 

app.use("/", router);

const secureServer = https.createServer(app);
const server = http.createServer(app)

expressWs(app, server, {
    leaveRouterUntouched: true
});

expressWs(app, secureServer, {
    leaveRouterUntouched: true
});


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

/*app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});*/
