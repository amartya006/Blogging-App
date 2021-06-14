var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
    username: String,
    name: String,
    password: String,
    mobile: String,
    email: String
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema);
