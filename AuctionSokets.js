import { SocketInstance } from "./server";
import express from "express";

const router = express.Router();
SocketInstance.applyTo(router);

router.ws('/auction', (ws, req) => {
    ws.on('message', (msg) => {
        console.log(msg);
    });
    ws.send('Hello World');
});


export default router;