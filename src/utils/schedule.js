const schedule = require("node-schedule");
import e from "express";
import db from "../models/index";
import getStringMailTemplate from "./mailTemplate";
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
let rule = new schedule.RecurrenceRule();
let rule2 = new schedule.RecurrenceRule();
rule2.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
rule2.hour = 8;
rule2.minute = 0;
rule2.second = 0;
rule2.tz = "Asia/Vientiane";
rule.second = 0; // Thực hiện vào giây đầu tiên của mỗi phút
rule.minute = new schedule.Range(0, 59, 1); // Cứ 1 phút một lần

let sendmail = async (mailTemplate, userMail) => {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_APP,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  var mailOptions = {
    from: process.env.EMAIL_APP,
    to: userMail,
    subject: "Job suggestion email",
    html: mailTemplate,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    }
  });
};

let getTemplateMail = async (infoUser) => {
  try {
    const timeStampOfTenDaysAgo = 10 * 24 * 60 * 60 * 1000;
    const currentDateString = new Date(
      Date.now() - timeStampOfTenDaysAgo
    ).toISOString();
    let listpost = await db.Post.findAll({
      limit: 5,
      where: {
        timeEnd: {
          [Op.gt]: currentDateString,
        },
        statusCode: "APPROVED",
        [Op.and]: [
          db.Sequelize.where(
            db.sequelize.col("postDetailData.jobTypePostData.code"),
            {
              [Op.like]: `${infoUser.categoryJobCode}%`,
            }
          ),
          db.Sequelize.where(
            db.sequelize.col("postDetailData.provincePostData.code"),
            {
              [Op.like]: `${infoUser.addressCode}%`,
            }
          ),
        ],
      },
      include: [
        {
          model: db.DetailPost,
          as: "postDetailData",
          attributes: {
            exclude: ["statusCode"],
          },
          include: [
            {
              model: db.Allcode,
              as: "jobTypePostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "workTypePostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "salaryTypePostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "jobLevelPostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "genderPostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "provincePostData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "expTypePostData",
              attributes: ["value", "code"],
            },
          ],
        },
      ],
      order: db.sequelize.literal("rand()"),
      raw: true,
      nest: true,
    });
    if (listpost.length < 5) {
      const remainingSlots = 5 - listpost.length;
      let categoryPosts = await db.Post.findAll({
        limit: remainingSlots,
        where: {
          timeEnd: {
            [Op.gt]: currentDateString,
          },
          statusCode: "APPROVED",
          [Op.or]: [
            db.Sequelize.where(
              db.sequelize.col("postDetailData.jobTypePostData.code"),
              {
                [Op.like]: `${infoUser.categoryJobCode}%`,
              }
            ),
            db.Sequelize.where(
              db.sequelize.col("postDetailData.provincePostData.code"),
              {
                [Op.like]: `${infoUser.addressCode}%`,
              }
            ),
          ],
        },
        include: [
          {
            model: db.DetailPost,
            as: "postDetailData",
            attributes: {
              exclude: ["statusCode"],
            },
            include: [
              {
                model: db.Allcode,
                as: "jobTypePostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "workTypePostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "salaryTypePostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "jobLevelPostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "genderPostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "provincePostData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "expTypePostData",
                attributes: ["value", "code"],
              },
            ],
          },
        ],
        order: db.sequelize.literal("rand()"),
        raw: true,
        nest: true,
      });
      listpost = [...listpost, ...categoryPosts];
    }
    if (listpost && listpost.length > 0) {
      for (let post of listpost) {
        let user = await db.User.findOne({
          where: { id: post.userId },
          attributes: {
            exclude: ["userId"],
          },
        });
        let company = await db.Company.findOne({
          where: { id: user.companyId },
        });
        post.companyData = company;
      }

      return getStringMailTemplate(listpost, infoUser);
    } else {
      return 0;
    }
  } catch (error) {
    console.log(error);
    return 0;
  }
};

const sendJobMail = () => {
  schedule.scheduleJob(rule2, async function () {
    try {
      let listUserGetMail = await db.UserDetail.findAll({
        where: {
          isTakeMail: 1,
        },
        include: [
          {
            model: db.User,
            as: "UserDetailData",
            attributes: ["id", "firstName", "lastName", "image", "email"],
          },
        ],
        raw: true,
        nest: true,
      });
      //console.log("listUserGetMail", listUserGetMail);
      for (let user of listUserGetMail) {
        let mailTemplate = await getTemplateMail(user);

        if (mailTemplate !== 0) {
          sendmail(mailTemplate, user.UserDetailData.email);
          let notification = await db.Notification.create({
            content: `You have received a job suggestion email. Please check your email for more details`,
            userId: user.UserDetailData.id,
          });
          if (notification) {
            let userSocketId = user.UserDetailData.id.toString();
            console.log("userSocket", userSocketId);
            global.ioGlobal.to(userSocketId).emit("ReceivedMail", {
              message: notification.content,
            });
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
    console.log("đã gửi");
  });
};
const checkReportPost = () => {
  schedule.scheduleJob(rule, async function () {
    try {
      // Fetch posts with 10 or more unchecked reports
      const reports = await db.Report.findAll({
        attributes: [
          "postId",
          [db.Sequelize.fn("COUNT", "postId"), "reportCount"],
        ],
        where: { isChecked: 0 },
        group: ["postId"],
        having: db.Sequelize.literal("reportCount >= 10"),
        raw: true,
      });

      if (reports.length > 0 || !reports) {
        // Process all reported posts concurrently
        await Promise.all(
          reports.map(async (report) => {
            try {
              // Find the post and update its status
              const post = await db.Post.findOne({
                where: { id: report.postId },
                raw: false,
              });

              if (!post) return;

              post.statusCode = "BANNED";
              await post.save();

              console.log(`Post ID ${report.postId} has been banned.`);

              // Fetch detailed post information
              const detailPost = await db.DetailPost.findOne({
                where: { id: post.detailPostId },
                raw: false,
              });

              // Create a notification for the user
              const notification = await db.Notification.create({
                content: `Your post "${detailPost?.name}" has been hidden due to multiple reports. Please wait for the administrator to review.`,
                userId: post.userId,
              });

              if (notification) {
                const userSocketId = post.userId.toString();
                if (global.ioGlobal.sockets.adapter.rooms.has(userSocketId)) {
                  global.ioGlobal.to(userSocketId).emit("autoBanPost", {
                    message: notification.content,
                  });
                }
              }

              // Mark reports as checked
              await db.Report.update(
                { isChecked: 1 },
                { where: { postId: report.postId, isChecked: 0 } }
              );
            } catch (error) {
              console.error(
                `Error processing post ID ${report.postId}:`,
                error
              );
            }
          })
        );
      } else {
        console.log("No posts with 10 or more unchecked reports found.");
      }
    } catch (error) {
      console.error("Error in checkReportPost function:", error);
    }
    console.log("Report check job completed.");
  });
};

module.exports = {
  sendJobMail,
  checkReportPost,
};
