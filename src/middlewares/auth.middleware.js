import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJwt = asynchandler(async (req, _, next) => {
      try {

        // console.log("Cookies:", req.cookies);
        // console.log("Authorization:", req.header("Authorization"));
        const Token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");

        if(!Token){
            throw new ApiError(401, "Unauthorized: No token provided");
        }

       const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET);


        //console.log("Decoded Token:", decodedToken);
        //console.log("Searching user:", decodedToken.userId);

      const user = await User.findById(decodedToken?.userId).select("-password -refreshToken");
       //next();
             
      if(!user){
        throw new ApiError(401, "Invalid access token: User not found");
      }

      req.user = user; // Attach user to request object for downstream use
      next();


      } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized: Invalid or expired token");
      }

});