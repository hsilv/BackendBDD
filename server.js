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
  host: "50.16.178.129", //IP del servidor de base de datos
  database: "hospital", //Nombre de la base de datos a conectar
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
  console.log(req.body.genre);
  var values = [
    "id",
    req.body.name.toString(),
    req.body.direction.toString(),
    req.body.phone.toString(),
    parseInt(req.body.collegiate),
    parseInt(req.body.speciality),
    req.body.username.toString(),
    req.body.password.toString(),
    req.body.genre,
  ]; //Establecer los valores del query
  const text =
    "INSERT INTO DOCTOR(ID_DOCTOR, DOCTOR_NAME, DIRECTION, PHONE_NUMBER, COLLEGIATE_NUMBER, ID_SPECIALTY, USERNAME, PASSWORD, GENRE) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"; //Instrucción del query
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
      console.log(err);
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

app.post('/getSpecialty', async (req, res) =>{
  const client = new Client(dbClientData);
  const text = 'SELECT ID_SPECIALTY, SPECIALTY_NAME FROM SPECIALTY WHERE ID_SPECIALTY=$1';
  console.log(req.body.id_specialty);
  const values = [req.body.id_specialty];
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));

    await client
    .query(text, values) //Solicitud de query
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

app.post('/getName', validateToken, async (req, res) => {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.username];
  const text = 'SELECT * FROM DOCTOR WHERE USERNAME=$1';
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
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

function generateAccessToken(user) {
  return jwt.sign(user, process.env.SECRET, { expiresIn: "360m" });
}

function validateToken(req, res, next) {
  const accessToken = req.headers["authorization"] || req.query.token;
  if (!accessToken) {
    res.send('1');
  }
  jwt.verify(accessToken, process.env.SECRET, (err, user) => {
    if (err) {
      res.send('2');
    } else {
      next();
    }
  });
}

app.post('/getPatients', validateToken, async (req, res) => {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.username];
  const text = 'SELECT P.id_patient, P.patient_name, PE.patient_status, PE.patient_alive, P.genre, P.age FROM PATIENT_EVOLUTION PE INNER JOIN PATIENT P ON PE.id_patient=P.id_patient INNER JOIN DOCTOR D ON D.id_doctor=PE.id_doctor WHERE username=$1';
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
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

app.post('/getPatient', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = 'SELECT * FROM PATIENT WHERE ID_PATIENT=$1'
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getAddictions', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT AD.ADDICTION_NAME, AD.DESCRIPTION FROM HAVE_ADDICTION HA INNER JOIN ADDICTION AD ON HA.ID_ADDICTION = AD.ID_ADDICTION INNER JOIN PATIENT PA ON PA.ID_PATIENT=HA.ID_PATIENT WHERE PA.ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getDiseases', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT DISEASE_NAME, DESCRIPTION, HEREDITARY FROM HAVE_DISEASES HD INNER JOIN DISEASES D ON HD.ID_DISEASE=D.ID_DISEASE WHERE ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getMedicalCenter', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT WP.ID_CENTER, MC.CENTER_NAME FROM WORK_PLACE WP INNER JOIN MEDICAL_CENTER MC ON WP.ID_CENTER=MC.ID_CENTER INNER JOIN DOCTOR D ON WP.ID_DOCTOR=D.ID_DOCTOR WHERE D.USERNAME=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getStock', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT M.ID_MEDICINE, M.MEDICINE_NAME, MS.STOCK, MS.DUE_DATE FROM MEDICINE_STOCK MS INNER JOIN MEDICINE M ON MS.ID_MEDICINE=M.ID_MEDICINE WHERE ID_CENTER=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getDoctors', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT D.DOCTOR_NAME, D.COLLEGIATE_NUMBER, SP.SPECIALTY_NAME, CENTER_NAME FROM DOCTOR D INNER JOIN SPECIALTY S ON D.ID_SPECIALTY=S.ID_SPECIALTY INNER JOIN WORK_PLACE WP ON WP.ID_DOCTOR=D.ID_DOCTOR INNER JOIN MEDICAL_CENTER MC ON MC.ID_CENTER=WP.ID_CENTER INNER JOIN MEDICAL_TEAM MT ON MT.ID_DOCTOR=D.ID_DOCTOR  INNER JOIN SPECIALTY SP ON D.ID_SPECIALTY=SP.ID_SPECIALTY WHERE ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});


app.post('/getExams', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT EP.ID_EXAM, EXAM_NAME, DOCTOR_NAME, CENTER_NAME, DATE_PERFORMED FROM EXAMS_PERFORMED EP INNER JOIN MEDICAL_EXAMS ME ON EP.ID_EXAM=ME.ID_EXAM INNER JOIN DOCTOR D ON D.ID_DOCTOR=EP.ID_DOCTOR INNER JOIN WORK_PLACE WP ON D.ID_DOCTOR=WP.ID_DOCTOR INNER JOIN MEDICAL_CENTER MC ON MC.ID_CENTER=WP.ID_CENTER WHERE ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getSurgeries', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT S.ID_SURGERY, S.SURGERY_NAME, D.DOCTOR_NAME, MC.CENTER_NAME, SP.DATE_PERFORMED, PE.PATIENT_STATUS, PE.PATIENT_ALIVE FROM SURGERY S INNER JOIN SURGERY_PERFORMED SP ON S.ID_SURGERY=SP.ID_SURGERY INNER JOIN PATIENT P ON P.ID_PATIENT=SP.ID_PATIENT INNER JOIN DOCTOR D ON D.ID_DOCTOR=SP.ID_DOCTOR INNER JOIN WORK_PLACE WP ON WP.ID_DOCTOR=D.ID_DOCTOR INNER JOIN MEDICAL_CENTER MC ON WP.ID_CENTER=MC.ID_CENTER INNER JOIN PATIENT_EVOLUTION PE ON PE.ID_SURGERY_PERFORMED = SP.ID_SURGERY_PERFORMED WHERE PE.ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.post('/getPrescs', validateToken, async (req, res) =>  {
  console.log(req.body);
  const client = new Client(dbClientData);
  const values = [req.body.id];
  const text = "SELECT MG.ID_PRESCRIPTION, M.MEDICINE_NAME, MG.AMOUNT, MG.DATE_GIVEN, D.DOCTOR_NAME, MC.CENTER_NAME, PE.PATIENT_STATUS, PE.PATIENT_ALIVE FROM MEDICINE_GIVEN MG INNER JOIN MEDICINE M ON MG.ID_MEDICINE=M.ID_MEDICINE INNER JOIN DOCTOR D ON D.ID_DOCTOR=MG.ID_DOCTOR INNER JOIN WORK_PLACE WP ON D.ID_DOCTOR=WP.ID_DOCTOR INNER JOIN MEDICAL_CENTER MC ON WP.ID_CENTER=MC.ID_CENTER INNER JOIN PATIENT_EVOLUTION PE ON PE.ID_PRESCRIPTION=MG.ID_PRESCRIPTION WHERE MG.ID_PATIENT=$1";
  var result;
  await client
    .connect()
    .then(() => console.log("Conexión establecida"))
    .catch((err) => console.error("Error al conectar", err.stack));
  
  await client
    .query(text, values) //Solicitud de query
    .then((res) => {
     result = res.rows;
    })
    .catch((err) => console.error("Error al ejecutar consulta", err.stack));
  
  await client
    .end()
    .then(() => console.log("Conexión cerrada"))
    .catch((err) => console.error("Error al cerrar conexión", err.stack));

  res.json(result);
});

app.listen(3000, "0.0.0.0");
console.log(`Server on port ${3000}`);
