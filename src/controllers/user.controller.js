import {asynchandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {
     registerUser,
     loginUser,
     logoutUser
 }; 