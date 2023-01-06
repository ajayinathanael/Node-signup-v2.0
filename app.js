
require('dotenv').config();
const express=require("express");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const bodyParser=require("body-parser");
const _ = require("lodash");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate')
const GoogleStrategy = require('passport-google-oauth20').Strategy;


const app = express();  

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

app.use(session({
  secret: "Happy New Year 2023!",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb+srv://admin:nath@cluster0.7o8eg7x.mongodb.net/project?retryWrites=true", {useNewUrlParser: true});

// Authentication model
const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    occupation: String,
    email: String,
    phonenumber: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//user
const User = new mongoose.model("social_signup", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user,done){
    done(null, user.id);
    });
    
passport.deserializeUser(function(id,done){
     User.findById(id,function(err,user){
    done(err,user);
    })
    })

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4500/auth/google/todo",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },

  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//TODO model
const itemsSchema = {
    name: String 
  };
   
  const Item = mongoose.model("item", itemsSchema);
  
  // const items=["Buy food", "cook food", "eat food"];
  // const workItems=[];
  
  const item1 = new Item ({
    name: "Welcome to your Todo list!."
  });
  const item2 = new Item ({
    name: "Hit the + button to add new item."
  });
  const item3 = new Item ({
    name: "<-- Hit this to delete the document."
  });
  
  const defaultItems = [item1, item2, item3];
  
  const listSchema = {
    name: String,
    items: [itemsSchema]
  }
  
  //todolist
  const List = mongoose.model("List", listSchema);


//ROUTES
app.get("/", (req,res)=>{
    res.render("login");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }
));

app.get("/auth/google/todo", 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect to secrets route.
    res.redirect("/todo");
  });

app.get("/register", (req,res)=>{
    res.render("register");
});
 
// app.get('/logout', function(req, res, next){
//   req.logout(function(err) {
//     if (err) { return next(err); }
//     res.redirect('/');
//   });
// });

app.post("/", (req,res)=>{

    const email=req.body.email;
    const password=req.body.password;

    User.findOne({email: email}, function(err, foundUser){
        if(err){
            // return next(err);
            console.log(err);
        }else{
            if(foundUser){
                // if(foundUser.password === password){
                //     res.render('secrets');
                // }
                bcrypt.compare(password, foundUser.password, function(err,result){
                    if(result === true){
                        // res.render('secrets'); 
                        res.redirect("/todo");
                    }else{
                        // return next(err);
            console.log(err);

                    }
                    }); 
            }
            else{
                res.redirect("/");

            }
        }
    });
});

app.post("/register", (req,res)=>{    

    bcrypt.hash(req.body.password, 10, function(err,hash){
        const newUser = new User({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            occupation: req.body.occupation,
            email:req.body.email,
            phonenumber:req.body.phonenumber,
            password: hash
        });   
        newUser.save((err)=>{
            if(err){
                return next(err);
            }else{
                // res.render('secrets');
                res.redirect('/todo');
            }
        }) 
    })      
});


// TODO ROUTES
app.get("/todo", function(req,res){

    Item.find(function(err, founditems){
       // mongoose.connection.close();
       if(founditems.length === 0){
         Item.insertMany(defaultItems, function(err){
           if(err){
               console.log(err);
             }else{
                 console.log("Successfully saved all defaultItems into DB");
             }
         });
         res.redirect("/todo");
       }
       else{
         res.render("list", {listTitle: "Today", newListItems: founditems});
       }
     });
   //ejs then js i.e listTile, day
   });

app.post("/todo",function(req,res){

    const itemName = req.body.itemName;
    const listName = req.body.list;
  
    const item = new Item ({
        name: itemName
    });
  
  if(listName === "Today"){
    item.save();
    res.redirect("/todo");
  }else{
      List.findOne({name:listName}, function(err, foundList){
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" +listName);
      });
  }
  });
  
  //to delete the items
  app.post("/delete", function(req,res){
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
  
    if(listName === "Today"){
      Item.findByIdAndRemove(checkedItemId,function(err){
        if(!err){
          console.log("Successfully deleted the item");
          res.redirect("/todo");
        }
      });
    }
    else{
      List.findOneAndUpdate({name: listName},{$pull: {items: {_id: checkedItemId}}}, function(err,foundList){
        if(!err){
          res.redirect("/" +listName);
        }
      });
    }  
  });

//routing parameter
// app.get("/:customListName",function(req,res){
//     const customListName = _.capitalize(req.params.customListName);
  
//     List.findOne({name:customListName}, function(err,foundList){
//       if(!err){
//         if(!foundList){
//           //create new list if name isn't in DB
//           const list = new List ({
//             name: customListName,
//             items: defaultItems
//           });
//           list.save();
//           res.redirect("/" +customListName);
//         }
//         else{
//           //existing new lists
//           res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
//         }
//       }
//     });
//   });
  


port = process.env.PORT;
app.listen(port, ()=>{
    console.log(`server started on ${port}`);
});