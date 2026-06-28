import {asynchandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);   // this line may cause an error
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        //console.log(error);
        throw new ApiError(500, "Error generating tokens");
    }
};

const registerUser = asynchandler(async (req, res) => {
    // Your logic for registering a user goes here
    //res.status(201).json({ message: "User registered successfully" });
    
     // Register User Algorithm
     // 1. Get user data from req.body
     // 2. Validate required fields
     // 3. Check if user already exists
     // 4. Get avatar and cover image from req.files
     // 5. Upload files to Cloudinary
     // 6. Create user in database
     // 7. Fetch created user (exclude password & refreshToken)
     // 8. Return success response

     const { username, email, fullName, password } = req.body;
     //console.log("User data:", { username, email, fullName, password });


     if([username, email, fullName, password].some(field => field === undefined || field === null || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
     }

     const existingUser = await User.findOne({ $or: [{ username }, { email }] });

     if (existingUser) {
         throw new ApiError(409, "User with email or username already exists");
         }
     
      const avatarLocalPath = req.files?.avatar?.[0]?.path;
      const coverImageLocalPath = req.files?.coverimage?.[0]?.path || "";

      if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
      }



      const avatarUploadResponse = await uploadToCloudinary(avatarLocalPath);
      const coverImageUploadResponse = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath) : null;

      //console.log("Avatar URL:", avatarUploadResponse.secure_url);

      if(!avatarUploadResponse ) {
        throw new ApiError(500, "Error uploading avatar to Cloudinary");
      }

      const user =  await User.create({
        username, 
        email,
        fullName, 
        password,
        avatar: avatarUploadResponse.url,
        coverimage: coverImageUploadResponse?.url || null,
      });


     const createdUser = await User.findById(user._id).select("-password -refreshToken");


     if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
     }


     return res.status(201).json(
        new ApiResponse(201, "User registered successfully", createdUser)
     )

}); 


const loginUser = asynchandler(async (req, res) => {

      // Login User Algorithm

      // 1. Get email/username and password from req.body
      // 2. Validate required fields
      // 3. Find user in database
      // 4. If user not found, throw error
      // 5. Compare entered password with hashed password
      // 6. If password is incorrect, throw error
      // 7. Generate access token
      // 8. Generate refresh token
      // 9. Save refresh token in database
      // 10. Send tokens in cookies (or response)
      // 11. Return logged-in user data (without password)

      const { email , username , password } = req.body;

      if(  !email && !username) {
        throw new ApiError(400, "Email or Username  is required");
      }

      const user = await User.findOne({ $or: [{ email }, { username }] });

        if(!user) {
            throw new ApiError(404, "User not found");
        }
      
        const isPasswordCorrect = await user.isPasswordCorrect(password);

        if(!isPasswordCorrect) {
            throw new ApiError(401, "Invalid password");
        }

         const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
         
         const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

         if(!loggedInUser) {
            throw new ApiError(500, "Something went wrong while logging in the user");
         }

         const options = {
            httpOnly: true,
            secure: true, // Set to true if using HTTPs
         }

         return res.status(200)
         .cookie("refreshToken", refreshToken, options)
         .cookie("accessToken", accessToken, options)
         .json(
            new ApiResponse(200,
                "User logged in successfully",
               { user: loggedInUser, accessToken, refreshToken })
         );

 

});

const logoutUser = asynchandler(async (req, res) => {
    User.findByIdAndUpdate(req.user._id, 
        {$set : { refreshToken: undefined } }
        , { new: true })
    
    const options = {
        httpOnly: true,
        secure: true, // Set to true if using HTTPs
    }
    
    return res.status(200).
    clearCookie("refreshToken", options)
    .clearCookie("accessToken", options).
    json(
        new ApiResponse(200, "User logged out successfully", null)
    );

});

const refreshAccessToken = asynchandler(async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if( !incomingRefreshToken){
        throw new ApiError(404, "Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?.userId)

    if(!user){
        throw new ApiError(401, "Invalid Refresh Token")
    }


    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true, // Set to true if using HTTPs
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
         .cookie("refreshToken", refreshToken, options)
         .cookie("accessToken", accessToken, options)
         .json(
            new ApiResponse(200,
                "accessed token refreshed successfully",
               {  accessToken, refreshToken  })
         );

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalide Access Token")
    }

});

const changePassword = asynchandler(async (req, res) => {
// Change Password Algorithm

// 1. Get oldPassword and newPassword from req.body
// 2. Check if both fields are provided
// 3. Get logged-in user from req.user
// 4. Verify oldPassword using bcrypt/user method
// 5. If old password is incorrect, throw error
// 6. Set user.password = newPassword
// 7. Save user (pre-save middleware will hash password)
// 8. Return success response

const {oldPassword, newPassword} = req.body;

if(!oldPassword || !newPassword){
    throw new ApiError(400, "Both oldPassword and newPassword are required")
}

if (oldPassword === newPassword) {
    throw new ApiError(
        400,
        "New password must be different from old password"
    );
}

const user = await User.findById(req.user?._id);

if (!user) {
    throw new ApiError(404, "User not found");
}

const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

if(!isPasswordCorrect){
    throw new ApiError(400, "Your old password is incorrect")
}

user.password = newPassword;

await user.save();

return res.status(200)
.json(
    new ApiResponse(
        200,
        "Password changed Successfully",
        {passwordChanged: true}
    )
);

});

const getCurrentUser = asynchandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            "Current user fetched successfully",
            req.user
        )
    );
});

const updateAccountDetails = asynchandler(async (req, res) => {

    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            "Account details updated successfully",
            user
        )
    );
});

const updateUserAvatar = asynchandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(500, "error while uploading avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {avatar: avatar.url }
        },
        {new : true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Avatar image is changed successfuuly",
            user
        )
    )
}); 



const updateUserCoverImage = asynchandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(500, "error while uploading cover image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {coverimage: coverImage.url }
        },
        {new : true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Cover image is changed successfuuly",
            user
        )
    )
}); 

export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changePassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage
 }; 