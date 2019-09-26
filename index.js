const mongoose = require("mongoose");
const express = require("express");
const app = express();
const defineEndpoints = require("./endpoints");
const defineModels = require("./utils/defineModels");

var server_port = 8080;
var server_ip_address = "localhost";

app.use(express.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept,Access-Control-Allow-Origin"
  );

  if ('OPTIONS' === req.method) {
    res.send(200);
  }
  else {
    next();
  }
});

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect(
  "mongodb+srv://default-user:_fsiwurst0202@fachschaft-q7edb.mongodb.net/test?retryWrites=true&w=majority"
);

const db = mongoose.connection;

app.get("/",(req,res) => {

  res.send({ message: "test" });
})

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async function() {
  const models = defineModels(mongoose);
  defineEndpoints(app, models);
  console.log("opened");
  app.listen(server_port, server_ip_address, function() {
    console.log(
      `Example app listening on port ${server_ip_address}:${server_port}!`
    );
  });
});
