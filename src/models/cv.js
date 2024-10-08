"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Cv extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      //Post
      Cv.belongsToMany(models.Post, { through: models.NopCv });
      //User
      Cv.belongsTo(models.User, {
        foreignKey: "userId",
        targetKey: "id",
        as: "userCvData",
      });
    }
  }
  Cv.init(
    {
      userId: DataTypes.INTEGER,
      file: DataTypes.BLOB("long"),
      isChecked: DataTypes.TINYINT,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Cv",
    }
  );
  return Cv;
};
