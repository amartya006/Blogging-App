require('dotenv').config();
const express = require('express');
const app= express();
const server = require('http').Server(app);
const mongoose= require("mongoose");
const passport= require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const expressSession = require("express-session");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const User = require("./models/user"); 
const Blog = require("./models/blogs"); 

// Using Multer and Cloudinary
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'amartya', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(methodOverride("_method"))

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

mongoose.connect(process.env.DATABASE_URL);

app.use(bodyParser.urlencoded({extended: true}));
app.use(require("express-session")({
    secret: "Hello Peeps",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Accessing Variables

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    
    next();
});


app.get("/", (req,res)=>{
    Blog.find({}, (err, blog)=>{
        if(err){
            console.log(err);
        } else {
            console.log(blog);
            res.render('home', {blog: blog});
        }
    } )
    
})

app.get("/signup", (req,res) =>{
    res.render("signup");
})

app.post("/signup", (req,res) =>{
    User.register(new User({username: req.body.username, name: req.body.name, mobile: req.body.mobile, email: req.body.email}), req.body.password ,(err,user)=>{
        if(err){
            console.log(err);
            res.render("signup")
        } else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/");
            })
        }
    })
})

app.get("/login", (req,res) =>{
    res.render("login");
})

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
}) , function(req, res){
    
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

app.get("/add_blog", isLoggedIn,  (req, res) => {
    res.render("add");
})

app.post("/add_blog", isLoggedIn, upload.single('image'), (req, res) =>{
    cloudinary.uploader.upload(req.file.path, function(result){
        var title = req.body.title;
        var url = result.secure_url;
        var imageId = result.public_id;
        var blog = req.body.blog;
        var author = {
            id: req.user._id,
            username: req.user.username,
            name: req.user.name,
            mobile: req.user.mobile,
            email: req.user.email
        }
        var newBlog = {title: title, blog: blog, author: author, url: url, imageId:imageId};
        Blog.create(newBlog, (err, blog) => {
            if(err){
                console.log(err);
            } else{
                console.log(blog)
                res.redirect("/");
            }
        })
    })
    
})

app.get("/show_blog/:id", (req, res)=>{
    var id= req.params.id;
    Blog.findById(id, (err, blogData)=>{
        if(err || !blogData){
            console.log(err);
            res.redirect("/");
        } else{
            console.log(blogData);
            res.render("show", {blogData: blogData});
        }
    })
})

app.get("/show_blog/:id/edit",checkAuthorisation, (req,res)=> {
    var id= req.params.id;
    Blog.findById(id, (err,blogFound) =>{
        if(err || !blogFound){
            console.log(err);
            res.redirect("/");
        } else{
            res.render("edit", {blogFound: blogFound});
        }
    })

})

app.put("/show_blog/:id",checkAuthorisation, upload.single('image'), (req,res) =>{
    
    Blog.findById(req.params.id, async (err, blogFound)=>{
        if(err){
            console.log(err);
            res.redirect("back");
        } else{
            if(req.file){
                try{
                    await cloudinary.v2.uploader.destroy(blogFound.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    blogFound.imageId= result.public_id;
                    blogFound.url = result.secure_url;
                } catch(err){
                    console.log(err);
                    return res.redirect("back");
                }
            }
             blogFound.title = req.body.title;
             blogFound.blog = req.body.blog;
             blogFound.save();
            
            res.redirect("/show_blog/" + blogFound._id);
        }
    })
})

app.delete("/show_blogs/:id",checkAuthorisation, (req,res)=>{
    Blog.findById(req.params.id, async (err, blogFound)=>{
        if(err){
            console.log(err);
            return res.redirect("back");
        }
        try{
            await cloudinary.v2.uploader.destroy(blogFound.imageId);
            blogFound.remove();
            res.redirect("/");
        } catch(err){
            
            console.log(err);
            return res.redirect("back");
            
            
        }
    })
})

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } 
    res.redirect("/login");
}

function checkAuthorisation(req, res, next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id, (err, blogFound)=>{
            if(err){
                console.log(err);
                res.redirect("back");
            } else{
                console.log(blogFound.author);
                if(blogFound.author.id.equals(req.user._id)){
                    next();
                } else {
                    res.redirect("back");
                }
            }
        })
    } else {
        res.redirect("back");
    }
}

server.listen(process.env.PORT || 3030, ()=> {
    console.log("Server Started at Port 3030");
})