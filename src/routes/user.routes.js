import { Router } from "express";
import { registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changePassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage, 
        getUserChannelProfile,
        getWatchHistory } from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverimage", maxCount: 1 }]),
        registerUser);



router.route("/login").post(loginUser);

// secured Routes

router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJwt, changePassword);

router.route("/get-current-user-details").get(verifyJwt, getCurrentUser);

router.route("/update-current-user-details").post(verifyJwt, updateAccountDetails);

router.route("/update-cover-image").patch(
    verifyJwt,
    upload.single("coverimage"),
    updateUserCoverImage
);

router.route("/update-avatar-image").patch(
    verifyJwt,
    upload.single("avatar"),
    updateUserAvatar
);

router.route("/channel-profile/:username").get(verifyJwt, getUserChannelProfile);

router.route("/watch-history").get(verifyJwt, getWatchHistory);


export default router; 