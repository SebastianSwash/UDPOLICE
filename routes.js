const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const pool = require("../database");

router.get("/", async function(req,res){ // Ruta principal que contiene el login
  res.render("home");
});

router.get("/register", async function(req,res){ // Ruta para crear nuevo usuario
  res.render("registro");
});

router.post("/adduser", async function(req,res){
  const data = req.body;
  console.log(data);

  if(data.rut.length == 0 || data.nombre.length == 0 || data.email.length == 0 || data.password.length == 0 || data.checkpassword.length == 0){
    req.flash("message","nullinput");
  }else{
    const row = await pool.query("SELECT * FROM usuarios WHERE usuarios.rut = '"+data.rut+"'");

    if(row.length != 0){
      req.flash("message","invalidrut");
    }else{
      if(data.password == data.checkpassword){
        var hash = bcrypt.hashSync(data.password, 10);
        await pool.query("INSERT INTO usuarios (rut,nombre,email,password) VALUES ('"+data.rut+"','"+data.nombre+"','"+data.email+"','"+hash+"')");
        req.flash("message","registered");
      }else{
        req.flash("message","dismatchpassword");
      }
    }
  }
  res.redirect("/register");
});

///////////////////////////////// Autenticación

router.post("/userhome", async function(req,res){
  const data = req.body;
  const row = await pool.query("SELECT * FROM usuarios WHERE usuarios.rut = '"+data.rut+"'");
  var flag = false;
  if(row.length != 0){

    if(bcrypt.compareSync(data.password, row[0].password)){
      flag = true;
      res.redirect("/userhome/"+row[0].rut);
    }else{
      req.flash("message","invalidpassword");
    }

  }else{
    req.flash("message","invalidrut");
  }

  if(!flag){
   res.redirect("/");
  }
});

router.get("/userhome/:id", async function (req,res){
  const row = await pool.query("SELECT * FROM usuarios WHERE usuarios.rut = '"+req.params.id+"'");
  res.render("userhome",{user: row[0]});
});

///////////////////////////////////

router.get("/agregarpersona/:id", async function(req,res){
  res.render("registrocivil",{userid: req.params.id});
});

router.post("/registrarcivil/:id", async function(req,res){
  const data = req.body;
  const row = await pool.query("SELECT * FROM personas WHERE personas.rut = '"+data.rut+"'");
  if(data.rut.length == 0 || data.nombre.length == 0 || data.nacionalidad.length == 0 || data.direccion.length == 0 || data.estatura.length == 0 || data.peso.length == 0 || data.cabello.length == 0 || data.iris == "Seleccionar" || data.contextura == "Seleccionar" || data.genero == "Seleccionar" || data.tez == "Seleccionar"){
    req.flash("message","nullinput");
  }else{
    if(row.length != 0){
      req.flash("message","civilexists");
    }else{
      await pool.query("INSERT INTO personas (rut,nombre,nacionalidad,direccion,estatura,peso,cabello,iris,contextura,tez,genero,estado,fecha_nacimiento) VALUES ('"+data.rut+"','"+data.nombre.toUpperCase()+"','"+data.nacionalidad.toUpperCase()+"','"+data.direccion.toUpperCase()+"',"+data.estatura+","+data.peso+",'"+data.cabello.toUpperCase()+"','"+data.iris.toUpperCase()+"','"+data.contextura.toUpperCase()+"','"+data.tez.toUpperCase()+"','"+data.genero.toUpperCase()+"',"+data.estado+",'"+data.fecha+"') ");
      req.flash("message","registered");
    }
  }
  res.redirect("/agregarpersona/"+req.params.id+"");
});

//////////////////////////////////////////// CONSULTA PERSONAS

router.get("/infopersona/:id", async function(req,res){
  const accesslvl = await pool.query("SELECT usuarios.nivel_acceso FROM usuarios WHERE usuarios.rut = '"+req.params.id+"'");
  res.render("consulta",{persona: null, userid: req.params.id, userlvl: accesslvl[0].nivel_acceso});
});

router.post("/consultarinfo/:id", async function(req,res){
  const data = req.body;
  const person = await pool.query("SELECT * FROM personas where personas.rut = '"+data.rut+"'");
  if(person.length != 0){
    const pmultas = await pool.query("SELECT * FROM multas where multas.rut_civil = '"+data.rut+"'");
    const pvehiculos = await pool.query("SELECT * FROM vehiculos where vehiculos.rut_propietario = '"+data.rut+"'");
    const accesslvl = await pool.query("SELECT usuarios.nivel_acceso FROM usuarios WHERE usuarios.rut = '"+req.params.id+"'");
    res.render("consulta",{persona: person[0], multas: pmultas, vehiculos: pvehiculos, userid: req.params.id, userlvl: accesslvl[0].nivel_acceso});
  }else{
    req.flash("message","notexists"); // Mensaje si no existe la persona con el rut ingresado
    res.redirect("/infopersona/"+req.params.id+"");
  }
});

////////////////////////////////////////////// MULTAS

router.get("/multaform/:id", async function(req,res){

  console.log(req.params.id);
  res.render("registrarmulta",{userid: req.params.id});

});

router.post("/ingresarmulta/:id", async function(req,res){

  const data = req.body;
  const rutuser = req.params.id; // rut usuario

  if(data.rut_civil.length == 0 || data.descripcion.length == 0 || data.monto.length == 0){
    req.flash("message","nullinput");
  }else{
    const person = await pool.query("SELECT personas.nombre FROM personas WHERE personas.rut = '"+data.rut_civil+"'");

    if(person.length == 0){
      req.flash("message","notexists");
    }else{
      await pool.query("INSERT INTO multas (descripcion,rut_civil,rut_encargado,monto) VALUES ('"+data.descripcion.toUpperCase()+"','"+data.rut_civil+"','"+rutuser+"',"+data.monto+")");
      req.flash("message","registered");
    }
  }

  res.redirect("/multaform/"+rutuser+"");

});

router.get("/eliminar_multa/:user_rut/:multa_id", async function(req,res){


  const user_rut = req.params.user_rut;
  const multa_id = req.params.multa_id;

  const multa = await pool.query("SELECT * FROM multas where multas.id = "+multa_id+"");

  if(multa.length == 0){
    res.redirect("/infopersona/"+user_rut+"");
  }

  const personrut = await pool.query("SELECT personas.rut FROM personas,multas WHERE personas.rut = multas.rut_civil and multas.id = "+multa_id+"");

  await pool.query("DELETE FROM multas WHERE multas.id = "+multa_id+"");

  // Obtener datos asociados al civil
  const person = await pool.query("SELECT * FROM personas where personas.rut = '"+personrut[0].rut+"'");
  const pmultas = await pool.query("SELECT * FROM multas where multas.rut_civil = '"+personrut[0].rut+"'");
  const pvehiculos = await pool.query("SELECT * FROM vehiculos where vehiculos.rut_propietario = '"+personrut[0].rut+"'");
  const accesslvl = await pool.query("SELECT usuarios.nivel_acceso FROM usuarios WHERE usuarios.rut = '"+user_rut+"'");
  req.flash("message","success_delete");
  res.render("consulta",{persona: person[0], multas: pmultas, vehiculos: pvehiculos, userid: user_rut, userlvl: accesslvl[0].nivel_acceso});
});


module.exports = router;
