import mongoose , {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String, // cloudinary url
        required: true,
    },
    thumbnail: {
        type: String, // cloudinary url
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number, // duration in seconds
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    ispublished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
},
    {
        timestamps: true,
    }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);