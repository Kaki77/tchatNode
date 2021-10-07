const express = require('express');
var siofu = require("socketio-file-upload");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { callback } = require('util');
const io = new Server(server);
const colors = require('colors');
var mongo=require("mongodb").MongoClient;
var ObjectID=require("mongodb").ObjectId;
const bcrypt=require('bcrypt');
const saltRounds=10;
var moment = require('moment');
app.use('/public',express.static('public'));
var session = require("express-session")({
    secret: "my-secret",
    cookie :
    {
        maxAge : 3600000,
    },
    resave: true,
    saveUninitialized: true
});
var flash = require('express-flash');
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
function escape(string)
{
    var newString="";
    for(i=0;i<string.length;i++)
    {
        if(string[i]=="\\")
        {
            newString+="/";
        }
        else
        {
            newString+=string[i];  
        }
    }
    return newString;
};
const handlebars = require('express-handlebars');
app.engine('handlebars', handlebars({
    defaultLayout: 'base'
}));
app.set('view engine', 'handlebars')
app.use(express.json())
app.use(express.urlencoded({ 
    extended: false 
    }));
app.use(flash());
app.use(session);
app.use(siofu.router).listen(8000);
const {Session} = require("./Users");
const { rawListeners } = require('process');

sessionList=new Session();

app.get('/', (req, res) => {
    if(req.session.username)
    {
        req.flash('username',sessionList.getUserById(req.session.userID).username);
        req.flash('userID',sessionList.getUserById(req.session.userID).userID);
        req.flash('avatar',sessionList.getUserById(req.session.userID).avatar);
        res.redirect("/tchat");
    }
    else
    {
        res.render("index",{expressFlash:req.flash('error')});
    }
});

app.get('/register',(req,res)=>{
    if(req.session.username)
    {
        req.flash('username',sessionList.getUserById(req.session.userID).username);
        req.flash('userID',sessionList.getUserById(req.session.userID).userID);
        req.flash('avatar',sessionList.getUserById(req.session.userID).avatar);
        res.redirect("/tchat");
    }
    else
    {
        res.render("register",{expressFlash:req.flash('error')});
    }
})

app.get('/tchat',(req,res)=>{
    if(!req.session.username)
    {
        res.redirect("/");
    }
    else
    {
        res.render("chat",{flashUsername:req.flash('username'),flashId:req.flash('userID'),flashAvatar:req.flash('avatar')});
    }
})

app.get("/*",(req,res)=>{
    if(req.session.username)
    {
        req.flash('username',sessionList.getUserById(req.session.userID).username);
        req.flash('userID',sessionList.getUserById(req.session.userID).userID);
        req.flash('avatar',sessionList.getUserById(req.session.userID).avatar);
        res.redirect('/tchat');
    }
    else
    {
        res.redirect("/");
    }
});

app.post('/register',(req,res)=>{
    console.log("post ok");
    var username=req.body.username;
    var password=req.body.password;
    mongo.connect("mongodb://localhost/tchat",function(error,database)
    {
        if(error) return funcCallback(error);
        const db=database.db("tchat");
        db.collection("user").findOne({"username":username},function(error,results)
        {
            if(results)
            {
                req.flash('error',"Nom d'utilisateur déjà utilisé");
                res.redirect("/register");
            }
            else
            {
                bcrypt.hash(password,saltRounds,(err,hash)=>{
                    db.collection("user").insertOne({username:username,password:hash,avatar:"/public/avatar.jpg",lastTimeOnline:new Date()});
                });
                res.redirect("/");
                return;
            }
        })
    })
})

app.post("/",(req,res)=>{
    var user=req.body.username;
    var password=req.body.password;
    mongo.connect("mongodb://localhost/tchat",function(error,database)
    {
        if(error) return funcCallback(error);
        console.log("Connecté à la base Tchat");
        const db=database.db("tchat");
        db.collection("user").findOne({"username":user},function(error,results)
        {
            if(results)
            {
                bcrypt.compare(password,results.password,function(error,response)
                {
                    if(response)
                    {
                        req.session.username=results.username;
                        req.session.userID=results._id;
                        req.session.avatar=results.avatar;
                        req.flash('username',req.session.username);
                        req.flash('userID',req.session.userID);
                        req.flash('avatar',req.session.avatar);
                        res.redirect('/tchat');
                    }
                    else
                    {
                        req.flash('error','Mauvais mot de passe');
                        res.redirect('/');
                    }
                });
            }
            else
            {
                req.flash('error','Compte Inexistant');
                res.redirect('/');
            }  
        })    
    })
});



