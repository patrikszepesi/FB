import expressJwt from "express-jwt";
import User from "../models/user";
import Item from "../models/item";

export const requireSignin = expressJwt({
  getToken: (req, res) => req.cookies.token,
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

export const isInstructor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).exec();
    if (!user.role.includes("Instructor")) {
      return res.sendStatus(403);
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};

export const isEnrolled = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).exec();
    const item = await Item.findOne({ slug: req.params.slug }).exec();

    // check if item id is found in user items array
    let ids = [];
    for (let i = 0; i < user.items.length; i++) {
      ids.push(user.items[i].toString());
    }

    if (!ids.includes(item._id.toString())) {
      res.sendStatus(403);
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};
