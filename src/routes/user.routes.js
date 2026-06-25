import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);


// router.route("/").get((req, res) => {
//     res.send("Hello World");
// });

export default router; 