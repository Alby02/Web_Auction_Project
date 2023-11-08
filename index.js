'use strict';
import app, {server, secureServer} from "./server.js";
import "./middleware.js";
import router from "./pages.js";

const port = process.env.PORT || 80;
const securePort = process.env.SECUREPORT || 443;

app.use("/", router);

server.listen(port);
secureServer.listen(securePort);