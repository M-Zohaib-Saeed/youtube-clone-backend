import {asynchandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asynchandler(async (req, res) => {
    // Your logic for registering a user goes here
    res.status(201).json({ message: "User registered successfully" });
    
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
     console.log("User data:", { username, email, fullName, password });


     if([username, email, fullName, password].some(field => field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
     }

     const existingUser = await User.findOne({ $or: [{ username }, { email }] });

     if (existingUser) {
         throw new ApiError(409, "User with email or username already exists");
         }
     
      const avatarLocalPath = req.files?.avatar[0]?.path;
      const coverImageLocalPath = req.files?.coverimage[0]?.path;

      if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
      }



      const avatarUploadResponse = await uploadToCloudinary(avatarLocalPath);
      const coverImageUploadResponse = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath) : null;

      if(!avatarUploadResponse ) {
        throw new ApiError(500, "Error uploading avatar to Cloudinary");
      }

      const User =  await User.create({
        username,
        email,
        fullName,
        password,
        avatar: avatarUploadResponse.url,
        coverimage: coverImageUploadResponse?.url || null,
      });


     const createdUser = await User.findById(User._id).select("-password -refreshToken");


     if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
     }


     return res.status(201).json(
        new ApiResponse(201, "User registered successfully", createdUser)
     )

}); 


export { registerUser }; 