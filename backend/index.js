const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const port = 3000;

const bodyParser = require('body-parser');

// Configurar body-parser para analizar JSON
app.use(bodyParser.json());
app.use(cors());
let loggedInUser = null;

// Configurar body-parser para analizar URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));


app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});


const connection = mysql.createConnection({
    host: 'co28d739i4m2sb7j.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'e963a83clyccqh0v',
    password: 'st07xqizfbx9im3w',
    database: 'z6wrslrjiid18wo6'
  });
  
  connection.connect((error) => {
    if (error) {
      console.error('Error al conectar con la base de datos: ', error);
    } else {
      console.log('Conexión exitosa a la base de datos');
    }
  });
  app.post('/login', (req, res) => {
    const email = req.body.user;
    const password = req.body.password;
  
    const loginQuery = 'SELECT id_usuario,usuario, email, nombre, apellido,telefono,contrasena FROM USUARIOS WHERE usuario = ? AND contrasena = ?';
    connection.query(loginQuery, [email, password], (error, result) => {
      if (error) {
        console.error('Error al realizar el inicio de sesión:', error);
        res.status(500).json({ error: 'Error en el servidor' });
      } else {
        if (result.length === 1) {
          // Inicio de sesión exitoso, almacenar el usuario en la variable global
          loggedInUser = result[0];
  
          res.status(200).json({ message: 'Inicio de sesión exitoso' });
        } else {
          // Credenciales inválidas
          res.status(401).json({ error: 'Credenciales inválidas' });
        }
      }
    });
  });
  
  // Backend: Obtener información del usuario logueado
  app.get('/usuario-logueado', (req, res) => {
    if (loggedInUser) {
      res.json(loggedInUser);
    } else {
      res.status(401).json({ error: 'Ningún usuario ha iniciado sesión' });
    }
  });
  app.get('/partidos', (req, res) => {
    const fechaHoy = new Date().toISOString().split('T')[0];
  
    const query = `SELECT * FROM partido_futbol WHERE fecha >= '${fechaHoy}'`;
  
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error al obtener los partidos: ', error);
        res.status(500).json({ error: 'Error al obtener los partidos' });
      } else {
        res.json(results);
      }
    });
  });
  
  app.get('/localidades/:codigoPartido', (req, res) => {
    const codigoPartido = req.params.codigoPartido;
  
    const query = `
      SELECT lp.CODIGO_LOCALIDAD, lp.DISPONIBILIDAD, lp.PRECIO, lp.PARTIDO_CODIGO, tl.NOMBRE
      FROM LOCALIDAD_PARTIDO lp
      INNER JOIN TIPO_LOCALIDAD tl ON lp.CODIGO_TIPO_LOCALIDAD = tl.CODIGO
      WHERE lp.PARTIDO_CODIGO = ?
    `;
  
    connection.query(query, [codigoPartido], function (error, results) {
      if (error) {
        console.error('Error al obtener las localidades: ', error);
        res.status(500).json({ error: 'Error al obtener las localidades' });
      } else {
        res.json(results);
      }
    });
  });

  app.get('/asientos/:codigoLocalidad', (req, res) => {
    const codigoLocalidad = req.params.codigoLocalidad;
  
    const query = `
      SELECT *
      FROM asientos
      WHERE localidad_id = ?
    `;
  
    connection.query(query, [codigoLocalidad], function (error, results) {
      if (error) {
        console.error('Error al obtener los asientos:', error);
        res.status(500).json({ error: 'Error al obtener los asientos' });
      } else {
        res.json(results);
      }
    });
  });
  
  app.get('/compras-partido/:codigoPartido', (req, res) => {
    const codigoPartido = req.params.codigoPartido;
  
    const query = `SELECT cb.CODIGO_COMPRA, cb.PARTIDO_CODIGO, tl.NOMBRE,
    cb.CANTIDAD, cb.TOTAL, u.email
FROM COMPRA_BOLETOS cb
INNER JOIN usuarios u ON cb.ID_USUARIO = u.id_usuario
INNER JOIN localidad_partido lp ON cb.LOCALIDAD_CODIGO = lp.CODIGO_LOCALIDAD
INNER JOIN tipo_localidad tl ON lp.CODIGO_TIPO_LOCALIDAD = tl.CODIGO
WHERE cb.PARTIDO_CODIGO = ?`;
  
    connection.query(query, [codigoPartido], function (error, results) {
      if (error) {
        console.error('Error al obtener las localidades: ', error);
        res.status(500).json({ error: 'Error al obtener las localidades' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/registrar-usuario/', (req,res) =>{
    const nombre = req.body.firstName;
    const apellido = req.body.lastName;
    const user = req.body.user;
    const email = req.body.email;
    const phone = req.body.phone;
    const pass  = req.body.pass;

    // Verificar si el nombre de usuario ya existe en la base de datos
  const existenciaQuery = 'SELECT COUNT(*) AS count FROM USUARIOS WHERE USUARIO = ?';
  connection.query(existenciaQuery, [user], (error, result) => {
    if (error) {
      console.error('Error al verificar la existencia del nombre de usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    } else {
      if (result[0].count > 0) {
        // El nombre de usuario ya está registrado, enviar una respuesta con error
        res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
      } else {
        // Insertar el nuevo usuario en la base de datos
        const registroQuery = `INSERT INTO USUARIOS (USUARIO, CONTRASENA, EMAIL, NOMBRE, APELLIDO, TELEFONO)
        VALUES (?, ?, ?, ?, ?, ?)`;
        connection.query(registroQuery, [user, pass, email, nombre, apellido, phone], (error, result) => {
          if (error) {
            console.error('Error al ingresar usuario: ', error);
            res.status(500).json({ error: 'Error al ingresar usuario' });
          } else {
            res.status(200).json({ message: 'Usuario registrado exitosamente' });
          }
        });
      }
    }
  });
  });
app.post('/generar-factura', (req, res) => {
  const idUsuario = req.body.idUsuario;

  // Realizar la inserción de la factura en la base de datos
  const insertQuery = `
    INSERT INTO FACTURA (ID_USUARIO)
    VALUES (?)
  `;
  connection.query(insertQuery, [idUsuario], (error, result) => {
    if (error) {
      console.error('Error al generar la factura: ', error);
      res.status(500).json({ error: 'Error al generar la factura' });
    } else {
      // Obtener el CODIGO_FACTURA generado en la inserción
      let codigoFactura = result.insertId;
      console.log('Código de factura generado:', result.insertId);
      
      // Enviar el CODIGO_FACTURA en la respuesta
      res.status(200).json({ message: 'Factura generada geeee exitosamente:', codigoFactura });
    }
  });
});

  app.post('/compra-entradas/', (req, res) => {
    const codigoPartido = req.body.codigoPartido;
    const codigoLocalidad = req.body.codigoLocalidad;
    const cantidad = req.body.cantidad;
    const usuario = req.body.idUsuario;
    const total = req.body.total;
    const codigoF = req.body.codigoFactura;
  

        // Realizar la inserción de la compra en la base de datos
        const insertQuery = `
          INSERT INTO COMPRA_BOLETOS (PARTIDO_CODIGO, LOCALIDAD_CODIGO, CANTIDAD, ID_USUARIO, TOTAL,CODIGO_FACTURA)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        connection.query(insertQuery, [codigoPartido, codigoLocalidad, cantidad, usuario, total, codigoF], (error, result) => {
          if (error) {
            console.error('Error al realizar la compra: ', error);
            res.status(500).json({ error: 'Error al realizar la compra' });
          } else {
            // Actualizar la disponibilidad de las localidades
            const updateQuery = `
              UPDATE LOCALIDAD_PARTIDO SET DISPONIBILIDAD = DISPONIBILIDAD - ? WHERE PARTIDO_CODIGO = ? AND CODIGO_LOCALIDAD = ?
            `;
            connection.query(updateQuery, [cantidad, codigoPartido, codigoLocalidad], (error, result) => {
              if (error) {
                console.error('Error al actualizar la disponibilidad de las localidades: ', error);
                res.status(500).json({ error: 'Error al actualizar la disponibilidad de las localidades' });
              } else {
                res.status(200).json({ message: 'Compra realizada exitosamente' });
              }
            });
          }
        });
    
  });

  

  app.post('/actualiza-asiento/', (req, res) => {
    const coddigo = req.body.ID;
    const estado = req.body.ESTADO;
  
            const updateQuery = `
              UPDATE ASIENTOS SET ESTADO = ? WHERE ID = ?
            `;
            connection.query(updateQuery, [estado,coddigo], (error, result) => {
              if (error) {
                console.error('Error al actualizar asiento', error);
                res.status(500).json({ error: 'Error al actualizar asiento' });
              } else {
                res.status(200).json({ message: 'SIMON' });
              }
            });
    
  });

  app.post('/cambio-clave/', (req, res) => {
    const id = req.body.userid;
    const estado = req.body.password;
  
            const updateQuery = `
              UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?
            `;
            connection.query(updateQuery, [estado,id], (error, result) => {
              if (error) {
                console.error('Error al actualizar usuario', error);
                res.status(500).json({ error: 'Error al actualizar usuario' });
              } else {
                res.status(200).json({ message: 'SIMON' });
              }
            });
    
  });

  app.get('/resumen-partidos', (req, res) => {
    const query = `
      SELECT P.EQUIPO_LOCAL, P.EQUIPO_VISITA, P.FECHA, LP.CODIGO_LOCALIDAD, SUM(CB.CANTIDAD) AS Vendidos, TP.NOMBRE, SUM(CB.TOTAL) AS TotalRecaudado
      FROM PARTIDO_FUTBOL P
      INNER JOIN LOCALIDAD_PARTIDO LP ON P.CODIGO = LP.PARTIDO_CODIGO
      LEFT JOIN COMPRA_BOLETOS CB ON LP.CODIGO_LOCALIDAD = CB.LOCALIDAD_CODIGO AND P.CODIGO = CB.PARTIDO_CODIGO
      INNER JOIN TIPO_LOCALIDAD TP ON LP.CODIGO_TIPO_LOCALIDAD = TP.CODIGO
      GROUP BY P.EQUIPO_LOCAL, P.EQUIPO_VISITA, P.FECHA, LP.CODIGO_LOCALIDAD
    `;
  
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error al obtener el resumen de partidos: ', error);
        res.status(500).json({ error: 'Error al obtener el resumen de partidos' });
      } else {
        res.json(results);
      }
    });
  });
  
  app.get('/resumen-partidos/:codigoPartido?', (req, res) => {
    const codigoPartido = req.params.codigoPartido;
  
    let query = `
      SELECT P.EQUIPO_LOCAL, P.EQUIPO_VISITA, P.FECHA, LP.CODIGO_LOCALIDAD, SUM(CB.CANTIDAD) AS Vendidos, TP.NOMBRE, SUM(CB.TOTAL) AS TotalRecaudado
      FROM PARTIDO_FUTBOL P
      INNER JOIN LOCALIDAD_PARTIDO LP ON P.CODIGO = LP.PARTIDO_CODIGO
      LEFT JOIN COMPRA_BOLETOS CB ON LP.CODIGO_LOCALIDAD = CB.LOCALIDAD_CODIGO AND P.CODIGO = CB.PARTIDO_CODIGO
      INNER JOIN TIPO_LOCALIDAD TP ON LP.CODIGO_TIPO_LOCALIDAD = TP.CODIGO
    `;
  
    if (codigoPartido) {
      query += ` WHERE P.CODIGO = '${codigoPartido}'`;
    }
  
    query += ` GROUP BY P.EQUIPO_LOCAL, P.EQUIPO_VISITA, P.FECHA, LP.CODIGO_LOCALIDAD`;
  
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error al obtener el resumen de partidos: ', error);
        res.status(500).json({ error: 'Error al obtener el resumen de partidos' });
      } else {
        res.json(results);
      }
    });
  });

  
  
  
