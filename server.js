import {config as Set} from "dotenv";
import express from "express";
import expressWs from "express-ws";
import http from "http";
import https from "https";

if (process.env.NODE_ENV !== 'production')
{
    Set(); 
}

const app = express(); 

const secureServer = https.createServer(app);
const server = http.createServer(app);

const SocketInstance  = expressWs(app, secureServer, {
    leaveRouterUntouched: true
});

export default app

export {SocketInstance, server, secureServer};
