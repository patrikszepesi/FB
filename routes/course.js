import express from "express";
import formidable from "express-formidable";

const router = express.Router();

// middleware
import { requireSignin, isInstructor, isEnrolled } from "../middlewares";

// controllers
import {
  uploadImage,
  removeImage,
  create,
  read,
  addToWishlist,
  readWishlist,
  removeFromWishlist,
  update,
  publishCourse,
  unpublishCourse,
  courses,
  checkEnrollment,
  paidEnrollment,
  stripeSuccess,
  userCourses,
  listCompleted,
  search,
  invoice,
  getUser,
  comments,
  getComments,
  commentAnswers,
  sold,
  ownerGetData
} from "../controllers/course";



router.get("/courses", courses);
// image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// course
router.get("/course-owner/:slug", requireSignin,ownerGetData);
router.post("/course", requireSignin, isInstructor, create);
router.put("/course/:slug", requireSignin, update);
router.get("/course/:slug", read);



router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);


router.get("/check-enrollment/:courseId", requireSignin, checkEnrollment);
router.get("/course/invoice/:userId", requireSignin, invoice);

router.post("/paid-enrollment/:itemId", requireSignin, paidEnrollment);
router.get("/user/:userId", requireSignin, getUser);

router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);

router.post("/wishlist/:itemId", requireSignin, addToWishlist);
router.get("/wishlist", requireSignin, readWishlist);
router.put("/wishlist/:itemId", requireSignin, removeFromWishlist);

router.post("/comments/:itemId", requireSignin, comments);
router.get("/comments/:itemId", getComments);
router.post("/comment/answer/:itemId", requireSignin, commentAnswers);


router.get("/sold", requireSignin, sold);






router.get("/user-courses", requireSignin, userCourses);
router.get("/user/course/:slug", requireSignin, read);

// mark completed
router.post("/list-completed", requireSignin, listCompleted);
router.post("/search/filters", search);



module.exports = router;
