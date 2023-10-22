import {config as Set} from "dotenv";
if (process.env.NODE_ENV !== 'production')
{
    Set() 
}
import passport from "passport"
import express from "express"
const app = express(); 
const port = process.env.PORT || 3000;

// Importare i moduli per il middleware, il database e le route
import initializeDatabase from "./database.js"
import setupMiddleware from "./middleware.js"
import initializePassport from "./passport-setup.js"
import inizializeRoutes from "./pages.js"


// Inizializzare il database
const db = initializeDatabase();

// Configurare i middleware
setupMiddleware(app, passport, db);
initializePassport(passport, db)

// Inizializazione delle rotte
const routes = inizializeRoutes(passport,db)

// Definire le route e le altre configurazioni del server
app.use("/", routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
