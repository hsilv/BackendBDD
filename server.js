//Importación de librerías ExpressJS, Morgan y pg (Postgres)
const express = require("express");
const morgan = require("morgan");
const { Client } = require("pg");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
var client_Query;

//Inicialización de aplicación de Express
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
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


app.post('/checkLog', validateToken, async (req, res) => {
    res.send('0');
})
//Solicitud GET a /login
app.post("/login", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
  if (req.body.username == undefined || req.body.password == undefined) {
    res.send("Usuario o contraseña incorrecta");
  } else {
    var accessToken;
    const client = new Client(dbClientData); //Creación de cliente de conexión
    const query = "SELECT * FROM DOCTOR WHERE USERNAME=$1 AND PASSWORD=$2"; //Instrucción del query a ejecutar

    const values = [req.body.username.toString(), req.body.password.toString()];
    //Valores que vienen de la petición HTTP GET
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
          const user = { username: values[0] };
          accessToken = generateAccessToken(user);
        }
      })
      .catch((err) => console.error("Error al ejecutar consulta", err.stack));

    //Cerrar la conexión a la base de datos
    await client
      .end()
      .then(() => console.log("Conexión cerrada"))
      .catch((err) => console.error("Error al cerrar conexión", err.stack));

    //Notificar estado de autenticación del usuario
    if (logFlag) {
      res.header("authorization", accessToken).json({
        code: 0,
        message: "Usuario autenticado",
        token: accessToken,
      });
    } else {
      res.json({
        code: 1,
        message: "El usuario o la contraseña son incorrectos",
        token: undefined,
      });
    }
  }
});

//Solicitud POST de registro
app.post("/register", async (req, res) => {
  //Creación de cliente para conectarse a base de datos
  const client = new Client(dbClientData);

  var values = [
    "id",
    req.body.name.toString(),
    req.body.direction.toString(),
    req.body.phone.toString(),
    parseInt(req.body.collegiate),
    parseInt(req.body.speciality),
    req.body.username.toString(),
    req.body.password.toString(),
  ]; //Establecer los valores del query
  const text =
    "INSERT INTO DOCTOR(ID_DOCTOR, DOCTOR_NAME, DIRECTION, PHONE_NUMBER, COLLEGIATE_NUMBER, ID_SPECIALTY, USERNAME, PASSWORD) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"; //Instrucción del query
  var code = 0; //Código de respuesta

  //Conexión a la base de datos
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));

  //Cálculo del id del cliente
  await client
    .query("SELECT MAX(ID_DOCTOR) FROM DOCTOR")
    .then((res) => {
      console.log(res.rows[0].max);
      if (res.rows[0].max == null) {
        values[0] = 1;
        console.log(values[0]);
      } else {
        values[0] = parseInt(res.rows[0].max) + 1;
      }
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));

  //Inserción de nuevo usuario
  await client
    .query(text, values)
    .then((res) => console.log("Usuario insertado con éxito"))
    .catch((err) => {
      if (
        err.message.includes("duplicate key value violates unique constraint") //Si existe alguna violación, es por constraint de username
      ) {
        code = 1;
      }else{
        console.log(err);
      }
    });

  //Cerrar la conexión
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  //Respuesta al query
  if (code == 0) {
    res.send("Usuario creado");
  } else if (code == 1) {
    res.send(
      "El usuario que intentas agregar, ya existe, prueba con uno nuevo"
    );
  }
});


app.get('/specialties', async (req, res) =>{
  const client = new Client(dbClientData);
  const text = 'SELECT ID_SPECIALTY, SPECIALTY_NAME FROM SPECIALTY';
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));

    await client
    .query(text) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));

    await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

    res.json(result);
})

app.get('/users', async (req, res) =>{
  const client = new Client(dbClientData);
  const text = 'SELECT USERNAME FROM DOCTOR';
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
})

app.get("/home", validateToken, (req, res) => {
  res.send("Este será el home");
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.SECRET, { expiresIn: "360m" });
}

function validateToken(req, res, next) {
  const accessToken = req.headers["authorization"] || req.query.token;
  if (!accessToken) {
    res.send('1');
    next();
  }
  jwt.verify(accessToken, process.env.SECRET, (err, user) => {
    if (err) {
      res.send('2');
    } else {
      next();
    }
  });
}

app.listen(3000, "0.0.0.0");
console.log(`Server on port ${3000}`);
