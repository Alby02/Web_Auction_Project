'use strict';
import express from "express";
import expressWs from "express-ws";
import http from "http";
import https from "https";
import fs from "fs";

if (process.env.NODE_ENV !== 'production')
{
    (await import('dotenv')).config();
}

const app = express(); 

const sslKey = process.env.SSLKEY || 'certs/key.pem';
const sslCert = process.env.SSLCERT || 'certs/cert.pem';

// verifica presenza del certificato SSL nel filesystem
if (!fs.existsSync(sslKey) || !fs.existsSync(sslCert))
{
    // se non è presente, crea un certificato autofirmato
    const selfsigned = (await import("selfsigned")).default;
    const pems = selfsigned.generate([{name: 'commonName', value: 'localhost'}], {days: 365});
    fs.mkdirSync('certs'); 
    fs.writeFileSync(sslKey, pems.private);
    fs.writeFileSync(sslCert, pems.cert);

}

const credentials = {
    key: fs.readFileSync(sslKey),
    cert: fs.readFileSync(sslCert)
};

const secureServer = https.createServer(credentials, app);
const server = http.createServer(app);

const SocketInstance  = expressWs(app, secureServer, {
    leaveRouterUntouched: true
});

export default app;

export {SocketInstance, server, secureServer};
