import postService from "../services/postService";

let getAllPost = async (req, res) => {
  try {
    let data = await postService.getAllPost(req.query);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from server",
    });
  }
};
module.exports = {
  getAllPost: getAllPost,
};