var mongoose = require("mongoose");


var blogSchema = new mongoose.Schema({
    title: String,
    blog: String,
    url: String,
    imageId: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String,
        name: String,
        mobile: String,
        email: String
    }
});



module.exports = mongoose.model("Blog",blogSchema);
