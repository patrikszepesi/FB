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
  publishItem,
  unpublishItem,
  items,
  checkEnrollment,
  paidEnrollment,
  stripeSuccess,
  userItems,
  search,
  invoice,
  getUser,
  comments,
  getComments,
  commentAnswers,
  sold,
  ownerGetData,
  loadInvoices,
  completedInvoice,
  loadAllInvoices
} from "../controllers/item";



router.get("/courses", items);
// image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// course
router.get("/course-owner/:slug", requireSignin,ownerGetData);
router.post("/course", requireSignin, isInstructor, create);
router.put("/course/:slug", requireSignin, update);
router.get("/course/:slug", read);



router.put("/course/publish/:itemId", requireSignin, publishItem);
router.put("/course/unpublish/:itemId", requireSignin, unpublishItem);

router.put("/invoice-completed", requireSignin, completedInvoice);



router.get("/check-enrollment/:itemId", requireSignin, checkEnrollment);
router.get("/course/invoice/:userId", requireSignin, invoice);

router.post("/paid-enrollment/:itemId", requireSignin, paidEnrollment);
router.get("/user/:userId", requireSignin, getUser);

router.get("/stripe-success/:itemId", requireSignin, stripeSuccess);

router.post("/wishlist/:itemId", requireSignin, addToWishlist);
router.get("/wishlist", requireSignin, readWishlist);
router.put("/wishlist/:itemId", requireSignin, removeFromWishlist);

router.post("/comments/:itemId", requireSignin, comments);
router.get("/comments/:itemId", getComments);
router.post("/comment/answer/:itemId", requireSignin, commentAnswers);


router.get("/sold", requireSignin, sold);






router.get("/user-courses", requireSignin, userItems);
router.get("/load-invocies", requireSignin, loadInvoices);
router.get("/load-all", requireSignin, loadAllInvoices);



router.get("/user/course/:slug", requireSignin, read);

router.post("/search/filters", search);



module.exports = router;
