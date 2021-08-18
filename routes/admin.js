import express from "express";

const router = express.Router();

// middleware
import { requireSignin } from "../middlewares";

// controllers
import {
  admin,

} from "../controllers/admin";

router.get("/admin", requireSignin, admin);

module.exports = router;
