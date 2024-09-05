import e from "express";
import db from "../models/index";
import bcrypt from "bcryptjs";
import CommonUtils from "../utils/CommonUtils";
const salt = bcrypt.genSaltSync(10);
require("dotenv").config();
const { Op } = require("sequelize");

let checkUserPhoneNumber = async (userPhoneNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userPhoneNumber) {
        resolve({
          errCode: 2,
          errMessage: "Missing required fields",
        });
      } else {
        let user = await db.User.findOne({
          where: { phoneNumber: userPhoneNumber },
        });
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
let handleHashUserPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let hashPassword = "";
      if (password) {
        hashPassword = await bcrypt.hashSync(password, salt);
      }
      resolve(hashPassword);
    } catch (error) {
      reject(error);
    }
  });
};

let getAllUsers = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await db.User.findAll();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};
let handleCreateNewUser = async (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.phoneNumber || !data.password) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let checkExist = await checkUserPhoneNumber(data.phoneNumber);
        if (checkExist) {
          resolve({
            errCode: 2,
            errMessage: "User's phone already exist",
          });
        } else {
          let hashPassword = await handleHashUserPassword(data.password);
          await db.User.create({
            phoneNumber: data.phoneNumber ? data.phoneNumber : null,
            password: hashPassword,
            email: data.email ? data.email : null,
            firstName: data.firstName ? data.firstName : null,
            lastName: data.lastName ? data.lastName : null,
            address: data.address ? data.address : null,
            point: data.point ? data.point : 0,
            image: data.image ? data.image : null,
            dob: data.dob ? data.dob : null,
            roleCode: data.roleCode ? data.roleCode : "CANDIDATE",
            statusCode: data.statusCode ? data.statusCode : "INACTIVE",
            isUpdate: data.isUpdate ? data.isUpdate : 0,
            isVip: data.isVip ? data.isVip : 0,
            companyId: data.companyId ? data.companyId : null,
          });
          resolve({
            errCode: 0,
            errMessage: "Create user succeed",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
//handle login
let handleLogin = async (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.phoneNumber || !data.password) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let userData = {};
        let user = await db.User.findOne({
          where: {
            phoneNumber: data.phoneNumber,
          },
        });
        if (user) {
          let check = await bcrypt.compareSync(data.password, user.password);
          if (check) {
            if (user.statusCode === "ACTIVE") {
              userData.errMessage = "Login succeed";
              userData.errCode = 0;
              userData.data = user;
              userData.token = CommonUtils.encodeToken(user.id);
            } else {
              userData.errMessage = "User is not active";
              userData.errCode = 3;
            }
          } else {
            userData.errMessage = "Password or PhoneNumber is incorrect";
            userData.errCode = 2;
          }
        } else {
          userData.errMessage = "User is not exist";
          userData.errCode = 4;
        }
        resolve(userData);
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  getAllUsers: getAllUsers,
  handleCreateNewUser: handleCreateNewUser,
  handleLogin: handleLogin,
};
