const definePreparationEndpoints = require("./preparation");
const defineTeamFindingEndpoints = require("./teamFinding");
const defineGameEndpoints = require("./game");
module.exports = (app, models) => {
  definePreparationEndpoints(app,models);
  defineTeamFindingEndpoints(app,models);
  defineGameEndpoints(app,models);
};
