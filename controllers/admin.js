import User from "../models/user";


export const admin = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select("-password").exec();
    // console.log("CURRENT INSTRUCTOR => ", user);
    if (!user.role.includes("admin")) {
      return res.sendStatus(403);
    } else {
      res.json({ ok: true });
    }
  } catch (err) {
    console.log(err);
  }
};
