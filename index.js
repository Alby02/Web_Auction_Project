import app, {server, secureServer} from "./server.js";
import "./middleware.js";
import router from "./pages.js";

const port = process.env.PORT || 8080;
const securePort = process.env.SECUREPORT || 8443;

app.use("/", router);

server.listen(port);
secureServer.listen(securePort);