io.on('connection', (socket) => {
    socket.on('join',(username,userID,avatar)=>
    {
        const sessionID=socket.handshake.auth.sessionID;
        if(sessionID)
        {
            const session=sessionList.findSession(sessionID);
            if(session)
            {
                socket.sessionID = sessionID;
                socket.userID = session.userID;
                socket.username = session.username;
                socket.avatar=session.avatar;
            }
        }
        else
        {
            socket.sessionID=randomId();
            socket.userID=userID;
            socket.username=username;
            socket.avatar=avatar;
        }
        sessionList.saveSession(socket.sessionID,socket.userID,socket.username,socket.avatar,true);
        console.log(colors.brightBlue('%s is connected'),socket.username);
        console.log(sessionList.findSession(socket.sessionID));
        mongo.connect("mongodb://localhost/tchat",function(error,database)
        {
            if(error) return funcCallback(error);
            console.log("Connecté à la base Tchat".green);
            const db=database.db("tchat");
            db.collection("user").updateOne({"_id":ObjectID(socket.userID)},{$currentDate:{"lastTimeOnline":true}});
        });
        console.log("Requête update lastTimeOnline effectué".green);
        socket.join(socket.userID);
        var uploader = new siofu();
        uploader.dir = "./public/uploads";
        uploader.on("saved",(event)=>
        { 
            mongo.connect("mongodb://localhost/tchat",function(error,database)
            {
                var pathName=escape(event.file.pathName);
                if(error) return funcCallback(error);
                console.log("Connecté à la base Tchat".green);
                const db=database.db("tchat");
                db.collection("user").updateOne({"_id":ObjectID(socket.userID)},{$set:{"avatar":pathName}})
                console.log("Requête change avatar effectué".green);
                socket.avatar=pathName;
                sessionList.saveSession(socket.sessionID,socket.userID,socket.username,pathName,true);
                socket.emit("change avatar",pathName); 
            });
        });
        uploader.listen(socket);
        socket.emit('session',socket.username,socket.sessionID,socket.userID,socket.avatar);
    });
    socket.on('disconnect', () => {
        mongo.connect("mongodb://localhost/tchat",function(error,database)
        {
            if(error) return funcCallback(error);
            console.log("Connecté à la base Tchat".green);
            const db=database.db("tchat");
            db.collection("user").updateOne({"_id":ObjectID(socket.userID)},{$currentDate:{"lastTimeOnline":true}});
        });
        console.log("Requête update lastTimeOnline effectué".green);
        console.log(colors.yellow('%s disconnected'),socket.username);
        sessionList.saveSession(socket.sessionID,socket.userID,socket.username,socket.avatar,false);

    });
    socket.on('chat message', (to,msg) => {
        console.log(colors.magenta('user %s has sent message : %s'),socket.username,msg);
        mongo.connect("mongodb://localhost/tchat",function(error,database)
        {
            if(error) return funcCallback(error);
            console.log("Connecté à la base Tchat".green);
            const db=database.db("tchat");
            db.collection('messages').insertOne({content:msg,from:socket.username,to:sessionList.getUserById(to).username,date:new Date()});
        });
        console.log("Requête add message effectué".green);
        socket.to(to).emit("chat message",socket.username,socket.userID,msg);
    });
    socket.on('isTyping',(to,bool)=>
    {
        socket.to(to).emit("isTyping",sessionList.findSession(socket.sessionID),bool);
    });
    socket.on('get list',()=>
    {
        socket.emit('get list',sessionList.findAllSession());
    });
    socket.on("messages list",(to)=>
    {
        mongo.connect("mongodb://localhost/tchat",function(error,database)
        {
            if(error) return funcCallback(error);
            console.log("Connecté à la base Tchat".green);
            const db=database.db("tchat");
            db.collection("messages").find({$or:[{"from":socket.username,"to":sessionList.getUserById(to).username},{"from":sessionList.getUserById(to).username,"to":socket.username}]}).sort({date:1}).toArray(function(error,results)
            {
                if(error) return funcCallcack(error);
                console.log("Requête all messages effectué".green);
                socket.emit('messages list',sessionList.getUserById(to),results);
            })
        });
    });
}); 


server.listen(3000, () => {
  console.log('listening on *:3000');
});