//Importación de librerías ExpressJS, Morgan y pg (Postgres)
const express = require("express");
const morgan = require("morgan");
const { Client } = require("pg");
var client_Query;

//Inicialización de aplicación de Express
const app = express();

app.use(morgan("dev")); //Usa morgan en plantilla de desarrollo
app.use(express.json()); //Resuleve json's

//Objeto de datos de conexión a base de datos
const dbClientData = {
  user: "postgres", //Usuario a conectar
  host: "localhost", //IP del servidor de base de datos
  database: "Users", //Nombre de la base de datos a conectar
  password: "1234", //Contraseña
  port: 5432, //Puerto de conexión
};

//Solicitud GET a /login
app.get("/login", async (req, res) => {
  if (req.body.username == undefined || req.body.password == undefined) {
    res.send("Usuario o contraseña incorrecta");
  } else {
    const client = new Client(dbClientData); //Creación de cliente de conexión
    const query = "SELECT * FROM CLIENT WHERE NOMBRE=$1 AND PASSWORD=$2"; //Instrucción del query a ejecutar
    const values = [
      req.body.username.toString().toLowerCase(),
      req.body.password.toString(),
    ]; //Valores que vienen de la petición HTTP GET
    var logFlag = false; //Autenticación falsa por defecto

    //Conexión del cliente a la base de datos (con espera)
    await client
      .connect()
      .then(() => console.log("Conexión establecida"))
      .catch((err) => console.error("Error al conectar", err.stack));

    //Query del cliente a la base de datos (con espera)
    await client
      .query(query, values) //Solicitud de query
      .then((res) => {
        //Si la cantidad de filas obtenidas es igual a 1, autenticar
        if (res.rowCount == 1) {
          logFlag = true;
        }
      })
      .catch((err) => console.error("Error al ejecutar consulta", err.stack));

    await client //Cerrar la conexión a la base de datos
      .end()
      .then(() => console.log("Conexión cerrada"))
      .catch((err) => console.error("Error al cerrar conexión", err.stack));

    //Notificar estado de autenticación del usuario
    if (logFlag) {
      res.send("Autenticación correcta");
    } else {
      res.send("Usuario o contraseña incorrecta");
    }
  }
});

app.post("/register", async (req, res) => {
  const client = new Client(dbClientData);

  var values = ["id", req.body.nombre, req.body.password];
  const text =
    "INSERT INTO CLIENT(ID_USER, NOMBRE, PASSWORD) VALUES ($1, $2, $3)";
  var code = 0;

  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));

  await client
    .query("SELECT * FROM CLIENT")
    .then((res) => {
      console.log(res.rowCount);
      values[0] = parseInt(res.rowCount) + 1;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));

  await client
    .query(text, values)
    .then((res) => console.log("Usuario insertado con éxito"))
    .catch((err) => {
      if (
        err.message.includes("duplicate key value violates unique constraint")
      ) {
        code = 1;
      }
    });

  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  if (code == 0) {
    res.send("Usuario creado");
  } else if (code == 1) {
    res.send(
      "El usuario que intentas agregar, ya existe, prueba con uno nuevo"
    );
  }
});

app.listen(3000, "0.0.0.0");
console.log(`Server on port ${3000}`);
