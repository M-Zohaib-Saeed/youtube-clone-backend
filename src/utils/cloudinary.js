import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });


    const uploadToCloudinary = async (filePath) => {
        try {

            if(!filePath ) {
                throw new Error('File path and folder name are required for Cloudinary upload.');
            }
            const respone = await cloudinary.uploader.upload(filePath, {
                resource_type: "auto", // Automatically detect the file type (image, video, etc.)
            });
            //upload successful
            console.log('Upload successful:', respone.url);

            return respone;
        } catch (error) {
            fs.unlinkSync(filePath); // Delete the file from local storage if upload fails
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    };


    export { uploadToCloudinary };